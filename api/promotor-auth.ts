import type { VercelRequest, VercelResponse } from '@vercel/node'
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASS, database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true, connectionLimit: 5,
  ssl: { rejectUnauthorized: false },
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add clave column if missing
  try {
    await pool.query(`ALTER TABLE codigos_referido ADD COLUMN IF NOT EXISTS clave VARCHAR(100) NULL`)
  } catch {}

  if (req.method === 'POST') {
    // Login promotor
    const { codigo, clave } = req.body || {}
    if (!codigo || !clave)
      return res.status(400).json({ error: 'Código y clave son requeridos' })

    const [rows]: any = await pool.query(
      'SELECT * FROM codigos_referido WHERE codigo = ? AND activo = 1 LIMIT 1',
      [String(codigo).toUpperCase().trim()]
    )
    const ref = rows[0]
    if (!ref) return res.status(401).json({ error: 'Código no encontrado o inactivo' })
    if (!ref.clave) return res.status(401).json({ error: 'Este código no tiene clave configurada. Contacta al administrador.' })
    if (ref.clave !== clave.trim())
      return res.status(401).json({ error: 'Clave incorrecta' })

    return res.status(200).json({
      ok: true,
      token: `REF:${ref.codigo}`,
      codigo: ref.codigo,
      descripcion: ref.descripcion,
    })
  }

  if (req.method === 'GET') {
    // Registros del promotor
    const token = req.headers['x-promotor-token'] as string
    if (!token?.startsWith('REF:'))
      return res.status(401).json({ error: 'No autorizado' })

    const codigo = token.replace('REF:', '')
    const [rows]: any = await pool.query(
      `SELECT mr.*, ma.monto as ultimo_abono, ma.medio_pago as ultimo_medio
       FROM manual_registros mr
       LEFT JOIN manual_abonos ma ON ma.manual_id = mr.id
       WHERE mr.codigo_referido = ?
       ORDER BY mr.created_at DESC`,
      [codigo]
    )
    // Deduplicate (left join puede multiplicar filas)
    const seen = new Set()
    const regs = rows.filter((r: any) => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
    return res.status(200).json({ ok: true, registros: regs })
  }

  return res.status(405).end()
}
