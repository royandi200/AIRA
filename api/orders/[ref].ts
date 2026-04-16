import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { ref } = req.query;

  try {
    const [[order]]: any = await pool.query(
      `SELECT o.id, o.order_ref, o.status, o.payment_mode, o.total,
              o.subtotal, o.service_fee, o.pass_vip_total, o.transport_total,
              o.reserved_until, o.paid_at, o.created_at,
              u.name AS buyer_name, u.email AS buyer_email, u.phone AS buyer_phone,
              e.name AS event_name, e.event_date, e.venue, e.city
       FROM orders o
       JOIN users  u ON u.id = o.user_id
       JOIN events e ON e.id = o.event_id
       WHERE o.order_ref = ?`,
      [ref]
    );
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

    const [items]: any = await pool.query(
      `SELECT oi.id, oi.quantity, oi.unit_price, oi.is_vip, oi.qr_code,
              tt.name AS ticket_name
       FROM order_items oi
       JOIN ticket_types tt ON tt.id = oi.ticket_type_id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    const [abonos]: any = await pool.query(
      `SELECT cuota_number, amount, due_date, status, paid_at
       FROM abono_payments WHERE order_id = ? ORDER BY cuota_number`,
      [order.id]
    );

    res.status(200).json({ order, items, abonos });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
