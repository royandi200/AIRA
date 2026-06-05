/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const adminHeader    = req.headers['x-admin-token'];
  const promotorHeader = req.headers['x-promotor-token'];
  if (adminHeader === adminToken) return true;
  // Promotor token: 'REF:CODIGO' — válido para operaciones de registro
  if (typeof promotorHeader === 'string' && promotorHeader.startsWith('REF:')) return true;
  return false;
}

function genRef() {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AIRA-M-${ts}-${rnd}`;
}

async function ensureTables(conn: mysql.Pool | mysql.PoolConnection) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS manual_registros (
      id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_ref       VARCHAR(50)  NOT NULL UNIQUE,
      nombre          VARCHAR(200) NOT NULL,
      cedula          VARCHAR(50)  NOT NULL,
      movil           VARCHAR(30)  NULL,
      email           VARCHAR(200) NULL,
      evento_id       INT UNSIGNED NULL,
      paquete         VARCHAR(100) NULL,
      monto_total     DECIMAL(12,2) NOT NULL DEFAULT 0,
      monto_recibido  DECIMAL(12,2) NOT NULL DEFAULT 0,
      monto_pendiente DECIMAL(12,2) NOT NULL DEFAULT 0,
      medio_pago      VARCHAR(50)  NULL,
      fecha_pago      DATE         NULL,
      notas           TEXT         NULL,
      codigo_referido VARCHAR(50)  NULL,
      qr_token        VARCHAR(40)  NULL,
      created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const alterCols = [
    `ALTER TABLE manual_registros ADD COLUMN IF NOT EXISTS codigo_referido VARCHAR(50) NULL`,
    `ALTER TABLE manual_registros ADD COLUMN IF NOT EXISTS qr_token        VARCHAR(40) NULL`,
    `ALTER TABLE manual_registros ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP`,
  ];
  for (const sql of alterCols) await conn.query(sql).catch(() => {});

  await conn.query(`
    CREATE TABLE IF NOT EXISTS manual_abonos (
      id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      manual_id       INT UNSIGNED NOT NULL,
      order_ref       VARCHAR(50)  NOT NULL,
      monto           DECIMAL(12,2) NOT NULL,
      medio_pago      VARCHAR(50)  NULL,
      fecha_pago      DATE         NULL,
      notas           TEXT         NULL,
      created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_manual_abono FOREIGN KEY (manual_id)
        REFERENCES manual_registros(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS manual_comisiones (
      id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      manual_id       INT UNSIGNED NOT NULL,
      order_ref       VARCHAR(50)  NOT NULL,
      codigo_referido VARCHAR(50)  NOT NULL,
      monto_base      DECIMAL(12,2) NOT NULL,
      porcentaje      DECIMAL(5,2)  NOT NULL DEFAULT 5.00,
      comision        DECIMAL(12,2) NOT NULL,
      pagada          TINYINT(1)    NOT NULL DEFAULT 0,
      created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_manual_comision FOREIGN KEY (manual_id)
        REFERENCES manual_registros(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!auth(req)) return res.status(401).json({ error: 'No autorizado' });

  await ensureTables(pool);

  // ── GET — listar registros con sus abonos ─────────────────────────────
  if (req.method === 'GET') {
    const [rows]: any = await pool.query(`
      SELECT mr.*,
             e.name AS evento_nombre,
             cr.descripcion AS referido_nombre
      FROM   manual_registros mr
      LEFT JOIN events          e  ON e.id   = mr.evento_id
      LEFT JOIN codigos_referido cr ON cr.codigo = mr.codigo_referido
      ORDER BY mr.created_at DESC
      LIMIT 200
    `);

    for (const row of rows) {
      const [abonos]: any = await pool.query(
        'SELECT * FROM manual_abonos WHERE manual_id = ? ORDER BY created_at ASC',
        [row.id]
      );
      row.abonos = abonos;
    }

    return res.json({ ok: true, registros: rows });
  }

  // ── POST — crear registro manual inicial ──────────────────────────────
  if (req.method === 'POST') {
    const {
      nombre, cedula, movil, email, evento_id, paquete,
      monto_total, monto_recibido, medio_pago, fecha_pago,
      notas, codigo_referido,
    } = req.body as Record<string, any>;

    if (!nombre || !cedula)
      return res.status(400).json({ error: 'Nombre y cédula son obligatorios' });

    let codigoRef: string | null = null;
    if (codigo_referido) {
      const cod = String(codigo_referido).toUpperCase().trim();
      const [[ref]]: any = await pool.query(
        'SELECT id, usos_actuales, usos_max, activo FROM codigos_referido WHERE codigo = ?',
        [cod]
      );
      if (!ref)          return res.status(400).json({ error: `Código referido "${cod}" no existe` });
      if (!ref.activo)   return res.status(400).json({ error: `Código referido "${cod}" está inactivo` });
      if (ref.usos_actuales >= ref.usos_max)
        return res.status(400).json({ error: `Código referido "${cod}" ya alcanzó su límite de usos` });
      codigoRef = cod;
    }

    const montoTotal     = Number(monto_total)    || 0;
    const montoRecibido  = Number(monto_recibido) || 0;
    const montoPendiente = montoTotal - montoRecibido;
    const order_ref = genRef();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(`
        INSERT INTO manual_registros
          (order_ref, nombre, cedula, movil, email, evento_id, paquete,
           monto_total, monto_recibido, monto_pendiente,
           medio_pago, fecha_pago, notas, codigo_referido)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
        order_ref, nombre, cedula,
        movil || null, email || null,
        evento_id || null, paquete || null,
        montoTotal, montoRecibido, montoPendiente,
        medio_pago || null, fecha_pago || null,
        notas || null, codigoRef,
      ]);

      const [[inserted]]: any = await conn.query(
        'SELECT id FROM manual_registros WHERE order_ref = ?', [order_ref]
      );

      if (montoRecibido > 0) {
        await conn.query(`
          INSERT INTO manual_abonos (manual_id, order_ref, monto, medio_pago, fecha_pago, notas)
          VALUES (?,?,?,?,?,?)
        `, [inserted.id, order_ref, montoRecibido,
            medio_pago || null, fecha_pago || null, 'Pago inicial']);
      }

      if (codigoRef && montoRecibido > 0) {
        const comision = Math.round(montoRecibido * 0.05 * 100) / 100;
        await conn.query(`
          INSERT INTO manual_comisiones
            (manual_id, order_ref, codigo_referido, monto_base, porcentaje, comision)
          VALUES (?,?,?,?,5.00,?)
        `, [inserted.id, order_ref, codigoRef, montoRecibido, comision]);

        await conn.query(
          `UPDATE codigos_referido
           SET usos_actuales = usos_actuales + 1
           WHERE codigo = ? AND usos_actuales < usos_max`,
          [codigoRef]
        );
      }

      await conn.commit();
      return res.json({ ok: true, order_ref, monto_pendiente: montoPendiente });

    } catch (err: any) {
      await conn.rollback();
      return res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  }

  // ── PUT — editar campos de un registro existente ──────────────────────
  if (req.method === 'PUT') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Falta el parámetro id' });

    const {
      nombre, cedula, movil, email, paquete,
      monto_total, monto_recibido, medio_pago, fecha_pago,
      notas, codigo_referido,
    } = req.body as Record<string, any>;

    if (!nombre || !cedula)
      return res.status(400).json({ error: 'Nombre y cédula son obligatorios' });

    const montoTotal     = Number(monto_total)    || 0;
    const montoRecibido  = Number(monto_recibido) || 0;
    const montoPendiente = Math.max(0, montoTotal - montoRecibido);

    const codigoRef = codigo_referido
      ? String(codigo_referido).toUpperCase().trim() || null
      : null;

    try {
      const [result]: any = await pool.query(`
        UPDATE manual_registros
        SET nombre          = ?,
            cedula          = ?,
            movil           = ?,
            email           = ?,
            paquete         = ?,
            monto_total     = ?,
            monto_recibido  = ?,
            monto_pendiente = ?,
            medio_pago      = ?,
            fecha_pago      = ?,
            notas           = ?,
            codigo_referido = ?,
            updated_at      = NOW()
        WHERE id = ?
      `, [
        nombre,
        cedula,
        movil       || null,
        email       || null,
        paquete     || null,
        montoTotal,
        montoRecibido,
        montoPendiente,
        medio_pago  || null,
        fecha_pago  || null,
        notas       || null,
        codigoRef,
        id,
      ]);

      if (result.affectedRows === 0)
        return res.status(404).json({ error: 'Registro no encontrado' });

      return res.json({ ok: true, monto_pendiente: montoPendiente });

    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PATCH — registrar abono adicional ─────────────────────────────────
  if (req.method === 'PATCH') {
    const { order_ref, monto, medio_pago, fecha_pago, notas } =
      req.body as Record<string, any>;

    if (!order_ref || !monto)
      return res.status(400).json({ error: 'order_ref y monto son obligatorios' });

    const montoAbono = Number(monto);
    if (montoAbono <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0' });

    const [[reg]]: any = await pool.query(
      'SELECT id, monto_total, monto_recibido, monto_pendiente, codigo_referido FROM manual_registros WHERE order_ref = ?',
      [order_ref]
    );
    if (!reg) return res.status(404).json({ error: 'Registro no encontrado' });

    const nuevoRecibido  = Number(reg.monto_recibido)  + montoAbono;
    const nuevoPendiente = Math.max(0, Number(reg.monto_total) - nuevoRecibido);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(`
        INSERT INTO manual_abonos (manual_id, order_ref, monto, medio_pago, fecha_pago, notas)
        VALUES (?,?,?,?,?,?)
      `, [reg.id, order_ref, montoAbono,
          medio_pago || null, fecha_pago || null, notas || null]);

      await conn.query(`
        UPDATE manual_registros
        SET monto_recibido  = ?,
            monto_pendiente = ?,
            updated_at      = NOW()
        WHERE id = ?
      `, [nuevoRecibido, nuevoPendiente, reg.id]);

      let comision_generada = 0;
      if (reg.codigo_referido) {
        comision_generada = Math.round(montoAbono * 0.05 * 100) / 100;
        await conn.query(`
          INSERT INTO manual_comisiones
            (manual_id, order_ref, codigo_referido, monto_base, porcentaje, comision)
          VALUES (?,?,?,?,5.00,?)
        `, [reg.id, order_ref, reg.codigo_referido, montoAbono, comision_generada]);
      }

      await conn.commit();

      return res.json({
        ok: true,
        order_ref,
        monto_abono:      montoAbono,
        monto_recibido:   nuevoRecibido,
        monto_pendiente:  nuevoPendiente,
        pagado_completo:  nuevoPendiente === 0,
        comision_generada,
      });

    } catch (err: any) {
      await conn.rollback();
      return res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  }

  // ── DELETE — eliminar registro ─────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query;
    await pool.query('DELETE FROM manual_registros WHERE id=?', [id]);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
