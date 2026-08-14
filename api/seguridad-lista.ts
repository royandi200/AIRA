/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { ensureQrUsedColumn } from './lib/ensure-qr-used-column.js';

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
 * GET /api/seguridad-lista
 * Lista general de TODOS los registrados (no solo transporte) — separa
 * quiénes ya escanearon su QR en la puerta de quiénes faltan.
 * Requiere header x-scanner-key, mismo candado que validate-qr.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const scannerKey = req.headers['x-scanner-key'] as string | undefined;
  const expected   = process.env.SCANNER_SECRET || 'aira-scanner-2026';
  if (scannerKey !== expected) {
    return res.status(401).json({ ok: false, error: 'Sin autorización' });
  }

  try {
    await ensureQrUsedColumn(pool);
    const [rows]: any = await pool.query(
      `SELECT nombre, movil, paquete, monto_pendiente, va_en_bus, qr_used_at
       FROM manual_registros
       ORDER BY (qr_used_at IS NULL) DESC, nombre ASC`
    );

    const map = (r: any) => ({
      nombre: r.nombre,
      movil: r.movil,
      paquete: r.paquete,
      pendiente: Number(r.monto_pendiente || 0) > 0,
      vaEnBus: !!r.va_en_bus,
      hora: r.qr_used_at,
    });

    const faltan   = rows.filter((r: any) => !r.qr_used_at).map(map);
    const llegaron = rows.filter((r: any) => !!r.qr_used_at).map(map);

    return res.status(200).json({ ok: true, total: rows.length, faltan, llegaron });
  } catch (err: any) {
    console.error('[seguridad-lista]', err.message);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
}
