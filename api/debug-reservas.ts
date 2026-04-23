import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Ver últimas órdenes con su teléfono real
    const [orders]: any = await pool.query(
      `SELECT o.id, o.order_ref, o.status, u.phone, u.email, u.name
       FROM orders o JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC LIMIT 5`
    );
    return res.status(200).json({ ok: true, orders });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
