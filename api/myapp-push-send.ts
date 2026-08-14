/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { ensurePushTable, ensureVapidConfigured, webpush } from './lib/push.js';

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
 * POST /api/myapp-push-send — broadcast a TODOS los asistentes suscritos.
 * Protegido con la misma clave del dashboard admin (x-admin-key). Manda
 * un push real (llega aunque /myapp esté cerrada) vía el service worker
 * de cada navegador; en iOS solo a quienes instalaron la app en su
 * pantalla de inicio — es una limitación de Apple, no de acá.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'] as string | undefined;
  const expected = process.env.MYAPP_ADMIN_KEY || 'aira-admin-2026';
  if (adminKey !== expected) {
    return res.status(401).json({ ok: false, error: 'Sin autorización' });
  }

  // GET — solo para que el panel muestre a cuántos les llegaría el envío
  if (req.method === 'GET') {
    try {
      await ensurePushTable(pool);
      const [rows]: any = await pool.query(`SELECT COUNT(*) as total FROM myapp_push_subscriptions`);
      return res.status(200).json({ ok: true, total: rows[0]?.total ?? 0 });
    } catch (err: any) {
      console.error('[myapp-push-send]', err.message);
      return res.status(500).json({ ok: false, error: 'Error interno' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  if (!ensureVapidConfigured()) {
    return res.status(500).json({ ok: false, error: 'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY no configuradas en Vercel' });
  }

  const { title, body, url } = req.body as { title?: string; body?: string; url?: string };
  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({ ok: false, error: 'Falta título o mensaje' });
  }

  try {
    await ensurePushTable(pool);
    const [rows]: any = await pool.query(`SELECT id, endpoint, p256dh, auth FROM myapp_push_subscriptions`);

    const payload = JSON.stringify({ title: title.trim(), body: body.trim(), url: url?.trim() || '/myapp' });

    let sent = 0;
    let failed = 0;
    const deadIds: number[] = [];

    await Promise.all(rows.map(async (row: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        failed++;
        // 404/410 = el navegador ya no reconoce esa suscripción (app
        // desinstalada, permiso revocado) — se limpia de una vez.
        if (err.statusCode === 404 || err.statusCode === 410) deadIds.push(row.id);
      }
    }));

    if (deadIds.length) {
      await pool.query(`DELETE FROM myapp_push_subscriptions WHERE id IN (${deadIds.map(() => '?').join(',')})`, deadIds);
    }

    return res.status(200).json({ ok: true, sent, failed, total: rows.length, removed: deadIds.length });
  } catch (err: any) {
    console.error('[myapp-push-send]', err.message);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
}
