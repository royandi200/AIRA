/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * POST /api/otp-creyentes-verificar
 * Verifica OTP de etapa Creyentes. Solo necesita phone + otp.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { hashOTP } from './lib/otp.js';

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

const MAX_INTENTOS = 3;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, otp } = req.body as Record<string, any>;

  if (!phone || !otp) return res.status(400).json({ error: 'phone y otp son requeridos' });

  const phoneClean = String(phone).replace(/\D/g, '');

  try {
    const [tokens]: any = await pool.query(
      `SELECT id, otp_hash, intentos, bloqueado, expires_at
       FROM otp_creyentes_tokens
       WHERE phone = ? AND usado = 0
       ORDER BY created_at DESC LIMIT 1`,
      [phoneClean]
    );

    if (!tokens.length) {
      return res.status(400).json({ error: 'No hay código activo. Solicita uno nuevo.' });
    }

    const token = tokens[0];

    if (token.bloqueado) {
      return res.status(429).json({ error: 'Demasiados intentos fallidos. Solicita un nuevo código.' });
    }

    if (new Date(token.expires_at) < new Date()) {
      return res.status(410).json({ error: 'El código expiró. Solicita uno nuevo.' });
    }

    const otpHash = await hashOTP(String(otp));
    if (token.otp_hash !== otpHash) {
      const newIntentos = token.intentos + 1;
      const bloquear    = newIntentos >= MAX_INTENTOS ? 1 : 0;
      await pool.query(
        'UPDATE otp_creyentes_tokens SET intentos = ?, bloqueado = ? WHERE id = ?',
        [newIntentos, bloquear, token.id]
      );
      const restantes = MAX_INTENTOS - newIntentos;
      return res.status(401).json({
        error: bloquear
          ? 'Bloqueado por 3 intentos fallidos. Solicita un nuevo código.'
          : `Código incorrecto. ${restantes} intento(s) restante(s).`,
      });
    }

    await pool.query('UPDATE otp_creyentes_tokens SET usado = 1 WHERE id = ?', [token.id]);

    return res.status(200).json({
      ok: true,
      verified: true,
      message: '¡Acceso Creyentes verificado! ✅',
    });
  } catch (err: any) {
    console.error('[otp-creyentes-verificar]', err.message);
    return res.status(500).json({ error: 'Error interno al verificar OTP' });
  }
}
