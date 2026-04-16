import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 5,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id requerido' });

  const [[order]]: any = await db.query(
    `SELECT o.id, o.total, o.status, o.access_type, o.ticket_label, o.stage_label,
            o.qty, o.add_pass_vip, o.add_transport, o.created_at,
            u.name, u.email,
            GROUP_CONCAT(oi.qr_code) as qr_codes
     FROM orders o
     JOIN users u ON u.id = o.user_id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.id = ?
     GROUP BY o.id`,
    [id]
  );

  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

  return res.status(200).json({
    ...order,
    qr_codes: order.qr_codes ? order.qr_codes.split(',') : [],
  });
}
