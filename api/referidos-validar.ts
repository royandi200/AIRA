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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { codigo } = req.body || {};
  if (!codigo) return res.status(400).json({ valid: false, error: 'Código requerido' });

  try {
    const [[row]]: any = await pool.query(
      'SELECT * FROM codigos_referido WHERE codigo=? LIMIT 1',
      [String(codigo).toUpperCase().trim()]
    );
    if (!row)        return res.status(404).json({ valid: false, error: 'Código no encontrado' });
    if (!row.activo) return res.status(400).json({ valid: false, error: 'Código inactivo' });
    if (row.usos_actuales >= row.usos_max)
      return res.status(400).json({ valid: false, error: `Código agotado (máx. ${row.usos_max})` });

    return res.status(200).json({
      valid: true, codigo: row.codigo, descripcion: row.descripcion,
      usos_restantes: row.usos_max - row.usos_actuales,
    });
  } catch (e: any) {
    console.error('[referidos-validar]', e.message);
    return res.status(500).json({ valid: false, error: 'Error validando código' });
  }
}
