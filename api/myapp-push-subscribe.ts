/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { ensurePushTable } from './lib/push.js';

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

async function sessionFromToken(token: string): Promise<{ order_ref: string } | null> {
  const [rows]: any = await pool.query(
    `SELECT order_ref FROM myapp_sessions WHERE token = ? LIMIT 1`,
    [token]
  );
  return rows.length ? rows[0] : null;
}

/**
 * POST — guarda la suscripción push del navegador (se llama cuando el
 * asistente activa notificaciones en Perfil). DELETE — la borra (cuando
 * las desactiva). Ambas requieren sesión activa.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-myapp-token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensurePushTable(pool);

    const token = String(req.query.token || req.headers['x-myapp-token'] || '');
    if (!token) return res.status(401).json({ ok: false, error: 'Falta sesión' });
    const session = await sessionFromToken(token);
    if (!session) return res.status(401).json({ ok: false, error: 'Sesión inválida' });

    if (req.method === 'POST') {
      const { subscription } = req.body as { subscription?: { endpoint: string; keys: { p256dh: string; auth: string } } };
      if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        return res.status(400).json({ ok: false, error: 'Suscripción inválida' });
      }
      await pool.query(
        `INSERT INTO myapp_push_subscriptions (order_ref, endpoint, p256dh, auth)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE order_ref = VALUES(order_ref), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
        [session.order_ref, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
      );
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { endpoint } = req.body as { endpoint?: string };
      if (!endpoint) return res.status(400).json({ ok: false, error: 'Falta endpoint' });
      await pool.query(`DELETE FROM myapp_push_subscriptions WHERE endpoint = ? AND order_ref = ?`, [endpoint, session.order_ref]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[myapp-push-subscribe]', err.message);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
}
