/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * POST /api/otp-creyentes-enviar
 * Envía OTP para verificar acceso a etapa Creyentes.
 * NO requiere orderId — solo phone. Guarda en otp_creyentes_tokens.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { generateOTP, hashOTP, otpExpiresAt, sendOTPWhatsApp } from './lib/otp.js';

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASS,
  database:           process.env.DB_NAME,
  port:               Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  ssl:                { rejectUnauthorized: false },
});

const MAX_ENVIOS_24H = 5;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone } = req.body as Record<string, any>;

  if (!phone) return res.status(400).json({ error: 'El campo phone es requerido' });

  const phoneClean = String(phone).replace(/\D/g, '');
  if (phoneClean.length < 7) return res.status(400).json({ error: 'Número de teléfono inválido' });

  try {
    // Crear tabla si no existe
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
        INDEX idx_creyentes_phone (phone),
        INDEX idx_creyentes_active (phone, usado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Rate limit: máx 5 envíos en 24h por número
    const [rateRows]: any = await pool.query(
      `SELECT COUNT(*) as total FROM otp_creyentes_tokens
       WHERE phone = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [phoneClean]
    );
    if (rateRows[0].total >= MAX_ENVIOS_24H) {
      return res.status(429).json({ error: 'Límite de envíos alcanzado. Intenta en 24 horas.' });
    }

    // Invalidar tokens anteriores del mismo phone
    await pool.query(
      'UPDATE otp_creyentes_tokens SET usado = 1 WHERE phone = ? AND usado = 0',
      [phoneClean]
    );

    const otp      = generateOTP();
    const otpHash  = await hashOTP(otp);
    const expireAt = otpExpiresAt();

    await pool.query(
      `INSERT INTO otp_creyentes_tokens (phone, otp_hash, intentos, usado, bloqueado, expires_at)
       VALUES (?, ?, 0, 0, 0, ?)`,
      [phoneClean, otpHash, expireAt]
    );

    await sendOTPWhatsApp(phoneClean, otp);

    return res.status(200).json({
      ok: true,
      message: `Código enviado al WhatsApp ${phoneClean.slice(-4).padStart(phoneClean.length, '*')}`,
      expiresAt: expireAt,
    });
  } catch (err: any) {
    console.error('[otp-creyentes-enviar]', err.message);
    return res.status(500).json({ error: 'Error interno al enviar OTP' });
  }
}
