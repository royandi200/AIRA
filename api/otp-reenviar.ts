/* eslint-disable @typescript-eslint/no-explicit-any */
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

  const { phone, orderId, orderRef } = req.body as Record<string, any>;

  if (!phone) return res.status(400).json({ error: 'El campo phone es requerido' });
  if (!orderId && !orderRef) return res.status(400).json({ error: 'Se requiere orderId o orderRef' });

  const phoneClean = String(phone).replace(/\D/g, '');
  if (phoneClean.length < 7) return res.status(400).json({ error: 'Número de teléfono inválido' });

  try {
    const [orders]: any = await pool.query(
      `SELECT id, order_ref FROM orders WHERE ${orderId ? 'id = ?' : 'order_ref = ?'} LIMIT 1`,
      [orderId ?? orderRef]
    );
    if (!orders.length) return res.status(404).json({ error: 'Orden no encontrada' });

    const order = orders[0];

    const [rateRows]: any = await pool.query(
      `SELECT COUNT(*) as total FROM otp_tokens
       WHERE phone = ? AND order_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [phoneClean, order.id]
    );
    if (rateRows[0].total >= MAX_ENVIOS_24H) {
      return res.status(429).json({ error: 'Límite de envíos alcanzado. Intenta en 24 horas.' });
    }

    await pool.query(
      'UPDATE otp_tokens SET usado = 1 WHERE order_id = ? AND usado = 0',
      [order.id]
    );

    const otp      = generateOTP();
    const otpHash  = await hashOTP(otp);
    const expireAt = otpExpiresAt();

    await pool.query(
      `INSERT INTO otp_tokens (order_id, phone, otp_hash, intentos, usado, bloqueado, expires_at)
       VALUES (?, ?, ?, 0, 0, 0, ?)`,
      [order.id, phoneClean, otpHash, expireAt]
    );

    await sendOTPWhatsApp(phoneClean, otp);

    return res.status(200).json({
      ok: true,
      message: `Código reenviado al WhatsApp ${phoneClean.slice(-4).padStart(phoneClean.length, '*')}`,
      expiresAt: expireAt,
    });
  } catch (err: any) {
    console.error('[otp-reenviar]', err.message);
    return res.status(500).json({ error: 'Error interno al reenviar OTP' });
  }
}
