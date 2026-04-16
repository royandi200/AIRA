/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GET /api/migrate-otp
 * Crea tabla otp_tokens y columnas phone_verified en orders.
 * Ejecutar UNA sola vez después del deploy.
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

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const log: string[] = [];

  try {
    // 1. Tabla otp_tokens
    await pool.query(`
      CREATE TABLE IF NOT EXISTS otp_tokens (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        order_id    INT NOT NULL,
        phone       VARCHAR(20) NOT NULL,
        otp_hash    VARCHAR(64) NOT NULL,
        intentos    TINYINT NOT NULL DEFAULT 0,
        usado       TINYINT NOT NULL DEFAULT 0,
        bloqueado   TINYINT NOT NULL DEFAULT 0,
        expires_at  DATETIME NOT NULL,
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_otp_order  (order_id),
        INDEX idx_otp_phone  (phone),
        INDEX idx_otp_active (phone, order_id, usado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    log.push('✅ otp_tokens — OK');

    // 2. Columna phone_verified en orders
    try {
      await pool.query(`
        ALTER TABLE orders
          ADD COLUMN phone_verified    TINYINT NOT NULL DEFAULT 0,
          ADD COLUMN phone_verified_at DATETIME NULL;
      `);
      log.push('✅ orders.phone_verified — creada');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        log.push('ℹ️  orders.phone_verified — ya existía');
      } else {
        throw e;
      }
    }

    return res.status(200).json({ ok: true, log });
  } catch (err: any) {
    console.error('[migrate-otp]', err.message);
    return res.status(500).json({ error: err.message, log });
  }
}
