import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db';   // ← pool compartido, no duplicado
import { createHmac } from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // ── Verificar firma Bold ──────────────────────────────────────────────────
  const signature = req.headers['x-bold-signature'] as string | undefined;
  const rawBody   = JSON.stringify(req.body);
  const expected  = createHmac('sha256', process.env.BOLD_SECRET_KEY || '')
    .update(rawBody)
    .digest('hex');

  if (!signature || signature !== expected) {
    console.warn('[webhook-bold] firma inválida');
    return res.status(401).json({ error: 'Firma inválida' });
  }

  const { order_id, status, transaction_id } = req.body;
  if (!order_id) return res.status(400).json({ error: 'order_id requerido' });

  const newStatus =
    status === 'APPROVED' ? 'paid'
    : status === 'REJECTED' || status === 'FAILED' ? 'cancelled'
    : 'pending';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE orders SET status = ?, payment_id = ?, updated_at = NOW() WHERE id = ?`,
      [newStatus, transaction_id || null, order_id]
    );

    // Si el pago fue aprobado, consolidar cupos vendidos
    if (newStatus === 'paid') {
      const [items]: any = await conn.query(
        'SELECT ticket_type_id, quantity FROM order_items WHERE order_id = ?',
        [order_id]
      );
      for (const item of items) {
        await conn.query(
          `UPDATE ticket_types
           SET sold_qty     = sold_qty     + ?,
               reserved_qty = reserved_qty - ?
           WHERE id = ?`,
          [item.quantity, item.quantity, item.ticket_type_id]
        );
      }
    }

    // Si fue rechazado, liberar cupos reservados
    if (newStatus === 'cancelled') {
      const [items]: any = await conn.query(
        'SELECT ticket_type_id, quantity FROM order_items WHERE order_id = ?',
        [order_id]
      );
      for (const item of items) {
        await conn.query(
          `UPDATE ticket_types
           SET reserved_qty = reserved_qty - ?
           WHERE id = ?`,
          [item.quantity, item.ticket_type_id]
        );
      }
    }

    await conn.commit();
    console.log(`[webhook-bold] Order ${order_id} → ${newStatus}`);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    await conn.rollback();
    console.error('[webhook-bold]', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}
