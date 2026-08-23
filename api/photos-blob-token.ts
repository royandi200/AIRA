/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import mysql from 'mysql2/promise';
import { ensureTable, CATEGORIES } from './photos.js';

/**
 * Subida VIDEOS: navegador -> Vercel Blob DIRECTO, sin pasar por una
 * función serverless nuestra. Las funciones de Vercel tienen un límite
 * DURO de 4.5MB por request body (no configurable) — un clip de 10s
 * fácil pesa más que eso, así que el flujo viejo (POST con el archivo en
 * el body, api/photos.ts) simplemente fallaba en silencio para casi
 * cualquier video real. Las fotos siguen yendo por api/photos.ts porque
 * se comprimen en el navegador antes de subir (ver Photos.tsx) y casi
 * siempre quedan muy por debajo de 4.5MB.
 *
 * Este endpoint lo llama el SDK @vercel/blob/client dos veces:
 *  1. Desde el navegador, para pedir un token — ahí se valida usuario/
 *     clave (van en clientPayload, no hay otra forma de mandarlos acá).
 *  2. Desde los servidores de Vercel cuando el archivo YA terminó de
 *     subirse directo a Blob — ahí se inserta la fila en la BD (por eso
 *     el insert vive acá y no en Photos.tsx: el navegador nunca nos toca
 *     para el archivo en sí, solo para pedir el token).
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req as any,
      onBeforeGenerateToken: async (_pathname, clientPayloadRaw) => {
        let payload: any = {};
        try { payload = JSON.parse(clientPayloadRaw || '{}'); } catch { /* payload mal formado -> queda vacío, falla el auth abajo */ }
        const { user, pass, category, name } = payload;

        const expectedUser = process.env.PHOTOS_USER;
        const expectedPass = process.env.PHOTOS_PASSWORD;
        if (!expectedUser || !expectedPass || user !== expectedUser || pass !== expectedPass) {
          throw new Error('Usuario o clave incorrectos');
        }

        const safeCategory = (CATEGORIES as readonly string[]).includes(category) ? category : null;
        return {
          allowedContentTypes: ['video/*'],
          addRandomSuffix: true,
          // Mismo tope que antes tenía el body de la función — acá ya no
          // es un límite de plataforma, es solo para no dejar subir algo
          // absurdo por error.
          maximumSizeInBytes: 60 * 1024 * 1024,
          tokenPayload: JSON.stringify({
            user,
            category: safeCategory,
            name: String(name || '').trim().slice(0, 100) || null,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const meta = JSON.parse(tokenPayload || '{}');
        await ensureTable();
        await pool.query(
          `INSERT INTO photos_uploads (uploaded_by, uploaded_name, file_url, is_video, category) VALUES (?, ?, ?, 1, ?)`,
          [meta.user || 'equipo', meta.name || null, blob.url, meta.category || null]
        );
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (err: any) {
    console.error('[photos-blob-token]', err);
    // El SDK reintenta 5 veces si onUploadCompleted no responde 200 —
    // pero un error de auth en onBeforeGenerateToken debe cortar ahí,
    // 400 es lo correcto para eso.
    return res.status(400).json({ error: err?.message || 'Error interno' });
  }
}
