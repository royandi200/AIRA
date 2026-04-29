/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GET  /api/referidos          → listar todos los códigos
 * POST /api/referidos          → crear código
 * PUT  /api/referidos          → editar código (activar/desactivar, cambiar usos)
 * DELETE /api/referidos?id=N   → eliminar código
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'aira-admin-2026';

function auth(req: VercelRequest) {
  return req.headers['x-admin-token'] === ADMIN_TOKEN;
}

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS codigos_referido (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      codigo        VARCHAR(50)  NOT NULL UNIQUE,
      descripcion   VARCHAR(200) NULL,
      tipo          VARCHAR(30)  NOT NULL DEFAULT 'referidos' COMMENT 'etapa a la que aplica',
      usos_max      INT UNSIGNED NOT NULL DEFAULT 1,
      usos_actuales INT UNSIGNED NOT NULL DEFAULT 0,
      activo        TINYINT(1)   NOT NULL DEFAULT 1,
      creado_por    VARCHAR(100) NULL,
      created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  await ensureTable();

  // ── GET — listar ──────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    if (!auth(req)) return res.status(401).json({ error: 'No autorizado' });
    const [rows]: any = await pool.query(
      `SELECT * FROM codigos_referido ORDER BY created_at DESC`
    );
    return res.status(200).json({ codigos: rows });
  }

  // ── POST — crear ──────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (!auth(req)) return res.status(401).json({ error: 'No autorizado' });
    const { codigo, descripcion, tipo, usos_max, creado_por } = req.body;
    if (!codigo) return res.status(400).json({ error: 'El código es requerido' });

    const codigoUp = String(codigo).toUpperCase().trim().replace(/\s+/g, '-');

    try {
      await pool.query(
        `INSERT INTO codigos_referido (codigo, descripcion, tipo, usos_max, creado_por)
         VALUES (?, ?, ?, ?, ?)`,
        [codigoUp, descripcion || null, tipo || 'referidos', usos_max || 1, creado_por || null]
      );
      const [[created]]: any = await pool.query(
        `SELECT * FROM codigos_referido WHERE codigo = ?`, [codigoUp]
      );
      return res.status(201).json({ ok: true, codigo: created });
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese código ya existe' });
      throw e;
    }
  }

  // ── PUT — editar ──────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    if (!auth(req)) return res.status(401).json({ error: 'No autorizado' });
    const { id, activo, usos_max, descripcion } = req.body;
    if (!id) return res.status(400).json({ error: 'Falta id' });

    await pool.query(
      `UPDATE codigos_referido SET
        activo      = COALESCE(?, activo),
        usos_max    = COALESCE(?, usos_max),
        descripcion = COALESCE(?, descripcion)
       WHERE id = ?`,
      [activo ?? null, usos_max ?? null, descripcion ?? null, id]
    );
    const [[updated]]: any = await pool.query(
      `SELECT * FROM codigos_referido WHERE id = ?`, [id]
    );
    return res.status(200).json({ ok: true, codigo: updated });
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!auth(req)) return res.status(401).json({ error: 'No autorizado' });
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Falta id' });
    await pool.query(`DELETE FROM codigos_referido WHERE id = ?`, [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
