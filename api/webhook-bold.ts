/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { createHmac } from 'crypto';
import { generateQRToken } from './lib/generate-ticket.js';
import { sendTicketWhatsApp, sendReservaWhatsApp } from './lib/send-whatsapp.js';

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

function verifySignature(req: VercelRequest, rawBody: string): boolean {
  const signature = req.headers['x-bold-signature'] as string | undefined;
  if (!signature) {
    console.warn('[webhook-bold] sin header x-bold-signature — aceptando (modo test)');
    return true;
  }
  const secret   = process.env.BOLD_WEBHOOK_SECRET || process.env.BOLD_API_KEY || '';
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return signature === expected;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = JSON.stringify(req.body);
  if (!verifySignature(req, rawBody)) {
    console.warn('[webhook-bold] firma inválida');
    return res.status(401).json({ error: 'Firma inválida' });
  }

  const payload = req.body as Record<string, any>;
  console.log('[webhook-bold] payload:', JSON.stringify(payload).substring(0, 600));

  const orderRef = payload.order_id ?? payload.reference ?? payload.metadata?.order_ref ?? null;
  const boldStatus = payload.status ?? payload.payment_status ?? payload.transaction_status ?? '';
  const transactionId = payload.transaction_id ?? payload.id ?? null;

  if (!orderRef) {
    console.warn('[webhook-bold] sin order_ref en payload');
    return res.status(400).json({ error: 'order_ref requerido' });
  }

  const newStatus =
    boldStatus === 'APPROVED' ? 'paid'
    : ['REJECTED', 'FAILED', 'CANCELLED'].includes(boldStatus) ? 'cancelled'
    : 'pending';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const isNumeric = /^\d+$/.test(String(orderRef));
    const [[order]]: any = await conn.query(
      isNumeric
        ? 'SELECT id, status, payment_mode, qr_token FROM orders WHERE id = ?'
        : 'SELECT id, status, payment_mode, qr_token FROM orders WHERE order_ref = ?',
      [orderRef]
    );

    if (!order) {
      console.warn('[webhook-bold] orden no encontrada:', orderRef);
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const orderId      = order.id;
    const isAbono      = order.payment_mode === 'abono';
    const alreadyPaid  = order.status === 'paid';

    await conn.query('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, orderId]);
    if (transactionId) {
      try { await conn.query('UPDATE orders SET bold_payment_id = ? WHERE id = ?', [transactionId, orderId]); } catch { /* ok */ }
    }

    // ── PAGO COMPLETO APROBADO ─────────────────────────────────────────────────
    if (newStatus === 'paid') {
      try { await conn.query('UPDATE orders SET paid_at = NOW() WHERE id = ?', [orderId]); } catch { /* ok */ }

      // Mover reserved → sold
      const [items]: any = await conn.query('SELECT ticket_type_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of items) {
        await conn.query(
          `UPDATE ticket_types SET sold_qty = sold_qty + ?, reserved_qty = GREATEST(0, reserved_qty - ?) WHERE id = ?`,
          [item.quantity, item.quantity, item.ticket_type_id]
        );
      }

      // Generar QR si aún no tiene (pago completo o última cuota)
      if (!alreadyPaid && !order.qr_token) {
        const qrToken = generateQRToken(String(orderRef));
        try { await conn.query('UPDATE orders SET qr_token = ? WHERE id = ?', [qrToken, orderId]); } catch { /* ok */ }

        // Obtener datos para el WA
        const [[fullOrder]]: any = await conn.query(
          `SELECT o.order_ref, o.total, o.add_pass_vip, u.name, u.phone
           FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`,
          [orderId]
        );
        if (fullOrder) {
          const [[ticketInfo]]: any = await conn.query(
            `SELECT tt.name as ticket_name FROM order_items oi
             JOIN ticket_types tt ON tt.id = oi.ticket_type_id WHERE oi.order_id = ? LIMIT 1`,
            [orderId]
          ).catch(() => [[null]]);

          const eventLabel = ticketInfo?.ticket_name ?? 'AIRA Experience';

          await sendTicketWhatsApp({
            phone:      fullOrder.phone,
            name:       fullOrder.name,
            orderRef:   fullOrder.order_ref,
            eventLabel,
            qrToken,
          });
          console.log(`[webhook-bold] ✅ QR generado y enviado a ${fullOrder.phone} — ${fullOrder.order_ref}`);
        }
      }
    }

    // ── CUOTA PAGADA (modo abono) ──────────────────────────────────────────────
    if (isAbono && newStatus === 'paid') {
      // Marcar la cuota más próxima sin pagar como pagada
      await conn.query(
        `UPDATE abono_payments SET paid_at = NOW()
         WHERE order_id = ? AND paid_at IS NULL ORDER BY cuota_number LIMIT 1`,
        [orderId]
      );

      // Verificar si es la última cuota — si no, enviar comprobante de reserva
      const [[pendientes]]: any = await conn.query(
        'SELECT COUNT(*) as cnt FROM abono_payments WHERE order_id = ? AND paid_at IS NULL',
        [orderId]
      );
      const [[pagadas]]: any = await conn.query(
        'SELECT COUNT(*) as cnt FROM abono_payments WHERE order_id = ? AND paid_at IS NOT NULL',
        [orderId]
      );
      const [[totalCuotas]]: any = await conn.query(
        'SELECT COUNT(*) as cnt FROM abono_payments WHERE order_id = ?',
        [orderId]
      );
      const [[proxima]]: any = await conn.query(
        'SELECT due_date, amount FROM abono_payments WHERE order_id = ? AND paid_at IS NULL ORDER BY cuota_number LIMIT 1',
        [orderId]
      );

      if (pendientes?.cnt > 0) {
        // Aún hay cuotas pendientes → comprobante de reserva
        const [[fullOrder]]: any = await conn.query(
          `SELECT o.order_ref, o.total, u.name, u.phone
           FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`,
          [orderId]
        );
        const [[ticketInfo]]: any = await conn.query(
          `SELECT tt.name as ticket_name FROM order_items oi
           JOIN ticket_types tt ON tt.id = oi.ticket_type_id WHERE oi.order_id = ? LIMIT 1`,
          [orderId]
        ).catch(() => [[null]]);

        if (fullOrder) {
          const cuotaAmt    = Number(proxima?.amount ?? 0) || Math.round(Number(fullOrder.total) / totalCuotas.cnt);
          const montoPagado = cuotaAmt * pagadas.cnt;
          const saldo       = Number(fullOrder.total) - montoPagado;
          const proxFecha   = proxima?.due_date
            ? new Date(proxima.due_date).toLocaleDateString('es-CO')
            : '—';

          await sendReservaWhatsApp({
            phone:          fullOrder.phone,
            name:           fullOrder.name,
            orderRef:       fullOrder.order_ref,
            eventLabel:     ticketInfo?.ticket_name ?? 'AIRA Experience',
            cuotasPagadas:  pagadas.cnt,
            cuotasTotal:    totalCuotas.cnt,
            montoPagado,
            saldoPendiente: saldo,
            proximaFecha:   proxFecha,
          });
          console.log(`[webhook-bold] 📋 Comprobante reserva enviado — ${fullOrder.order_ref} (${pagadas.cnt}/${totalCuotas.cnt})`);
        }
      }
      // Si era la última cuota → el bloque PAID de arriba ya generó el QR
    }

    // ── CANCELADO ─────────────────────────────────────────────────────────────
    if (newStatus === 'cancelled') {
      const [items]: any = await conn.query('SELECT ticket_type_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of items) {
        await conn.query(
          'UPDATE ticket_types SET reserved_qty = GREATEST(0, reserved_qty - ?) WHERE id = ?',
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
