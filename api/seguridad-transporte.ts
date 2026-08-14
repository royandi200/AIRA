/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { ensureCheckinsTable } from './lib/checkins.js';

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

/**
 * GET /api/seguridad-transporte
 * Lista de todos los que van en bus (va_en_bus=1) — separa quiénes ya
 * pasaron por el punto de control "transporte" (tabla checkins) de
 * quiénes faltan. Punto de control fijo — el bus siempre es el mismo,
 * a diferencia de los ingresos que pueden ser 1/2/3.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const scannerKey = req.headers['x-scanner-key'] as string | undefined;
  const expected   = process.env.SCANNER_SECRET || 'aira-scanner-2026';
  if (scannerKey !== expected) {
    return res.status(401).json({ ok: false, error: 'Sin autorización' });
  }

  try {
    await ensureCheckinsTable(pool);

    const [rows]: any = await pool.query(
      `SELECT r.nombre, r.movil, r.paquete, c.scanned_at
       FROM manual_registros r
       LEFT JOIN checkins c ON c.order_ref = r.order_ref AND c.checkpoint = 'transporte'
       WHERE r.va_en_bus = 1
       ORDER BY (c.scanned_at IS NULL) DESC, r.nombre ASC`
    );

    const faltan   = rows.filter((r: any) => !r.scanned_at);
    const llegaron = rows.filter((r: any) => !!r.scanned_at);

    return res.status(200).json({
      ok: true,
      total: rows.length,
      faltan: faltan.map((r: any) => ({ nombre: r.nombre, movil: r.movil, paquete: r.paquete })),
      llegaron: llegaron.map((r: any) => ({ nombre: r.nombre, movil: r.movil, paquete: r.paquete, hora: r.scanned_at })),
    });
  } catch (err: any) {
    console.error('[seguridad-transporte]', err.message);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
}
