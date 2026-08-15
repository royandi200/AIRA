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

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS myapp_push_failures (
      id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_ref    VARCHAR(50)   NULL,
      stage        VARCHAR(40)   NOT NULL,
      error_name   VARCHAR(100)  NULL,
      error_message VARCHAR(500) NULL,
      user_agent   VARCHAR(500)  NULL,
      created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
}

/**
 * POST — el navegador manda acá cuando falla activar notificaciones
 * (permiso, service worker, o pushManager.subscribe). Sin esto, un
 * fallo como "Registration failed - push service error" solo quedaba
 * en la consola del celular de la persona, imposible de ver a
 * distancia. Ahora queda guardado con el motivo, el dispositivo
 * (user-agent) y la hora — GET (protegido con la clave admin) lo lista.
 *
 * No requiere sesión válida a propósito: si el fallo pasa ANTES de que
 * haya token (o el token ya expiró), igual queremos el registro.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensureTable();

    if (req.method === 'POST') {
      const { orderRef, stage, errorName, errorMessage, userAgent } = req.body as {
        orderRef?: string | null; stage?: string; errorName?: string; errorMessage?: string; userAgent?: string;
      };
      await pool.query(
        `INSERT INTO myapp_push_failures (order_ref, stage, error_name, error_message, user_agent)
         VALUES (?, ?, ?, ?, ?)`,
        [
          orderRef || null,
          (stage || 'desconocido').slice(0, 40),
          (errorName || null)?.slice(0, 100) ?? null,
          (errorMessage || null)?.slice(0, 500) ?? null,
          (userAgent || null)?.slice(0, 500) ?? null,
        ]
      );
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      const adminKey = req.headers['x-admin-key'] as string | undefined;
      const expected = process.env.MYAPP_ADMIN_KEY || 'aira-admin-2026';
      if (adminKey !== expected) return res.status(401).json({ ok: false, error: 'Sin autorización' });

      const [rows]: any = await pool.query(
        `SELECT f.id, f.order_ref, f.stage, f.error_name, f.error_message, f.user_agent, f.created_at, r.nombre
         FROM myapp_push_failures f
         LEFT JOIN manual_registros r ON r.order_ref = f.order_ref
         ORDER BY f.created_at DESC
         LIMIT 100`
      );
      return res.status(200).json({ ok: true, failures: rows });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[myapp-push-log-error]', err.message);
    // Nunca debe romper la UX del usuario por fallar el logging en sí
    return res.status(200).json({ ok: false });
  }
}
