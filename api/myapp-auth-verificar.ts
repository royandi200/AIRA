/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { randomBytes } from 'crypto';
import { hashOTP } from './lib/otp.js';

/**
 * Login de /myapp — paso 2: verificar OTP y abrir sesión.
 * Crea un token de sesión propio (myapp_sessions, 30 días) — no toca
 * el sistema de otp_tokens/checkout de boletas.
 */

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

const MAX_INTENTOS  = 3;
const SESSION_DAYS  = 30;

async function ensureSessionTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS myapp_sessions (
      token       VARCHAR(64)  PRIMARY KEY,
      phone       VARCHAR(30)  NOT NULL,
      order_ref   VARCHAR(20)  NOT NULL,
      name        VARCHAR(150) NOT NULL,
      source      VARCHAR(10)  NOT NULL,
      expires_at  DATETIME     NOT NULL,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function findAttendeeFull(phone: string): Promise<{ order_ref: string; name: string; is_vip: boolean; qr_token: string | null; source: 'orders' | 'manual' } | null> {
  const [orderRows]: any = await pool.query(
    `SELECT o.order_ref, u.name, o.add_pass_vip, o.qr_token
     FROM orders o JOIN users u ON u.id = o.user_id
     WHERE u.phone = ? AND o.status IN ('paid','partial')
     ORDER BY o.created_at DESC LIMIT 1`,
    [phone]
  );
  if (orderRows.length) {
    const r = orderRows[0];
    return { order_ref: r.order_ref, name: r.name, is_vip: !!r.add_pass_vip, qr_token: r.qr_token || null, source: 'orders' };
  }

  const [manualRows]: any = await pool.query(
    `SELECT order_ref, nombre AS name, qr_token FROM manual_registros WHERE movil = ? ORDER BY created_at DESC LIMIT 1`,
    [phone]
  );
  if (manualRows.length) {
    const r = manualRows[0];
    return { order_ref: r.order_ref, name: r.name, is_vip: false, qr_token: r.qr_token || null, source: 'manual' };
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, otp } = req.body as Record<string, any>;
  if (!phone || !otp) return res.status(400).json({ error: 'phone y otp son requeridos' });

  const phoneClean = String(phone).replace(/\D/g, '');

  try {
    await ensureSessionTable();

    const [tokens]: any = await pool.query(
      `SELECT id, otp_hash, intentos, bloqueado, expires_at FROM myapp_otp_tokens
       WHERE phone = ? AND usado = 0 ORDER BY created_at DESC LIMIT 1`,
      [phoneClean]
    );
    if (!tokens.length) return res.status(400).json({ error: 'No hay código activo. Solicita uno nuevo.' });
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
      await pool.query('UPDATE myapp_otp_tokens SET intentos = ?, bloqueado = ? WHERE id = ?', [newIntentos, bloquear, token.id]);
      const restantes = MAX_INTENTOS - newIntentos;
      return res.status(401).json({
        error: bloquear ? 'Bloqueado por intentos fallidos. Solicita un nuevo código.' : `Código incorrecto. ${restantes} intento(s) restante(s).`,
      });
    }

    await pool.query('UPDATE myapp_otp_tokens SET usado = 1 WHERE id = ?', [token.id]);

    const attendee = await findAttendeeFull(phoneClean);
    if (!attendee) return res.status(404).json({ error: 'No encontramos tu boleta. Contacta soporte.' });

    const sessionToken = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO myapp_sessions (token, phone, order_ref, name, source, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionToken, phoneClean, attendee.order_ref, attendee.name, attendee.source, expiresAt]
    );

    return res.status(200).json({
      ok: true,
      token: sessionToken,
      attendee: {
        name:     attendee.name,
        orderRef: attendee.order_ref,
        isVip:    attendee.is_vip,
        qrToken:  attendee.qr_token,
      },
    });
  } catch (err: any) {
    console.error('[myapp-auth-verificar]', err.message);
    return res.status(500).json({ error: 'Error interno al verificar el código' });
  }
}
