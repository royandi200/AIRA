/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { ensureTable } from './photos.js';

/**
 * Lectura pública (sin login) de lo subido en /photos — la usa el sitio
 * principal (ParallaxGallery: sección "Galería" con las sin clasificar,
 * y cada zona de "La Experiencia" con las de su categoría). Separado de
 * api/photos.ts a propósito: ese sí exige usuario/clave siempre porque
 * también sirve para subir/borrar, esto es de solo lectura.
 */

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    await ensureTable();
    const [rows]: any = await pool.query(
      `SELECT id, uploaded_name, file_url, is_video, category, created_at
       FROM photos_uploads ORDER BY created_at DESC LIMIT 500`
    );
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ ok: true, photos: rows });
  } catch (err: any) {
    console.error('[photos-public]', err);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
}
