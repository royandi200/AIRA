/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GET /api/migrate
 * Agrega columnas nuevas de forma idempotente usando INFORMATION_SCHEMA.
 * Compatible con MySQL 5.7+ (no usa ADD COLUMN IF NOT EXISTS).
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

interface ColMigration {
  table:  string;
  column: string;
  ddl:    string; // fragmento después de ADD COLUMN
}

const columns: ColMigration[] = [
  { table: 'orders', column: 'bold_link',       ddl: 'bold_link VARCHAR(2048) NULL AFTER payment_mode' },
  { table: 'orders', column: 'bold_payment_id', ddl: 'bold_payment_id VARCHAR(255) NULL AFTER bold_link' },
  { table: 'orders', column: 'paid_at',         ddl: 'paid_at DATETIME NULL AFTER bold_payment_id' },
];

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const results: Record<string, string> = {};
  const dbName = process.env.DB_NAME ?? '';
  const conn   = await pool.getConnection();
  try {
    for (const m of columns) {
      const key = `${m.table}.${m.column}`;
      try {
        // Verificar si la columna ya existe
        const [rows]: any = await conn.query(
          `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
          [dbName, m.table, m.column]
        );
        if (rows[0].cnt > 0) {
          results[key] = 'ALREADY EXISTS';
          continue;
        }
        await conn.query(`ALTER TABLE \`${m.table}\` ADD COLUMN ${m.ddl}`);
        results[key] = 'OK';
      } catch (e: any) {
        results[key] = `ERROR: ${e.message}`;
      }
    }
    return res.status(200).json({ status: 'done', results });
  } finally {
    conn.release();
  }
}
