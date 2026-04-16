/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth simple por header
  const token = req.headers['x-admin-token'];
  if (token !== (process.env.ADMIN_TOKEN || 'aira-admin-2026')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const section = (req.query.section as string) || 'overview';

  try {
    if (section === 'overview') {
      const [[revenue]]: any = await pool.query(
        `SELECT
           COALESCE(SUM(total),0)                                          AS total_revenue,
           COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0) AS paid_revenue,
           COUNT(*)                                                        AS total_orders,
           SUM(CASE WHEN status='paid'      THEN 1 ELSE 0 END)           AS paid_orders,
           SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END)           AS pending_orders,
           SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END)           AS cancelled_orders
         FROM orders`
      );

      const [tickets]: any = await pool.query(
        `SELECT tt.name, tt.access_type,
                tt.available_qty, tt.sold_qty,
                COALESCE(tt.reserved_qty,0) AS reserved_qty,
                tt.price
         FROM ticket_types tt ORDER BY tt.id`
      );

      const [recentOrders]: any = await pool.query(
        `SELECT o.id, o.order_ref, o.total, o.status, o.payment_mode,
                o.reserved_until, o.created_at,
                u.name AS customer_name, u.email AS customer_email
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         ORDER BY o.created_at DESC LIMIT 50`
      );

      const [dailyRevenue]: any = await pool.query(
        `SELECT DATE(created_at) AS day,
                SUM(CASE WHEN status='paid' THEN total ELSE 0 END) AS revenue,
                COUNT(*) AS orders
         FROM orders
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(created_at)
         ORDER BY day ASC`
      );

      return res.status(200).json({ revenue, tickets, recentOrders, dailyRevenue });
    }

    return res.status(400).json({ error: 'Sección desconocida' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
