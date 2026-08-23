/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { put, del } from '@vercel/blob';
import { optimizarImagen } from './lib/image-optimize.js';

/**
 * /photos — página independiente (usuario/clave compartidos, no OTP) para
 * que el equipo del evento suba fotos/videos sueltos sin pasar por myapp.
 * Reusa exactamente la misma función de optimización que myapp-gallery.ts
 * (sharp -> WebP para imágenes; los videos se guardan tal cual, la
 * duración máxima se valida en el navegador antes de subir, igual que
 * allá — acá el límite es 10s en vez de 6s).
 *
 * Este endpoint (GET/POST/DELETE) requiere login SIEMPRE — es el que usa
 * la propia página /photos para administrar. El sitio público lee la
 * misma tabla a través de api/photos-public.ts (sin login, solo lectura).
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

// Las mismas 5 secciones de "La Experiencia" (ver config.ts galleryImages)
// + null/vacío para "sin clasificar". Lobby se renombró a Joinn Stage acá
// también, a pedido — mismo criterio que Japi/AIRA Stage en el resto del sitio.
export const CATEGORIES = ['AIRA Stage', 'Japi Stage', 'Cabañas', 'Majestic', 'Joinn Stage'] as const;

export async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS photos_uploads (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      uploaded_by   VARCHAR(100) NOT NULL,
      uploaded_name VARCHAR(100) NULL,
      file_url      VARCHAR(500) NOT NULL,
      is_video      TINYINT(1)   NOT NULL DEFAULT 0,
      category      VARCHAR(30)  NULL,
      created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // ALTERs separados por si la tabla ya existía de antes de estas columnas.
  // "ADD COLUMN IF NOT EXISTS" no lo soporta esta versión de MySQL/MariaDB
  // — el ALTER completo fallaba por sintaxis, el .catch lo tragaba, y la
  // columna nunca se creaba (aunque el SELECT sí la pedía -> 500 "Unknown
  // column"). Plain ADD COLUMN + catch: si ya existe, el error es
  // "Duplicate column" y se ignora igual; si es otro error, se ignora
  // también a propósito porque esto corre en cada request y no puede
  // tumbar el endpoint por una migración que ya se aplicó antes.
  await pool.query(`ALTER TABLE photos_uploads ADD COLUMN category VARCHAR(30) NULL`).catch(() => {});
  await pool.query(`ALTER TABLE photos_uploads ADD COLUMN uploaded_name VARCHAR(100) NULL`).catch(() => {});
}

/** Credenciales compartidas (no hay tabla de usuarios acá, a propósito —
 * es una herramienta interna del equipo, no una cuenta por asistente). */
function checkAuth(req: VercelRequest): string | null {
  const user = String(req.headers['x-photos-user'] || req.query.user || '');
  const pass = String(req.headers['x-photos-pass'] || req.query.pass || '');
  const expectedUser = process.env.PHOTOS_USER;
  const expectedPass = process.env.PHOTOS_PASSWORD;
  if (!expectedUser || !expectedPass) return null;
  if (user !== expectedUser || pass !== expectedPass) return null;
  return user;
}

/** Lee el body completo del request como Buffer (máx limitBytes) */
function readBody(req: VercelRequest, limitBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > limitBytes) { req.destroy(); reject(new Error(`Archivo demasiado grande (máx ${Math.round(limitBytes / 1024 / 1024)}MB)`)); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-photos-user, x-photos-pass, x-photos-category, x-photos-name');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensureTable();

    const user = checkAuth(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Usuario o clave incorrectos' });

    // ── GET — listar lo subido + confirmar login ────────────────────────
    if (req.method === 'GET') {
      const [rows]: any = await pool.query(
        `SELECT id, uploaded_by, uploaded_name, file_url, is_video, category, created_at FROM photos_uploads ORDER BY created_at DESC LIMIT 300`
      );
      return res.status(200).json({ ok: true, photos: rows, categories: CATEGORIES });
    }

    // ── POST — subir foto o video ────────────────────────────────────────
    if (req.method === 'POST') {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({ ok: false, error: 'BLOB_READ_WRITE_TOKEN no configurado en Vercel' });
      }

      // Sección elegida en el picker de después de subir — 'Sin clasificar'
      // (o cualquier valor no reconocido) se guarda como NULL.
      const categoryRaw = String(req.headers['x-photos-category'] || req.query.category || '');
      const category = (CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : null;
      // Nombre a mostrar cuando alguien abre la foto en el sitio.
      const uploadedName = String(req.headers['x-photos-name'] || req.query.name || '').trim().slice(0, 100) || null;

      const contentTypeHeader = String(req.headers['content-type'] || 'image/jpeg');
      const isVideo = contentTypeHeader.startsWith('video/');
      // Un clip de hasta 10s a resolución de celular normalmente pesa entre
      // 5-25MB — se deja margen de sobra sin arriesgar el límite de
      // payload de la función serverless.
      const original = await readBody(req, isVideo ? 40 * 1024 * 1024 : 20 * 1024 * 1024);
      if (!original.length) return res.status(400).json({ ok: false, error: 'Archivo vacío' });

      let buffer = original;
      let contentType = contentTypeHeader;

      if (!isVideo) {
        try {
          const optimizada = await optimizarImagen(original);
          buffer = optimizada.buffer;
          contentType = optimizada.contentType;
        } catch (optErr: any) {
          console.warn('[photos] optimización falló, se sube el original:', optErr.message);
        }
      }

      const ext = isVideo
        ? (contentType.includes('webm') ? 'webm' : contentType.includes('quicktime') ? 'mov' : 'mp4')
        : contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';
      const { url } = await put(`photos/${user}-${Date.now()}.${ext}`, buffer, {
        access: 'public',
        contentType,
        addRandomSuffix: true,
      });

      await pool.query(
        `INSERT INTO photos_uploads (uploaded_by, uploaded_name, file_url, is_video, category) VALUES (?, ?, ?, ?, ?)`,
        [user, uploadedName, url, isVideo ? 1 : 0, category]
      );

      return res.status(200).json({ ok: true, url, bytesAntes: original.length, bytesDespues: buffer.length });
    }

    // ── DELETE — con `id` borra solo esa foto; sin `id` (el botón
    // "Borrar fotos anteriores") limpia TODO lo subido hasta ahora. ──
    if (req.method === 'DELETE') {
      const id = (req.body as any)?.id ?? req.query.id;
      if (id) {
        const [rows]: any = await pool.query(`SELECT id, file_url FROM photos_uploads WHERE id = ?`, [id]);
        if (!rows.length) return res.status(404).json({ ok: false, error: 'No existe esa foto' });
        await del(rows[0].file_url).catch(() => {});
        await pool.query(`DELETE FROM photos_uploads WHERE id = ?`, [id]);
        return res.status(200).json({ ok: true, deleted: 1 });
      }

      const [rows]: any = await pool.query(`SELECT id, file_url FROM photos_uploads`);
      for (const row of rows) {
        await del(row.file_url).catch(() => {});
      }
      await pool.query(`DELETE FROM photos_uploads`);
      return res.status(200).json({ ok: true, deleted: rows.length });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[photos]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Error interno' });
  }
}
