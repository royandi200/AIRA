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

  const [[order]]: any = await pool.query(
    `SELECT o.id, o.order_ref, o.status, o.qr_token, o.qr_used_at,
            o.add_pass_vip, u.name, u.phone
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.qr_token = ?`,
    [token]
  );

  if (!order) {
    return res.status(200).json({ valid: false, color: 'red', message: '❌ QR inválido — No existe' });
  }

  if (order.status !== 'paid') {
    return res.status(200).json({ valid: false, color: 'red', message: `❌ Pago pendiente — ${order.order_ref}` });
  }

  if (order.qr_used_at) {
    const usedAt = new Date(order.qr_used_at).toLocaleString('es-CO');
    return res.status(200).json({
      valid: false, color: 'orange',
      message: `⚠️ QR ya usado — ${order.name}\nEscaneado: ${usedAt}`,
    });
  }

  // Marcar como usado
  await pool.query(
    'UPDATE orders SET qr_used_at = NOW() WHERE id = ?',
    [order.id]
  );

  return res.status(200).json({
    valid: true,
    color: 'green',
    message: `✅ ACCESO VÁLIDO`,
    name:    order.name,
    ref:     order.order_ref,
    isVip:   !!order.add_pass_vip,
    phone:   order.phone,
  });
}
