/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

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
 * Endpoint del dashboard admin de /myapp-admin — a propósito LIVIANO:
 * el PUT/PATCH de acá SOLO toca `paquete` y/o `va_en_bus`, nunca
 * monto_total/monto_recibido/monto_pendiente. El PUT del admin del sitio
 * principal (api/admin-registro.ts) recalcula esos montos siempre que
 * guardas, lo que podría des-bloquear sin querer un QR que dejamos
 * candado a propósito (los "$1" de los casos ambiguos del import) —
 * reusar ese endpoint para simples arrastres de cabaña era el riesgo.
 *
 * El POST sí crea registros completos (nombre, cédula, paquete, montos,
 * QR) — mismo esquema de order_ref/qr_token que api/admin-registro.ts,
 * pero con un guardrail que ese endpoint no tiene: rechaza el registro
 * si el móvil (últimos 10 dígitos, el mismo criterio del login) ya
 * existe en otra fila. Esto es exactamente el bug que causó el
 * duplicado de "Paoline Huertas" (id 151 vs 159) — una fila nueva con
 * el mismo teléfono en vez de actualizar la que ya existía.
 */
function genRef() {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AIRA-ADM-${ts}-${rnd}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'] as string | undefined;
  const expected = process.env.MYAPP_ADMIN_KEY || 'aira-admin-2026';
  if (adminKey !== expected) {
    return res.status(401).json({ ok: false, error: 'Sin autorización' });
  }

  if (req.method === 'GET') {
    try {
      const [rows]: any = await pool.query(
        `SELECT id, order_ref, nombre, cedula, movil, paquete, monto_pendiente, va_en_bus, qr_token
         FROM manual_registros
         ORDER BY nombre ASC`
      );
      return res.status(200).json({ ok: true, registros: rows });
    } catch (err: any) {
      console.error('[myapp-admin-registros]', err.message);
      return res.status(500).json({ ok: false, error: 'Error interno' });
    }
  }

  if (req.method === 'POST') {
    const { nombre, cedula, movil, paquete, monto_total, monto_recibido, marcarPagado, va_en_bus } = req.body as {
      nombre?: string; cedula?: string; movil?: string; paquete?: string | null;
      monto_total?: number; monto_recibido?: number; marcarPagado?: boolean; va_en_bus?: 0 | 1;
    };
    if (!nombre?.trim() || !cedula?.trim()) {
      return res.status(400).json({ ok: false, error: 'Nombre y cédula son obligatorios' });
    }

    const movilLimpio = (movil || '').replace(/\D/g, '');
    if (movilLimpio) {
      const movilNorm = movilLimpio.slice(-10);
      const [[dup]]: any = await pool.query(
        `SELECT nombre, order_ref FROM manual_registros WHERE RIGHT(REPLACE(movil, ' ', ''), 10) = ? LIMIT 1`,
        [movilNorm]
      );
      if (dup) {
        return res.status(409).json({ ok: false, error: `Ese móvil ya está registrado a nombre de "${dup.nombre}" (${dup.order_ref}) — usa el tablero para editarlo en vez de crear uno nuevo.` });
      }
    }

    const montoTotal     = Number(monto_total) || 0;
    const montoRecibido  = marcarPagado ? montoTotal : (Number(monto_recibido) || 0);
    const montoPendiente = Math.max(0, montoTotal - montoRecibido);
    const order_ref = genRef();
    const qr_token  = crypto.randomBytes(20).toString('hex');

    try {
      await pool.query(
        `INSERT INTO manual_registros
           (order_ref, nombre, cedula, movil, paquete, monto_total, monto_recibido, monto_pendiente, va_en_bus, qr_token)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          order_ref, nombre.trim(), cedula.trim(), movilLimpio || null, paquete || null,
          montoTotal, montoRecibido, montoPendiente, va_en_bus ? 1 : 0, qr_token,
        ]
      );
      return res.status(200).json({
        ok: true,
        registro: {
          order_ref, nombre: nombre.trim(), cedula: cedula.trim(), movil: movilLimpio || null,
          paquete: paquete || null, monto_pendiente: montoPendiente, va_en_bus: va_en_bus ? 1 : 0, qr_token,
        },
      });
    } catch (err: any) {
      console.error('[myapp-admin-registros]', err.message);
      return res.status(500).json({ ok: false, error: 'Error interno' });
    }
  }

  if (req.method === 'PATCH') {
    const { id, paquete, va_en_bus } = req.body as { id?: number; paquete?: string | null; va_en_bus?: 0 | 1 };
    if (!id) return res.status(400).json({ ok: false, error: 'Falta id' });

    const sets: string[] = [];
    const params: any[] = [];
    if (paquete !== undefined)   { sets.push('paquete = ?');   params.push(paquete); }
    if (va_en_bus !== undefined) { sets.push('va_en_bus = ?'); params.push(va_en_bus ? 1 : 0); }
    if (!sets.length) return res.status(400).json({ ok: false, error: 'Nada que actualizar' });

    params.push(id);
    try {
      await pool.query(`UPDATE manual_registros SET ${sets.join(', ')} WHERE id = ?`, params);
      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error('[myapp-admin-registros]', err.message);
      return res.status(500).json({ ok: false, error: 'Error interno' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
