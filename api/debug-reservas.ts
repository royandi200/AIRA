// GET /api/debug-reservas?phone=XXXX — solo para debug, eliminar en producción
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { phone, email } = req.query;
  const log: string[] = [];

  try {
    log.push('1. Conectando a BD...');
    const [test]: any = await pool.query('SELECT 1 AS ok');
    log.push(`2. BD OK: ${JSON.stringify(test[0])}`);

    if (phone) {
      const phoneClean = String(phone).replace(/\D/g, '');
      log.push(`3. Buscando phone: ${phoneClean}`);
      const [rows]: any = await pool.query(
        `SELECT o.id, o.order_ref, u.phone FROM orders o
         JOIN users u ON u.id = o.user_id
         WHERE REPLACE(REPLACE(u.phone,' ',''),'+','') LIKE ?
         LIMIT 5`,
        [`%${phoneClean}%`]
      );
      log.push(`4. Resultados: ${JSON.stringify(rows)}`);
    }

    if (email) {
      log.push(`3. Buscando email: ${email}`);
      const [rows]: any = await pool.query(
        `SELECT o.id, o.order_ref, u.email FROM orders o
         JOIN users u ON u.id = o.user_id
         WHERE LOWER(u.email) = LOWER(?) LIMIT 5`,
        [email]
      );
      log.push(`4. Resultados: ${JSON.stringify(rows)}`);
    }

    return res.status(200).json({ ok: true, log });
  } catch (err: any) {
    log.push(`ERROR: ${err.message}`);
    return res.status(500).json({ ok: false, log, error: err.message });
  }
}
