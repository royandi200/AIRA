/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASS, database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true, connectionLimit: 3,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo GET (cron) o POST con token admin
  const token = req.headers['x-admin-token'] || req.query.token;
  const adminToken = process.env.ADMIN_TOKEN || process.env.CRON_SECRET;
  if (token !== adminToken) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    // 1. Liberar reserved_qty de órdenes vencidas
    const [result]: any = await pool.query(`
      UPDATE ticket_types tt
      SET reserved_qty = (
        SELECT COALESCE(SUM(oi.quantity), 0)
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        WHERE oi.ticket_type_id = tt.id
          AND o.status = 'pending'
          AND o.reserved_until > NOW()
      )
    `);

    // 2. Cancelar órdenes pending vencidas
    const [cancelled]: any = await pool.query(`
      UPDATE orders
      SET status = 'cancelled'
      WHERE status = 'pending'
        AND reserved_until < NOW()
    `);

    const affected = result.affectedRows ?? 0;
    const cancelledRows = cancelled.affectedRows ?? 0;

    console.log(`[cleanup] ticket_types updated: ${affected}, orders cancelled: ${cancelledRows}`);
    return res.status(200).json({
      ok: true,
      ticket_types_updated: affected,
      orders_cancelled: cancelledRows,
      ran_at: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[cleanup]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
