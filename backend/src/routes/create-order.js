/**
 * POST /api/create-order  (alias legacy para TicketReserve.tsx)
 * Combina crear orden + generar preferencia MP en un solo request.
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import db from '../db.js';

const router = Router();

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || '',
});

router.post('/', async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      name, email, phone,
      eventId,
      accessType,
      ticketLabel,
      stageLabel,
      isVip,
      qty,
      addPassVip,
      addTransport,
      total,
      paymentMode,
      abonoPlan,
      primerPago,
    } = req.body;

    // 1. Upsert usuario
    await conn.query(
      `INSERT INTO users (name, email, phone) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone)`,
      [name, email, phone]
    );
    const [[user]] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);

    // 2. Obtener evento (usa el primer evento activo si eventId es string)
    let resolvedEventId = eventId;
    if (!resolvedEventId || isNaN(Number(resolvedEventId))) {
      const [[ev]] = await conn.query("SELECT id FROM events WHERE status = 'active' LIMIT 1");
      resolvedEventId = ev?.id || 1;
    }

    // 3. Crear orden
    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, event_id, total, amount_due, status, payment_mode, abono_plan)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      [user.id, resolvedEventId, total, primerPago, paymentMode, abonoPlan]
    );
    const orderId = orderResult.insertId;

    // 4. Items
    const items = [
      { label: accessType === 'day' ? ticketLabel : `Cabaña AIRA · ${stageLabel}`, qty, type: accessType || 'day' },
    ];
    if (addPassVip)   items.push({ label: 'Pass VIP',   qty, type: 'addon' });
    if (addTransport) items.push({ label: 'Transporte', qty, type: 'addon' });

    for (const item of items) {
      await conn.query(
        `INSERT INTO order_items (order_id, label, quantity, type, qr_code) VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.label, item.qty, item.type, uuidv4()]
      );
    }

    // 5. Preferencia MercadoPago
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const mpItems = items.map((item, i) => ({
      id:         `${orderId}-${i}`,
      title:      item.label,
      quantity:   item.qty,
      unit_price: i === 0
        ? Math.round(primerPago / item.qty)
        : (item.label === 'Pass VIP' ? 500_000 : 150_000),
      currency_id: 'COP',
    }));

    const preference = await new Preference(mp).create({
      body: {
        external_reference: String(orderId),
        items: mpItems,
        payer: { name, email, phone: { number: phone } },
        back_urls: {
          success: `${frontendUrl}/checkout/success?order_id=${orderId}`,
          failure: `${frontendUrl}/checkout/failed?order_id=${orderId}`,
          pending: `${frontendUrl}/checkout/pending?order_id=${orderId}`,
        },
        auto_return:      'approved',
        notification_url: `${process.env.BACKEND_URL || 'https://api.airaevents.co'}/api/payments/webhook`,
        statement_descriptor: 'AIRA EVENTS',
      },
    });

    await conn.query('UPDATE orders SET payment_id = ? WHERE id = ?', [preference.id, orderId]);
    await conn.commit();

    res.json({
      orderId,
      preferenceId: preference.id,
      paymentUrl:   preference.init_point,       // producción
      sandboxUrl:   preference.sandbox_init_point, // TEST
    });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

export default router;
