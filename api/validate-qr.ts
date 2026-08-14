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
 * GET /api/validate-qr?token=abc123&checkpoint=ingreso-1
 * Endpoint del scanner. Valida el QR y lo marca como usado EN ESE PUNTO
 * DE CONTROL específico (tabla checkins) — el mismo QR puede pasar por
 * varios puntos (Transporte, Ingreso 1/2/3) sin bloquearse entre sí.
 * Requiere header x-scanner-key con SCANNER_SECRET para seguridad.
 *
 * Fuente única de verdad: manual_registros (ya no orders/Bold) —
 * decisión operativa: todo asistente se registra ahí de ahora en más.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  // Seguridad básica: el scanner debe enviar la clave
  const scannerKey = req.headers['x-scanner-key'] as string | undefined;
  const expected   = process.env.SCANNER_SECRET || 'aira-scanner-2026';
  if (scannerKey !== expected) {
    return res.status(401).json({ valid: false, error: 'Sin autorización' });
  }

  const token = (req.query.token || req.body?.token) as string | undefined;
  if (!token) return res.status(400).json({ valid: false, error: 'token requerido' });

  const checkpointRaw = (req.query.checkpoint || req.body?.checkpoint) as string | undefined;
  const checkpoint = checkpointRaw && CHECKPOINT_IDS.includes(checkpointRaw) ? checkpointRaw : 'ingreso-1';

  await ensureCheckinsTable(pool);

  const [[registro]]: any = await pool.query(
    `SELECT id, order_ref, nombre, movil, qr_token, monto_pendiente, paquete, va_en_bus
     FROM manual_registros
     WHERE qr_token = ?`,
    [token]
  );

  if (!registro) {
    return res.status(200).json({ valid: false, color: 'red', message: '❌ QR inválido — No existe' });
  }

  const pendiente = Number(registro.monto_pendiente || 0);
  if (pendiente > 0) {
    return res.status(200).json({
      valid: false, color: 'red',
      message: `❌ Saldo pendiente — ${registro.nombre}\nDebe $${pendiente.toLocaleString('es-CO')}`,
    });
  }

  const [[yaEscaneado]]: any = await pool.query(
    `SELECT scanned_at FROM checkins WHERE order_ref = ? AND checkpoint = ? LIMIT 1`,
    [registro.order_ref, checkpoint]
  );
  if (yaEscaneado) {
    const usedAt = new Date(yaEscaneado.scanned_at).toLocaleString('es-CO');
    return res.status(200).json({
      valid: false, color: 'orange',
      message: `⚠️ Ya escaneado acá — ${registro.nombre}\n${usedAt}`,
    });
  }

  // Marcar como usado en ESTE punto de control (no bloquea los demás)
  await pool.query(
    `INSERT INTO checkins (order_ref, checkpoint) VALUES (?, ?)`,
    [registro.order_ref, checkpoint]
  ).catch(() => { /* carrera con otro escaneo simultáneo — el UNIQUE lo protege */ });

  return res.status(200).json({
    valid: true,
    color: 'green',
    message: `✅ ACCESO VÁLIDO`,
    name:    registro.nombre,
    ref:     registro.order_ref,
    paquete: registro.paquete,
    phone:   registro.movil,
    vaEnBus: !!registro.va_en_bus,
  });
}
