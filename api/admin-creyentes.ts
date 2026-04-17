/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * /api/admin-creyentes
 *
 * GET    ?action=list              → listar todos
 * POST   { action:'add',    phone, nombre?, notas? }  → agregar
 * POST   { action:'remove', phone }                   → desactivar
 * POST   { action:'toggle', phone }                   → activar/desactivar
 * POST   { action:'bulk',   phones: string[] }        → agregar varios a la vez
 *
 * Requiere header: x-admin-key = ADMIN_SECRET env var
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';

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

function clean(phone: string): string {
  return String(phone).replace(/\D/g, '');
}

function auth(req: VercelRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return true; // si no hay secret configurado, permite (útil en dev)
  return req.headers['x-admin-key'] === secret;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!auth(req)) return res.status(401).json({ error: 'No autorizado' });

  // ── GET: listar ──────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const [rows]: any = await pool.query(
      `SELECT id, phone, nombre, notas, activo, created_at
       FROM creyentes_whitelist ORDER BY created_at DESC`
    );
    return res.status(200).json({ ok: true, total: rows.length, creyentes: rows });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, phone, nombre, notas, phones } = req.body as Record<string, any>;

  // ── ADD: agregar uno ─────────────────────────────────────────────────────
  if (action === 'add') {
    if (!phone) return res.status(400).json({ error: 'phone requerido' });
    const p = clean(phone);
    await pool.query(
      `INSERT INTO creyentes_whitelist (phone, nombre, notas, activo)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE activo = 1, nombre = COALESCE(?, nombre), notas = COALESCE(?, notas)`,
      [p, nombre ?? null, notas ?? null, nombre ?? null, notas ?? null]
    );
    return res.status(200).json({ ok: true, message: `${p} agregado a Creyentes` });
  }

  // ── BULK: agregar varios ─────────────────────────────────────────────────
  if (action === 'bulk') {
    if (!Array.isArray(phones) || !phones.length)
      return res.status(400).json({ error: 'phones[] requerido' });
    let added = 0;
    for (const ph of phones) {
      const p = clean(String(ph));
      if (p.length < 7) continue;
      await pool.query(
        `INSERT INTO creyentes_whitelist (phone, activo) VALUES (?, 1)
         ON DUPLICATE KEY UPDATE activo = 1`,
        [p]
      );
      added++;
    }
    return res.status(200).json({ ok: true, message: `${added} números agregados` });
  }

  // ── REMOVE: desactivar ───────────────────────────────────────────────────
  if (action === 'remove') {
    if (!phone) return res.status(400).json({ error: 'phone requerido' });
    const p = clean(phone);
    await pool.query(`UPDATE creyentes_whitelist SET activo = 0 WHERE phone = ?`, [p]);
    return res.status(200).json({ ok: true, message: `${p} desactivado` });
  }

  // ── TOGGLE: cambiar estado ───────────────────────────────────────────────
  if (action === 'toggle') {
    if (!phone) return res.status(400).json({ error: 'phone requerido' });
    const p = clean(phone);
    await pool.query(
      `UPDATE creyentes_whitelist SET activo = IF(activo=1,0,1) WHERE phone = ?`, [p]
    );
    const [rows]: any = await pool.query(
      `SELECT activo FROM creyentes_whitelist WHERE phone = ?`, [p]
    );
    const estado = rows[0]?.activo ? 'activo' : 'inactivo';
    return res.status(200).json({ ok: true, message: `${p} ahora ${estado}` });
  }

  return res.status(400).json({ error: 'action inválida. Usa: add | remove | toggle | bulk | list' });
}
