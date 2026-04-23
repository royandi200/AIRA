/**
 * POST /api/otp-reservas-verificar
 * Verifica el OTP enviado por /api/otp-reservas-enviar
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { hashOTP } from './lib/otp.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASS, database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT)||3306,
  waitForConnections: true, connectionLimit: 10,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, email, otp } = req.body as { phone?: string; email?: string; otp: string };
  if (!otp) return res.status(400).json({ error: 'OTP requerido' });
  if (!phone && !email) return res.status(400).json({ error: 'phone o email requerido' });

  const isEmail    = Boolean(email);
  const identifier = isEmail ? email!.trim().toLowerCase() : String(phone).replace(/\D/g,'');

  try {
    const otpHash = await hashOTP(otp.trim());

    const [tokens]: any = await pool.query(
      `SELECT id, intentos, bloqueado, expires_at
       FROM otp_reservas_tokens
       WHERE identifier = ? AND usado = 0
       ORDER BY created_at DESC LIMIT 1`,
      [identifier]
    );

    if (!tokens.length) {
      return res.status(400).json({ error: 'Código expirado o no encontrado. Solicita uno nuevo.' });
    }

    const token = tokens[0];

    if (token.bloqueado) {
      return res.status(429).json({ error: 'Código bloqueado por demasiados intentos. Solicita uno nuevo.' });
    }

    if (new Date(token.expires_at) < new Date()) {
      await pool.query(`UPDATE otp_reservas_tokens SET usado=1 WHERE id=?`, [token.id]);
      return res.status(400).json({ error: 'El código ha expirado. Solicita uno nuevo.' });
    }

    // Verificar hash
    const [valid]: any = await pool.query(
      `SELECT id FROM otp_reservas_tokens WHERE id=? AND otp_hash=?`,
      [token.id, otpHash]
    );

    if (!valid.length) {
      const newIntentos = token.intentos + 1;
      const bloquear    = newIntentos >= 5;
      await pool.query(
        `UPDATE otp_reservas_tokens SET intentos=?, bloqueado=? WHERE id=?`,
        [newIntentos, bloquear ? 1 : 0, token.id]
      );
      return res.status(400).json({
        error: bloquear
          ? 'Código bloqueado por demasiados intentos. Solicita uno nuevo.'
          : `Código incorrecto. ${5 - newIntentos} intentos restantes.`,
      });
    }

    // Marcar como usado
    await pool.query(`UPDATE otp_reservas_tokens SET usado=1 WHERE id=?`, [token.id]);

    return res.status(200).json({ ok: true, identifier });
  } catch (err: any) {
    console.error('[otp-reservas-verificar]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
