/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GET /api/migrate
 * Aplica migraciones pendientes de forma idempotente (IF NOT EXISTS / IF EXISTS).
 * Llamar una vez después de cada deploy que agregue columnas nuevas.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';

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

const migrations: Array<{ name: string; sql: string }> = [
  {
    name: 'orders.bold_link',
    sql: `ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS bold_link VARCHAR(2048) NULL AFTER payment_mode`,
  },
  {
    name: 'orders.bold_payment_id',
    sql: `ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS bold_payment_id VARCHAR(255) NULL AFTER bold_link`,
  },
  {
    name: 'orders.paid_at',
    sql: `ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS paid_at DATETIME NULL AFTER bold_payment_id`,
  },
];

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const results: Record<string, string> = {};
  const conn = await pool.getConnection();
  try {
    for (const m of migrations) {
      try {
        await conn.query(m.sql);
        results[m.name] = 'OK';
      } catch (e: any) {
        results[m.name] = `ERROR: ${e.message}`;
      }
    }
    return res.status(200).json({ status: 'done', results });
  } finally {
    conn.release();
  }
}
