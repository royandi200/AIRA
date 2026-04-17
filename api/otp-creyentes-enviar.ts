/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * POST /api/otp-creyentes-enviar
 * 1. Verifica que el phone esté en creyentes_whitelist (activo=1)
 * 2. Envía OTP por WhatsApp vía BuilderBot
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
    // ── 1. Verificar whitelist ────────────────────────────────────────────
    const [whitelist]: any = await pool.query(
      `SELECT id, nombre FROM creyentes_whitelist WHERE phone = ? AND activo = 1 LIMIT 1`,
      [phoneClean]
    );
    if (!whitelist.length) {
      return res.status(403).json({
        error: 'Este número no está registrado como Creyente. Escríbenos al WhatsApp de AIRA para verificar tu acceso.',
        code: 'NOT_IN_WHITELIST',
      });
    }

    // ── 2. Rate limit ─────────────────────────────────────────────────────
    const [rateRows]: any = await pool.query(
      `SELECT COUNT(*) as total FROM otp_creyentes_tokens
       WHERE phone = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [phoneClean]
    );
    if (rateRows[0].total >= MAX_ENVIOS_24H) {
      return res.status(429).json({ error: 'Límite de envíos alcanzado. Intenta en 24 horas.' });
    }

    // ── 3. Invalidar tokens anteriores ───────────────────────────────────
    await pool.query(
      `UPDATE otp_creyentes_tokens SET usado = 1 WHERE phone = ? AND usado = 0`,
      [phoneClean]
    );

    // ── 4. Generar e insertar nuevo OTP ───────────────────────────────────
    const otp      = generateOTP();
    const otpHash  = await hashOTP(otp);
    const expireAt = otpExpiresAt();

    await pool.query(
      `INSERT INTO otp_creyentes_tokens (phone, otp_hash, intentos, usado, bloqueado, expires_at)
       VALUES (?, ?, 0, 0, 0, ?)`,
      [phoneClean, otpHash, expireAt]
    );

    // ── 5. Enviar WhatsApp ────────────────────────────────────────────────
    await sendOTPWhatsApp(phoneClean, otp);

    const nombre = whitelist[0].nombre;
    return res.status(200).json({
      ok: true,
      message: `Código enviado al WhatsApp ${phoneClean.slice(-4).padStart(phoneClean.length, '*')}`,
      nombre: nombre ?? null,
      expiresAt: expireAt,
    });

  } catch (err: any) {
    console.error('[otp-creyentes-enviar]', err.message);
    return res.status(500).json({ error: 'Error interno al enviar OTP' });
  }
}
