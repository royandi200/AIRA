/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { ensureConsentSchema, CONSENT_VERSION } from './lib/myapp-consent.js';

/**
 * Registra la aceptación del consentimiento informado — paso obligatorio
 * una sola vez, justo después del login con OTP y antes de entrar al
 * menú de /myapp. Guarda fecha/hora + IP + user-agent como evidencia,
 * además del dato en manual_registros para consulta rápida en Mi Perfil.
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    token,
    contactoEmergenciaNombre,
    contactoEmergenciaTelefono,
    condicionesMedicas,
  } = req.body as Record<string, any>;

  if (!token) return res.status(400).json({ error: 'token requerido' });

  try {
    await ensureConsentSchema(pool);

    const [sessions]: any = await pool.query(
      `SELECT order_ref, name FROM myapp_sessions WHERE token = ? LIMIT 1`,
      [token]
    );
    if (!sessions.length) return res.status(401).json({ error: 'Sesión inválida' });
    const { order_ref, name } = sessions[0];

    await pool.query(
      `UPDATE manual_registros
       SET consent_accepted_at = NOW(),
           contacto_emergencia_nombre = ?,
           contacto_emergencia_telefono = ?,
           condiciones_medicas = ?
       WHERE order_ref = ?`,
      [contactoEmergenciaNombre || null, contactoEmergenciaTelefono || null, condicionesMedicas || null, order_ref]
    );

    const ip = (req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress || '').toString().split(',')[0].trim();
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 300);

    await pool.query(
      `INSERT INTO myapp_consentimientos (order_ref, nombre, version, ip, user_agent) VALUES (?, ?, ?, ?, ?)`,
      [order_ref, name, CONSENT_VERSION, ip || null, userAgent || null]
    );

    const [rows]: any = await pool.query(
      `SELECT consent_accepted_at FROM manual_registros WHERE order_ref = ? LIMIT 1`,
      [order_ref]
    );

    return res.status(200).json({ ok: true, consentAcceptedAt: rows[0]?.consent_accepted_at || null });
  } catch (err: any) {
    console.error('[myapp-consent]', err.message);
    return res.status(500).json({ error: 'Error interno al registrar el consentimiento' });
  }
}
