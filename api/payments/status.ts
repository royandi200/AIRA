import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../db';

// GET /api/payments/status?order_id=123
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const orderId = req.query.order_id as string;
  if (!orderId) return res.status(400).json({ error: 'order_id requerido' });

  try {
    const [[order]]: any = await pool.query(
      `SELECT o.id, o.order_ref, o.status, o.total, o.payment_mode, o.payment_id,
              e.name  AS event_name,
              e.event_date,
              v.name  AS venue,
              u.name  AS buyer_name,
              u.email AS buyer_email
       FROM orders o
       JOIN events e ON e.id = o.event_id
       JOIN venues v ON v.id = e.venue_id
       JOIN users  u ON u.id = o.user_id
       WHERE o.id = ?`,
      [orderId]
    );

    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

    const [items]: any = await pool.query(
      `SELECT oi.id, tt.name AS label, oi.quantity, oi.qr_code
       FROM order_items oi
       JOIN ticket_types tt ON tt.id = oi.ticket_type_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    return res.status(200).json({
      id:         order.id,
      order_ref:  order.order_ref,
      status:     order.status,        // 'pending' | 'paid' | 'cancelled'
      total:      Number(order.total),
      payment_id: order.payment_id,
      event_name: order.event_name,
      event_date: order.event_date,
      venue:      order.venue,
      name:       order.buyer_name,
      email:      order.buyer_email,
      items,
    });
  } catch (err: any) {
    console.error('[payments/status]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
