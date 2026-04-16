/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { createHmac } from 'crypto';

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASS,
  database:           process.env.DB_NAME,
  port:               Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit:    5,
  ssl:                { rejectUnauthorized: false },
});

/**
 * Bold firma el webhook con HMAC-SHA256 sobre el raw body string.
 * Vercel parsea req.body automaticamente, asi que re-serializamos
 * y comparamos. Si Bold usa un secret separado configurarlo en
 * BOLD_WEBHOOK_SECRET; si no, cae a BOLD_API_KEY.
 */
function verifySignature(req: VercelRequest, rawBody: string): boolean {
  const signature = req.headers['x-bold-signature'] as string | undefined;
  // Si Bold no envia firma (sandbox / pruebas), dejamos pasar con warning
  if (!signature) {
    console.warn('[webhook-bold] sin header x-bold-signature — aceptando (modo test)');
    return true;
  }
  const secret = process.env.BOLD_WEBHOOK_SECRET || process.env.BOLD_API_KEY || '';
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return signature === expected;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // Re-serializar para verificar firma sobre raw body
  const rawBody = JSON.stringify(req.body);

  if (!verifySignature(req, rawBody)) {
    console.warn('[webhook-bold] firma inválida');
    return res.status(401).json({ error: 'Firma inválida' });
  }

  const payload = req.body as Record<string, any>;
  console.log('[webhook-bold] payload:', JSON.stringify(payload).substring(0, 600));

  // Bold envía distintos shapes según el evento; normalizamos
  const orderRef     = payload.order_id      // lo que enviamos como reference
                    ?? payload.reference
                    ?? payload.metadata?.order_ref
                    ?? null;

  const boldStatus   = payload.status
                    ?? payload.payment_status
                    ?? payload.transaction_status
                    ?? '';

  const transactionId = payload.transaction_id
                     ?? payload.id
                     ?? null;

  if (!orderRef) {
    console.warn('[webhook-bold] sin order_ref en payload');
    return res.status(400).json({ error: 'order_ref requerido' });
  }

  const newStatus =
    boldStatus === 'APPROVED'                          ? 'paid'
    : ['REJECTED', 'FAILED', 'CANCELLED'].includes(boldStatus) ? 'cancelled'
    : 'pending';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Buscar por order_ref (string AIRA-XXXXX) o por id numérico
    const isNumeric = /^\d+$/.test(String(orderRef));
    const [[order]]: any = await conn.query(
      isNumeric
        ? 'SELECT id, status FROM orders WHERE id = ?'
        : 'SELECT id, status FROM orders WHERE order_ref = ?',
      [orderRef]
    );

    if (!order) {
      console.warn('[webhook-bold] orden no encontrada:', orderRef);
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const orderId = order.id;

    // Actualizar status base (columnas que siempre existen)
    await conn.query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, orderId]
    );

    // Columnas opcionales — las guardamos solo si existen (no fallan el flujo)
    if (transactionId) {
      try {
        await conn.query('UPDATE orders SET bold_payment_id = ? WHERE id = ?', [transactionId, orderId]);
      } catch { /* columna puede no existir aún */ }
    }
    if (newStatus === 'paid') {
      try {
        await conn.query('UPDATE orders SET paid_at = NOW() WHERE id = ?', [orderId]);
      } catch { /* columna puede no existir aún */ }
    }

    // Si el pago fue aprobado: mover reserved_qty → sold_qty
    if (newStatus === 'paid') {
      const [items]: any = await conn.query(
        'SELECT ticket_type_id, quantity FROM order_items WHERE order_id = ?', [orderId]
      );
      for (const item of items) {
        await conn.query(
          `UPDATE ticket_types
             SET sold_qty     = sold_qty     + ?,
                 reserved_qty = GREATEST(0, reserved_qty - ?)
           WHERE id = ?`,
          [item.quantity, item.quantity, item.ticket_type_id]
        );
      }
    }

    // Si fue cancelado/rechazado: liberar reservas
    if (newStatus === 'cancelled') {
      const [items]: any = await conn.query(
        'SELECT ticket_type_id, quantity FROM order_items WHERE order_id = ?', [orderId]
      );
      for (const item of items) {
        await conn.query(
          `UPDATE ticket_types
             SET reserved_qty = GREATEST(0, reserved_qty - ?)
           WHERE id = ?`,
          [item.quantity, item.ticket_type_id]
        );
      }
    }

    await conn.commit();
    console.log(`[webhook-bold] orden ${orderId} → ${newStatus}`);
    return res.status(200).json({ ok: true, orderId, status: newStatus });

  } catch (err: any) {
    await conn.rollback();
    console.error('[webhook-bold]', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}
