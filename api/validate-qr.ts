/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';

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
 * GET /api/validate-qr?token=abc123
 * Endpoint del scanner de puerta. Valida el QR y lo marca como usado.
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

  // Columna qr_used_at — idempotente, mismo patrón que el resto del código
  await pool.query(`
    ALTER TABLE manual_registros ADD COLUMN IF NOT EXISTS qr_used_at DATETIME NULL
  `).catch(() => { /* columna ya existe */ });

  const [[registro]]: any = await pool.query(
    `SELECT id, order_ref, nombre, movil, qr_token, qr_used_at, monto_pendiente, paquete
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

  if (registro.qr_used_at) {
    const usedAt = new Date(registro.qr_used_at).toLocaleString('es-CO');
    return res.status(200).json({
      valid: false, color: 'orange',
      message: `⚠️ QR ya usado — ${registro.nombre}\nEscaneado: ${usedAt}`,
    });
  }

  // Marcar como usado
  await pool.query(
    'UPDATE manual_registros SET qr_used_at = NOW() WHERE id = ?',
    [registro.id]
  );

  return res.status(200).json({
    valid: true,
    color: 'green',
    message: `✅ ACCESO VÁLIDO`,
    name:    registro.nombre,
    ref:     registro.order_ref,
    paquete: registro.paquete,
    phone:   registro.movil,
  });
}
