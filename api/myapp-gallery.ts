/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { put, del } from '@vercel/blob';
import { optimizarImagen } from './lib/image-optimize.js';

/**
 * Galería de fotos subidas por los asistentes ("Pics") — cada quien sube
 * las suyas con su sesión de /myapp, se optimizan a WebP liviano acá
 * mismo (sharp) y se guardan en Vercel Blob. La galería curada (fotos
 * del evento) sigue viviendo en el frontend (GALLERY_ITEMS); esto es
 * solo lo que suben los usuarios, mezclado encima.
 */

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

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS myapp_gallery_photos (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_ref   VARCHAR(50)  NOT NULL,
      nombre      VARCHAR(150) NOT NULL,
      image_url   VARCHAR(500) NOT NULL,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

/** Lee el body completo del request como Buffer (máx limitBytes) */
function readBody(req: VercelRequest, limitBytes = 15 * 1024 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > limitBytes) { req.destroy(); reject(new Error(`Imagen demasiado grande (máx ${limitBytes / 1024 / 1024}MB)`)); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function sessionFromToken(token: string): Promise<{ order_ref: string; name: string } | null> {
  const [rows]: any = await pool.query(
    `SELECT order_ref, name FROM myapp_sessions WHERE token = ? LIMIT 1`,
    [token]
  );
  return rows.length ? rows[0] : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-myapp-token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensureTable();

    // ── GET — listar fotos subidas por asistentes ──────────────────────
    if (req.method === 'GET') {
      const [rows]: any = await pool.query(
        `SELECT id, nombre, image_url, created_at FROM myapp_gallery_photos ORDER BY created_at DESC LIMIT 100`
      );
      return res.status(200).json({ ok: true, photos: rows });
    }

    // ── POST — subir foto (requiere sesión activa) ─────────────────────
    if (req.method === 'POST') {
      const token = String(req.query.token || req.headers['x-myapp-token'] || '');
      if (!token) return res.status(401).json({ ok: false, error: 'Falta sesión' });
      const session = await sessionFromToken(token);
      if (!session) return res.status(401).json({ ok: false, error: 'Sesión inválida' });

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({ ok: false, error: 'BLOB_READ_WRITE_TOKEN no configurado en Vercel' });
      }

      const original = await readBody(req, 20 * 1024 * 1024);
      if (!original.length) return res.status(400).json({ ok: false, error: 'Archivo vacío' });

      let buffer = original;
      let contentType: string = req.headers['content-type'] || 'image/jpeg';
      const isVideo = contentType.startsWith('video/');

      // sharp solo sabe de imágenes — los videos (clips cortos, ya
      // validados en el navegador antes de subir) se guardan tal cual.
      if (!isVideo) {
        try {
          const optimizada = await optimizarImagen(original);
          buffer = optimizada.buffer;
          contentType = optimizada.contentType;
        } catch (optErr: any) {
          console.warn('[myapp-gallery] optimización falló, se sube el original:', optErr.message);
        }
      }

      const ext = isVideo
        ? (contentType.includes('webm') ? 'webm' : contentType.includes('quicktime') ? 'mov' : 'mp4')
        : contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';
      const { url } = await put(`myapp-gallery/${session.order_ref}-${Date.now()}.${ext}`, buffer, {
        access: 'public',
        contentType,
        addRandomSuffix: true,
      });

      await pool.query(
        `INSERT INTO myapp_gallery_photos (order_ref, nombre, image_url) VALUES (?, ?, ?)`,
        [session.order_ref, session.name, url]
      );

      return res.status(200).json({ ok: true, url, bytesAntes: original.length, bytesDespues: buffer.length });
    }

    // ── DELETE — el dueño borra su propia foto ─────────────────────────
    if (req.method === 'DELETE') {
      const token = String(req.query.token || req.headers['x-myapp-token'] || '');
      const { id } = req.body as Record<string, any>;
      if (!token || !id) return res.status(400).json({ ok: false, error: 'Faltan datos' });
      const session = await sessionFromToken(token);
      if (!session) return res.status(401).json({ ok: false, error: 'Sesión inválida' });

      const [rows]: any = await pool.query(
        `SELECT image_url FROM myapp_gallery_photos WHERE id = ? AND order_ref = ? LIMIT 1`,
        [id, session.order_ref]
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: 'No es tu foto o no existe' });

      await pool.query(`DELETE FROM myapp_gallery_photos WHERE id = ?`, [id]);
      await del(rows[0].image_url).catch(() => {});
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[myapp-gallery]', err);
    // TEMPORAL: se ve el error real en la respuesta para diagnosticar el
    // fallo del Blob. Cuando quede funcionando, volver a "Error interno".
    return res.status(500).json({ ok: false, error: `Error interno: ${err?.message || String(err)}` });
  }
}
