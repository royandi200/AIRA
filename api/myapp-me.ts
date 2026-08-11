/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';

/**
 * Refresca la sesión de /myapp sin volver a pedir OTP — el celular
 * guarda el token de myapp-auth-verificar y lo manda aquí cada vez
 * que abre la app para traer los datos reales actualizados.
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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = String(req.query.token || '');
  if (!token) return res.status(400).json({ error: 'token requerido' });

  try {
    const [sessions]: any = await pool.query(
      `SELECT phone, order_ref, source, expires_at FROM myapp_sessions WHERE token = ? LIMIT 1`,
      [token]
    );
    if (!sessions.length) return res.status(401).json({ error: 'Sesión inválida' });
    const session = sessions[0];
    if (new Date(session.expires_at) < new Date()) return res.status(401).json({ error: 'Sesión expirada' });

    // Fuente única de verdad: manual_registros
    const [rows]: any = await pool.query(
      `SELECT order_ref, nombre AS name, qr_token, paquete, monto_pendiente
       FROM manual_registros WHERE order_ref = ? LIMIT 1`,
      [session.order_ref]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontramos tu boleta' });

    const r = rows[0];
    const montoPendiente = Number(r.monto_pendiente || 0);
    const attendee = {
      name:           r.name,
      orderRef:       r.order_ref,
      // TODO: mismo pendiente que en myapp-auth-verificar.ts -- definir
      // qué paquetes cuentan como VIP.
      isVip:          false,
      qrToken:        montoPendiente > 0 ? null : (r.qr_token || null),
      paquete:        r.paquete || null,
      montoPendiente,
    };

    return res.status(200).json({ ok: true, attendee });
  } catch (err: any) {
    console.error('[myapp-me]', err.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}
