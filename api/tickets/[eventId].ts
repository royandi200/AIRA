import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { eventId } = req.query;

  try {
    const [rows] = await pool.query(
      `SELECT
         id, name, description, price, vip_price,
         stage, stage_label, stage_dates,
         available_qty, sold_qty, reserved_qty,
         access_type, is_locked, lock_note,
         is_urgent, sort_order,
         -- Flag que indica si este ticket puede pagar en cuotas
         (access_type = 'package' AND name LIKE '%VIP%') AS allows_abono
       FROM ticket_types
       WHERE event_id = ? AND is_active = 1
       ORDER BY sort_order ASC`,
      [eventId]
    );
    res.status(200).json({ tickets: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
