/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * POST /api/referidos-validar
 * Body: { codigo: string, tipo?: string }
 * Valida si el código existe, está activo y tiene usos disponibles.
 * NO consume el uso — eso lo hace create-order al confirmar.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { codigo, tipo } = req.body;
  if (!codigo) return res.status(400).json({ valid: false, error: 'Código requerido' });

  const codigoUp = String(codigo).toUpperCase().trim();

  try {
    const [[row]]: any = await pool.query(
      `SELECT * FROM codigos_referido WHERE codigo = ? LIMIT 1`,
      [codigoUp]
    );

    if (!row)          return res.status(404).json({ valid: false, error: 'Código no encontrado' });
    if (!row.activo)   return res.status(400).json({ valid: false, error: 'Código inactivo' });
    if (tipo && row.tipo !== tipo) return res.status(400).json({ valid: false, error: `Código no aplica para esta etapa` });
    if (row.usos_actuales >= row.usos_max)
      return res.status(400).json({ valid: false, error: `Código agotado (${row.usos_max} uso${row.usos_max !== 1 ? 's' : ''} máx.)` });

    return res.status(200).json({
      valid:          true,
      codigo:         row.codigo,
      descripcion:    row.descripcion,
      usos_restantes: row.usos_max - row.usos_actuales,
      usos_max:       row.usos_max,
    });
  } catch (e: any) {
    console.error('[referidos-validar]', e);
    return res.status(500).json({ valid: false, error: 'Error validando código' });
  }
}
