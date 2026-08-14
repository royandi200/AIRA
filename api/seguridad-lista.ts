/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { ensureCheckinsTable, CHECKPOINT_IDS } from './lib/checkins.js';

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
 * GET /api/seguridad-lista?checkpoint=ingreso
 * Lista general de TODOS los registrados para UN punto de control
 * específico — separa quiénes ya escanearon ahí de quiénes faltan.
 * Cada punto de control lleva su propia lista (tabla checkins).
 * Requiere header x-scanner-key, mismo candado que validate-qr.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const scannerKey = req.headers['x-scanner-key'] as string | undefined;
  const expected   = process.env.SCANNER_SECRET || 'aira-scanner-2026';
  if (scannerKey !== expected) {
    return res.status(401).json({ ok: false, error: 'Sin autorización' });
  }

  const checkpointRaw = req.query.checkpoint as string | undefined;
  const checkpoint = checkpointRaw && CHECKPOINT_IDS.includes(checkpointRaw) ? checkpointRaw : 'ingreso';
  // Puntos de control de transporte: solo tiene sentido mostrar gente que
  // efectivamente va en bus, no a todo el mundo.
  const onlyBus = checkpoint.startsWith('transporte');

  try {
    await ensureCheckinsTable(pool);

    const [rows]: any = await pool.query(
      `SELECT r.nombre, r.movil, r.paquete, r.monto_pendiente, r.va_en_bus, c.scanned_at
       FROM manual_registros r
       LEFT JOIN checkins c ON c.order_ref = r.order_ref AND c.checkpoint = ?
       ${onlyBus ? 'WHERE r.va_en_bus = 1' : ''}
       ORDER BY (c.scanned_at IS NULL) DESC, r.nombre ASC`,
      [checkpoint]
    );

    const map = (r: any) => ({
      nombre: r.nombre,
      movil: r.movil,
      paquete: r.paquete,
      pendiente: Number(r.monto_pendiente || 0) > 0,
      vaEnBus: !!r.va_en_bus,
      hora: r.scanned_at,
    });

    const faltan   = rows.filter((r: any) => !r.scanned_at).map(map);
    const llegaron = rows.filter((r: any) => !!r.scanned_at).map(map);

    return res.status(200).json({ ok: true, total: rows.length, faltan, llegaron });
  } catch (err: any) {
    console.error('[seguridad-lista]', err.message);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
}
