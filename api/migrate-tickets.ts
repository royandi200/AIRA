/* eslint-disable @typescript-eslint/no-explicit-any */
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

/**
 * GET /api/migrate-tickets
 * Agrega columnas qr_token y qr_used_at a la tabla orders.
 * Ejecutar una sola vez. Protegido con x-admin-key.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const key = req.headers['x-admin-key'] as string | undefined;
  if (key !== (process.env.ADMIN_KEY || 'aira-admin-2026')) {
    return res.status(401).json({ error: 'Sin autorización' });
  }

  const results: string[] = [];

  const migrations = [
    { name: 'qr_token',    sql: 'ALTER TABLE orders ADD COLUMN qr_token VARCHAR(40) NULL UNIQUE AFTER status' },
    { name: 'qr_used_at', sql: 'ALTER TABLE orders ADD COLUMN qr_used_at DATETIME NULL AFTER qr_token' },
    { name: 'paid_at',    sql: 'ALTER TABLE orders ADD COLUMN paid_at DATETIME NULL AFTER qr_used_at' },
    { name: 'bold_link',  sql: 'ALTER TABLE orders ADD COLUMN bold_link TEXT NULL AFTER paid_at' },
    { name: 'bold_payment_id', sql: 'ALTER TABLE orders ADD COLUMN bold_payment_id VARCHAR(100) NULL AFTER bold_link' },
    { name: 'idx_qr_token', sql: 'ALTER TABLE orders ADD INDEX idx_qr_token (qr_token)' },
  ];

  for (const m of migrations) {
    try {
      await pool.query(m.sql);
      results.push(`✅ ${m.name}`);
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME' || e.message?.includes('Duplicate column')) {
        results.push(`⏭️  ${m.name} (ya existe)`);
      } else {
        results.push(`❌ ${m.name}: ${e.message}`);
      }
    }
  }

  return res.status(200).json({ ok: true, results });
}
