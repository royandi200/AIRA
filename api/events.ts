import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [rows] = await pool.query(
      `SELECT id, slug, name, venue, city, event_date, event_time,
              venue_type, total_capacity, status, image_url
       FROM events
       WHERE status IN ('active','sold_out')
       ORDER BY event_date ASC`
    );
    res.status(200).json({ events: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
