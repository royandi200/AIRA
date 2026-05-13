/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GET  /api/admin-comisiones
 *      ?codigo=PROMO1   → comisiones de un promotor
 *      ?pendientes=1    → solo las no pagadas
 *
 * POST /api/admin-comisiones  { ids: number[] }
 *      Marca comisiones como pagadas
 *
 * Retorna resumen total por promotor (codigo_referido + descripcion + total comision)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASS, database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true, connectionLimit: 5,
  ssl: { rejectUnauthorized: false },
});

function auth(req: VercelRequest) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;
  return req.headers['x-admin-token'] === adminToken;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!auth(req)) return res.status(401).json({ error: 'No autorizado' });

  // ── GET — listar comisiones ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const { codigo, pendientes } = req.query as Record<string, string>;

    let where = '1=1';
    const params: any[] = [];

    if (codigo) {
      where += ' AND mc.codigo_referido = ?';
      params.push(String(codigo).toUpperCase());
    }
    if (pendientes === '1') {
      where += ' AND mc.pagada = 0';
    }

    // Detalle de cada comision
    const [filas]: any = await pool.query(`
      SELECT
        mc.id,
        mc.order_ref,
        mc.codigo_referido,
        cr.descripcion   AS promotor,
        mc.monto_base,
        mc.porcentaje,
        mc.comision,
        mc.pagada,
        mc.created_at,
        mr.nombre        AS cliente,
        mr.cedula        AS cedula_cliente
      FROM   manual_comisiones mc
      JOIN   manual_registros  mr ON mr.id    = mc.manual_id
      LEFT JOIN codigos_referido cr ON cr.codigo = mc.codigo_referido
      WHERE ${where}
      ORDER BY mc.created_at DESC
    `, params);

    // Resumen agrupado por promotor
    const [resumen]: any = await pool.query(`
      SELECT
        mc.codigo_referido,
        cr.descripcion       AS promotor,
        COUNT(*)             AS total_ventas,
        SUM(mc.monto_base)   AS total_vendido,
        SUM(mc.comision)     AS total_comision,
        SUM(IF(mc.pagada=0, mc.comision, 0)) AS comision_pendiente,
        SUM(IF(mc.pagada=1, mc.comision, 0)) AS comision_pagada
      FROM manual_comisiones mc
      LEFT JOIN codigos_referido cr ON cr.codigo = mc.codigo_referido
      GROUP BY mc.codigo_referido
      ORDER BY total_comision DESC
    `);

    return res.json({ ok: true, comisiones: filas, resumen });
  }

  // ── POST — marcar comisiones como pagadas ────────────────────────────────
  if (req.method === 'POST') {
    const { ids } = req.body as { ids?: number[] };
    if (!Array.isArray(ids) || !ids.length)
      return res.status(400).json({ error: 'ids[] es requerido' });

    await pool.query(
      `UPDATE manual_comisiones SET pagada = 1 WHERE id IN (?)`,
      [ids]
    );

    return res.json({ ok: true, actualizadas: ids.length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
