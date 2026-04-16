import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../db';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = req.body;
  const orderRef = payload?.metadata?.order_ref || payload?.order_ref;

  // Log siempre el webhook
  await pool.query(
    `INSERT INTO webhook_logs (provider, event_type, payload, order_ref)
     VALUES ('bold', ?, ?, ?)`,
    [payload?.type || 'unknown', JSON.stringify(payload), orderRef]
  );

  if (payload?.type !== 'payment.approved') {
    return res.status(200).json({ received: true });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[order]]: any = await conn.query(
      'SELECT * FROM orders WHERE order_ref = ?', [orderRef]
    );
    if (!order) throw new Error('Orden no encontrada');

    if (order.payment_mode === 'full') {
      // Pago completo
      await conn.query(
        `UPDATE orders SET status='paid', paid_at=NOW(),
          payment_id=?, payment_ref=? WHERE id=?`,
        [payload.id, payload.reference, order.id]
      );
    } else {
      // Abono: marcar cuota 1 como pagada
      await conn.query(
        `UPDATE abono_payments SET status='paid', paid_at=NOW(),
          payment_id=?, payment_ref=?
         WHERE order_id=? AND cuota_number=1 AND status='pending'`,
        [payload.id, payload.reference, order.id]
      );
      // Si todas las cuotas están pagas → orden paid, sino partial
      const [[pendingCount]]: any = await conn.query(
        `SELECT COUNT(*) as cnt FROM abono_payments
         WHERE order_id=? AND status='pending'`, [order.id]
      );
      const newStatus = pendingCount.cnt === 0 ? 'paid' : 'partial';
      await conn.query(
        `UPDATE orders SET status=?, payment_id=?, payment_ref=?,
          ${newStatus === 'paid' ? 'paid_at=NOW(),' : ''} updated_at=NOW()
         WHERE id=?`,
        [newStatus, payload.id, payload.reference, order.id]
      );
    }

    // Generar QR UUID por cada item
    const [items]: any = await conn.query(
      'SELECT id FROM order_items WHERE order_id=? AND qr_code IS NULL', [order.id]
    );
    for (const item of items) {
      await conn.query(
        'UPDATE order_items SET qr_code=?, qr_generated_at=NOW() WHERE id=?',
        [uuidv4(), item.id]
      );
    }

    // Liberar reserva de cupos
    const [orderItems]: any = await conn.query(
      'SELECT ticket_type_id, quantity FROM order_items WHERE order_id=?', [order.id]
    );
    for (const oi of orderItems) {
      await conn.query(
        `UPDATE ticket_types
         SET sold_qty = sold_qty + ?,
             reserved_qty = GREATEST(0, reserved_qty - ?)
         WHERE id=?`,
        [oi.quantity, oi.quantity, oi.ticket_type_id]
      );
    }

    // Marcar webhook procesado
    await conn.query(
      `UPDATE webhook_logs SET processed=1 WHERE order_ref=? ORDER BY id DESC LIMIT 1`,
      [orderRef]
    );

    await conn.commit();
    res.status(200).json({ success: true });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}
