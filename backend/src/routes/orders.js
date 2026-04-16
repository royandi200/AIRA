import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = Router();

// POST /api/orders/create  — crear orden pendiente
router.post('/create', async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      name, email, phone,
      eventId,
      accessType,      // 'day' | 'package'
      ticketLabel,     // e.g. 'DÍA 2 VIP'
      stageLabel,      // e.g. '1ª Etapa'
      isVip,
      qty,
      addPassVip,
      addTransport,
      total,
      paymentMode,     // 'full' | 'abono'
      abonoPlan,       // 'a50' | 'a33' | 'a25' | null
      primerPago,
    } = req.body;

    // 1. Upsert usuario
    await conn.query(
      `INSERT INTO users (name, email, phone)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone)`,
      [name, email, phone]
    );
    const [[user]] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);

    // 2. Crear orden
    const [orderResult] = await conn.query(
      `INSERT INTO orders
         (user_id, event_id, total, amount_due, status, payment_mode, abono_plan)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      [user.id, eventId, total, primerPago, paymentMode, abonoPlan]
    );
    const orderId = orderResult.insertId;

    // 3. Items de la orden
    const items = [
      { label: accessType === 'day' ? ticketLabel : `Cabaña AIRA · ${stageLabel}`, qty, type: accessType },
    ];
    if (addPassVip)   items.push({ label: 'Pass VIP',   qty, type: 'addon' });
    if (addTransport) items.push({ label: 'Transporte', qty, type: 'addon' });

    for (const item of items) {
      const qrCode = uuidv4();
      await conn.query(
        `INSERT INTO order_items (order_id, label, quantity, type, qr_code)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.label, item.qty, item.type, qrCode]
      );
    }

    await conn.commit();
    res.json({ orderId, userId: user.id });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

// GET /api/orders/:id  — estado de una orden
router.get('/:id', async (req, res, next) => {
  try {
    const [[order]] = await db.query(
      `SELECT o.*, u.name, u.email, u.phone,
              e.name AS event_name, e.date AS event_date, e.venue
       FROM orders o
       JOIN users u ON u.id = o.user_id
       JOIN events e ON e.id = o.event_id
       WHERE o.id = ?`,
      [req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

    const [items] = await db.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [req.params.id]
    );
    res.json({ ...order, items });
  } catch (e) { next(e); }
});

// GET /api/orders/by-email/:email
router.get('/by-email/:email', async (req, res, next) => {
  try {
    const [orders] = await db.query(
      `SELECT o.id, o.total, o.status, o.created_at,
              e.name AS event_name, e.date AS event_date, e.venue
       FROM orders o
       JOIN users u ON u.id = o.user_id
       JOIN events e ON e.id = o.event_id
       WHERE u.email = ?
       ORDER BY o.created_at DESC`,
      [req.params.email]
    );
    res.json(orders);
  } catch (e) { next(e); }
});

export default router;
