/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host:            process.env.DB_HOST,
  user:            process.env.DB_USER,
  password:        process.env.DB_PASS,
  database:        process.env.DB_NAME,
  port:            Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  ssl:             { rejectUnauthorized: false },
});

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'aira-admin-2026';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: 'No autorizado' });

  try {
    // Auto-create table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS codigos_referido (
        id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo        VARCHAR(50)  NOT NULL UNIQUE,
        descripcion   VARCHAR(200) NULL,
        tipo          VARCHAR(30)  NOT NULL DEFAULT 'referidos',
        usos_max      INT UNSIGNED NOT NULL DEFAULT 1,
        usos_actuales INT UNSIGNED NOT NULL DEFAULT 0,
        activo        TINYINT(1)   NOT NULL DEFAULT 1,
        created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // GET — listar
    if (req.method === 'GET') {
      try {
        const [rows]: any = await pool.query(
          'SELECT * FROM codigos_referido ORDER BY created_at DESC'
        );
        return res.status(200).json({ ok: true, codigos: rows });
      } catch {
        // Table might not exist yet
        return res.status(200).json({ ok: true, codigos: [] });
      }
    }

    // POST — crear
    if (req.method === 'POST') {
      const { codigo, descripcion, tipo, usos_max } = req.body || {};
      if (!codigo) return res.status(400).json({ error: 'El código es requerido' });
      const cod = String(codigo).toUpperCase().trim().replace(/\s+/g, '-');
      try {
        await pool.query(
          'INSERT INTO codigos_referido (codigo, descripcion, tipo, usos_max) VALUES (?,?,?,?)',
          [cod, descripcion || null, tipo || 'referidos', Number(usos_max) || 1]
        );
        const [[created]]: any = await pool.query(
          'SELECT * FROM codigos_referido WHERE codigo = ?', [cod]
        );
        return res.status(201).json({ ok: true, codigo: created });
      } catch (e: any) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese código ya existe' });
        throw e;
      }
    }

    // PUT — editar
    if (req.method === 'PUT') {
      const { id, activo, usos_max, descripcion } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Falta id' });
      const sets: string[] = [];
      const vals: any[]    = [];
      if (activo    !== undefined) { sets.push('activo=?');      vals.push(activo); }
      if (usos_max  !== undefined) { sets.push('usos_max=?');    vals.push(usos_max); }
      if (descripcion!==undefined) { sets.push('descripcion=?'); vals.push(descripcion); }
      if (sets.length) {
        vals.push(id);
        await pool.query(`UPDATE codigos_referido SET ${sets.join(',')} WHERE id=?`, vals);
      }
      const [[updated]]: any = await pool.query('SELECT * FROM codigos_referido WHERE id=?', [id]);
      return res.status(200).json({ ok: true, codigo: updated });
    }

    // DELETE
    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Falta id' });
      await pool.query('DELETE FROM codigos_referido WHERE id=?', [id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (e: any) {
    console.error('[referidos]', e.code, e.message);
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
}
