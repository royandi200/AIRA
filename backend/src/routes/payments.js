import { Router } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import db from '../db.js';
import { sendTicketEmail } from '../services/mailer.js';

const router = Router();

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || '',
});

// POST /api/payments/create-preference
// Recibe orderId, crea preferencia MP y devuelve la URL de pago
router.post('/create-preference', async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const [[order]] = await db.query(
      `SELECT o.*, u.name, u.email, u.phone,
              e.name AS event_name, e.date AS event_date, e.venue
       FROM orders o
       JOIN users u ON u.id = o.user_id
       JOIN events e ON e.id = o.event_id
       WHERE o.id = ?`,
      [orderId]
    );
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

    const [items] = await db.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    );

    const preferenceItems = items.map(item => ({
      id:          String(item.id),
      title:       item.label,
      quantity:    item.quantity,
      unit_price:  Math.round(order.amount_due / items.reduce((s, i) => s + i.quantity, 0)),
      currency_id: 'COP',
    }));

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const preference = await new Preference(mp).create({
      body: {
        external_reference: String(orderId),
        items: preferenceItems,
        payer: {
          name:  order.name,
          email: order.email,
          phone: { number: order.phone },
        },
        payment_methods: {
          excluded_payment_types: [],
          installments: 1,
        },
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

    // Guardar preference_id en la orden
    await db.query(
      'UPDATE orders SET payment_id = ? WHERE id = ?',
      [preference.id, orderId]
    );

    res.json({
      preferenceId: preference.id,
      paymentUrl:   preference.init_point,        // producción
      sandboxUrl:   preference.sandbox_init_point, // pruebas
    });
  } catch (e) { next(e); }
});

// POST /api/payments/webhook  — notificaciones de MercadoPago
router.post('/webhook', async (req, res) => {
  try {
    const body = JSON.parse(req.body.toString());

    if (body.type === 'payment') {
      const paymentId = body.data?.id;
      const payment   = await new Payment(mp).get({ id: paymentId });
      const orderId   = payment.external_reference;
      const status    = payment.status; // 'approved' | 'pending' | 'rejected'

      if (status === 'approved') {
        await db.query(
          `UPDATE orders SET status = 'paid', payment_id = ? WHERE id = ?`,
          [paymentId, orderId]
        );
        // Enviar email con boletas
        const [[order]] = await db.query(
          `SELECT o.*, u.name, u.email,
                  e.name AS event_name, e.date AS event_date, e.venue
           FROM orders o
           JOIN users u ON u.id = o.user_id
           JOIN events e ON e.id = o.event_id
           WHERE o.id = ?`,
          [orderId]
        );
        const [items] = await db.query(
          'SELECT * FROM order_items WHERE order_id = ?', [orderId]
        );
        await sendTicketEmail({ order, items });
      }

      if (status === 'rejected') {
        await db.query(
          `UPDATE orders SET status = 'cancelled' WHERE id = ?`,
          [orderId]
        );
      }
    }

    res.sendStatus(200);
  } catch (e) {
    console.error('[WEBHOOK ERROR]', e);
    res.sendStatus(500);
  }
});

// GET /api/payments/status/:orderId — consulta manual de estado
router.get('/status/:orderId', async (req, res, next) => {
  try {
    const [[order]] = await db.query(
      'SELECT id, status, total, amount_due FROM orders WHERE id = ?',
      [req.params.orderId]
    );
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(order);
  } catch (e) { next(e); }
});

export default router;
