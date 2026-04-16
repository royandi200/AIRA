import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { createHmac } from 'crypto';

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 5,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // ── Verificar firma Bold ─────────────────────────────────────
  const signature = req.headers['x-bold-signature'] as string;
  const rawBody = JSON.stringify(req.body);
  const expected = createHmac('sha256', process.env.BOLD_SECRET_KEY || '')
    .update(rawBody)
    .digest('hex');

  if (signature !== expected) {
    console.warn('Bold webhook: firma inválida');
    return res.status(401).json({ error: 'Firma inválida' });
  }

  const { order_id, status, transaction_id } = req.body;

  if (!order_id) return res.status(400).json({ error: 'order_id requerido' });

  const newStatus = status === 'APPROVED' ? 'paid'
    : status === 'REJECTED' ? 'cancelled'
    : 'pending';

  await db.query(
    `UPDATE orders SET status = ?, payment_id = ?, updated_at = NOW() WHERE id = ?`,
    [newStatus, transaction_id || null, order_id]
  );

  console.log(`Order ${order_id} → ${newStatus}`);
  return res.status(200).json({ ok: true });
}
