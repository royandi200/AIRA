import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { generateQRToken } from './lib/generate-ticket.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASS, database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true, connectionLimit: 5,
  ssl: { rejectUnauthorized: false },
});

function auth(req: VercelRequest) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;
  return req.headers['x-admin-token'] === adminToken;
}

/**
 * POST /api/admin-generar-ticket
 * Body: { order_ref: string }
 *
 * Genera (o regenera) el qr_token de un registro manual y devuelve
 * la URL de boleta identica a la que produce el webhook de Bold:
 *   https://www.viveaira.live/boleta/{orderRef}?token={qrToken}
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!auth(req)) return res.status(401).json({ error: 'No autorizado' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { order_ref } = req.body as Record<string, any>;
  if (!order_ref) return res.status(400).json({ error: 'order_ref es requerido' });

  // Agregar columna qr_token si aun no existe (idempotente)
  await pool.query(`
    ALTER TABLE manual_registros
    ADD COLUMN IF NOT EXISTS qr_token VARCHAR(40) NULL
  `).catch(() => { /* columna ya existe */ });

  const [[registro]]: any = await pool.query(
    'SELECT id, order_ref, qr_token FROM manual_registros WHERE order_ref = ?',
    [order_ref]
  );

  if (!registro) return res.status(404).json({ error: 'Registro no encontrado' });

  // Generar token con la MISMA funcion que usa webhook-bold
  const qrToken = generateQRToken(String(registro.order_ref));

  await pool.query(
    'UPDATE manual_registros SET qr_token = ? WHERE id = ?',
    [qrToken, registro.id]
  );

  const BASE = 'https://www.viveaira.live';
  const boletaUrl = `${BASE}/boleta/${registro.order_ref}?token=${qrToken}`;

  return res.json({ ok: true, order_ref: registro.order_ref, qr_token: qrToken, boleta_url: boletaUrl });
}
