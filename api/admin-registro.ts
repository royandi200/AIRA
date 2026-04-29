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
  const token = req.headers['x-admin-token'];
  return token === (process.env.ADMIN_TOKEN || 'aira-admin-2026');
}

function genRef() {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AIRA-M-${ts}-${rnd}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!auth(req)) return res.status(401).json({ error: 'No autorizado' });

  // Ensure table exists always
  await pool.query(`
    CREATE TABLE IF NOT EXISTS manual_registros (
      id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nombre     VARCHAR(200) NOT NULL,
      cedula     VARCHAR(50)  NULL,
      movil      VARCHAR(30)  NULL,
      evento_id  INT UNSIGNED NULL,
      paquete    VARCHAR(100) NULL,
      monto_total     DECIMAL(12,2) NULL,
      monto_recibido  DECIMAL(12,2) NULL,
      monto_pendiente DECIMAL(12,2) NULL,
      medio_pago VARCHAR(50) NULL,
      fecha_pago DATE NULL,
      notas      TEXT NULL,
      order_ref  VARCHAR(50)  NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  // GET — listar registros manuales
  if (req.method === 'GET') {
    const [rows]: any = await pool.query(`
      SELECT mr.*, e.name AS evento_nombre
      FROM manual_registros mr
      LEFT JOIN events e ON e.id = mr.evento_id
      ORDER BY mr.created_at DESC LIMIT 200
    `);
    return res.json({ ok: true, registros: rows });
  }

  // POST — crear registro manual
  if (req.method === 'POST') {
    const {
      nombre, cedula, movil, evento_id, paquete,
      monto_total, monto_recibido, medio_pago, fecha_pago,
      notas,
    } = req.body as Record<string, any>;

    if (!nombre || !cedula) return res.status(400).json({ error: 'Nombre y cédula son obligatorios' });

    const monto_pendiente = (Number(monto_total) || 0) - (Number(monto_recibido) || 0);
    const order_ref       = genRef();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS manual_registros (
        id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_ref       VARCHAR(40)  NOT NULL UNIQUE,
        nombre          VARCHAR(150) NOT NULL,
        cedula          VARCHAR(30)  NOT NULL,
        movil           VARCHAR(30),
        evento_id       INT UNSIGNED,
        monto_total     DECIMAL(12,2) DEFAULT 0,
        monto_recibido  DECIMAL(12,2) DEFAULT 0,
        monto_pendiente DECIMAL(12,2) DEFAULT 0,
        medio_pago      VARCHAR(50),
        fecha_pago      DATE,
        paquete         VARCHAR(100),
        notas           TEXT,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    await pool.query(`
      INSERT INTO manual_registros
        (order_ref, nombre, cedula, movil, evento_id, paquete,
         monto_total, monto_recibido, monto_pendiente,
         medio_pago, fecha_pago, notas)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      order_ref, nombre, cedula, movil || null,
      evento_id || null, paquete || null,
      monto_total || 0, monto_recibido || 0, monto_pendiente,
      medio_pago || null,
      fecha_pago || null,
      notas || null,
    ]);

    return res.json({ ok: true, order_ref });
  }

  // DELETE — eliminar registro
  if (req.method === 'DELETE') {
    const { id } = req.query;
    await pool.query('DELETE FROM manual_registros WHERE id=?', [id]);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
