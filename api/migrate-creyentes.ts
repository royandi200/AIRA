/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GET /api/migrate-creyentes
 * Crea tabla creyentes_whitelist.
 * Ejecutar UNA vez tras el deploy.
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

    // 1. Tabla creyentes_whitelist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS creyentes_whitelist (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        phone      VARCHAR(20) NOT NULL,
        nombre     VARCHAR(120) NULL,
        notas      VARCHAR(255) NULL,
        activo     TINYINT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_phone (phone),
        INDEX idx_activo (activo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    log.push('✅ creyentes_whitelist — OK');

    // 2. Tabla otp_creyentes_tokens (por si no existe aún)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS otp_creyentes_tokens (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        phone      VARCHAR(20) NOT NULL,
        otp_hash   VARCHAR(64) NOT NULL,
        intentos   TINYINT NOT NULL DEFAULT 0,
        usado      TINYINT NOT NULL DEFAULT 0,
        bloqueado  TINYINT NOT NULL DEFAULT 0,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_creyentes_phone  (phone),
        INDEX idx_creyentes_active (phone, usado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    log.push('✅ otp_creyentes_tokens — OK');

    return res.status(200).json({ ok: true, log });
  } catch (err: any) {
    console.error('[migrate-creyentes]', err.message);
    return res.status(500).json({ error: err.message, log });
  }
}
