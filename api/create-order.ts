import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, eventId, accessType, ticketLabel, stageLabel, isVip, qty, addPassVip, addTransport, total } = req.body;

  if (!name || !email || !total) {
    return res.status(400).json({ error: 'Faltan campos requeridos: name, email, total' });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // Upsert usuario
    await conn.query(
      `INSERT INTO users (name, email, phone) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone)`,
      [name, email, phone || null]
    );
    const [[user]]: any = await conn.query('SELECT id FROM users WHERE email = ?', [email]);

    // Crear orden pending
    const orderId = randomUUID();
    await conn.query(
      `INSERT INTO orders (id, user_id, event_id, access_type, ticket_label, stage_label, is_vip, qty, add_pass_vip, add_transport, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [orderId, user.id, eventId || null, accessType, ticketLabel || null, stageLabel || null, isVip ? 1 : 0, qty, addPassVip ? 1 : 0, addTransport ? 1 : 0, total]
    );

    // Generar QR codes por boleta
    for (let i = 0; i < qty; i++) {
      await conn.query(
        `INSERT INTO order_items (order_id, qr_code) VALUES (?, ?)`,
        [orderId, randomUUID()]
      );
    }

    await conn.commit();
    conn.release();

    // ── Crear intención de pago en Bold ──────────────────────────
    const boldPayload = {
      amount: {
        currency: 'COP',
        total_amount: Math.round(total),
      },
      payment_method: { type: 'CARD,PSE,NEQUI' },
      order_id: orderId,
      description: `AIRA · ${ticketLabel || stageLabel} · ${qty} persona(s)`,
      redirect_urls: {
        success: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aira.vercel.app'}/checkout/success?order=${orderId}`,
        failure: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aira.vercel.app'}/checkout/failed?order=${orderId}`,
      },
    };

    const boldRes = await fetch('https://api.bold.co/online/link/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `x-api-key ${process.env.BOLD_API_KEY}`,
      },
      body: JSON.stringify(boldPayload),
    });

    const boldData = await boldRes.json();

    if (!boldRes.ok) {
      console.error('Bold error:', boldData);
      return res.status(502).json({ error: 'Error al crear enlace de pago Bold', detail: boldData });
    }

    return res.status(200).json({
      orderId,
      paymentUrl: boldData.url || boldData.payment_url,
    });

  } catch (err: any) {
    await conn.rollback();
    conn.release();
    console.error('DB error:', err);
    return res.status(500).json({ error: err.message });
  }
}
