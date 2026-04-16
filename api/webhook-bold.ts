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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const signature = req.headers['x-bold-signature'] as string | undefined;
  const rawBody   = JSON.stringify(req.body);
  const expected  = createHmac('sha256', process.env.BOLD_SECRET_KEY || '')
    .update(rawBody).digest('hex');

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

    if (newStatus === 'paid') {
      const [items]: any = await conn.query(
        'SELECT ticket_type_id, quantity FROM order_items WHERE order_id = ?', [order_id]
      );
      for (const item of items)
        await conn.query(
          `UPDATE ticket_types SET sold_qty = sold_qty + ?, reserved_qty = reserved_qty - ? WHERE id = ?`,
          [item.quantity, item.quantity, item.ticket_type_id]
        );
    }

    if (newStatus === 'cancelled') {
      const [items]: any = await conn.query(
        'SELECT ticket_type_id, quantity FROM order_items WHERE order_id = ?', [order_id]
      );
      for (const item of items)
        await conn.query(
          `UPDATE ticket_types SET reserved_qty = reserved_qty - ? WHERE id = ?`,
          [item.quantity, item.ticket_type_id]
        );
    }

    await conn.commit();
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    await conn.rollback();
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}
