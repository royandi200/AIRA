import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Verificar firma Bold con BOLD_SECRET_KEY
function verifyBoldSignature(req: VercelRequest): boolean {
  try {
    const signature = req.headers['x-bold-signature'] as string;
    if (!signature) return false;
    const hmac = crypto.createHmac('sha256', process.env.BOLD_SECRET_KEY || '');
    hmac.update(JSON.stringify(req.body));
    const digest = hmac.digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verificar que el webhook viene de Bold
  if (!verifyBoldSignature(req)) {
    return res.status(401).json({ error: 'Firma inválida' });
  }

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
      await conn.query(
        `UPDATE orders SET status='paid', paid_at=NOW(),
          payment_id=?, payment_ref=? WHERE id=?`,
        [payload.id, payload.reference, order.id]
      );
    } else {
      // Marcar cuota más antigua pendiente como pagada
      await conn.query(
        `UPDATE abono_payments SET status='paid', paid_at=NOW(),
          payment_id=?, payment_ref=?
         WHERE order_id=? AND status='pending'
         ORDER BY cuota_number ASC LIMIT 1`,
        [payload.id, payload.reference, order.id]
      );
      const [[pendingCount]]: any = await conn.query(
        `SELECT COUNT(*) as cnt FROM abono_payments
         WHERE order_id=? AND status='pending'`, [order.id]
      );
      const newStatus = pendingCount.cnt === 0 ? 'paid' : 'partial';
      await conn.query(
        `UPDATE orders SET status=?, payment_id=?, payment_ref=?,
          updated_at=NOW() WHERE id=?`,
        [newStatus, payload.id, payload.reference, order.id]
      );
      if (newStatus === 'paid') {
        await conn.query('UPDATE orders SET paid_at=NOW() WHERE id=?', [order.id]);
      }
    }

    // Generar QR UUID por cada item sin QR
    const [items]: any = await conn.query(
      'SELECT id FROM order_items WHERE order_id=? AND qr_code IS NULL', [order.id]
    );
    for (const item of items) {
      await conn.query(
        'UPDATE order_items SET qr_code=?, qr_generated_at=NOW() WHERE id=?',
        [uuidv4(), item.id]
      );
    }

    // Mover cupos de reserved → sold
    const [orderItems]: any = await conn.query(
      'SELECT ticket_type_id, quantity FROM order_items WHERE order_id=?', [order.id]
    );
    for (const oi of orderItems) {
      await conn.query(
        `UPDATE ticket_types
         SET sold_qty     = sold_qty + ?,
             reserved_qty = GREATEST(0, reserved_qty - ?)
         WHERE id=?`,
        [oi.quantity, oi.quantity, oi.ticket_type_id]
      );
    }

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
