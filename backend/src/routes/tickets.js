import { Router } from 'express';
import QRCode from 'qrcode';
import db from '../db.js';

const router = Router();

// GET /api/tickets/qr/:code — genera imagen QR para la boleta
router.get('/qr/:code', async (req, res, next) => {
  try {
    const [[item]] = await db.query(
      `SELECT oi.*, o.status, o.event_id,
              u.name, u.email,
              e.name AS event_name, e.date AS event_date, e.venue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN users u ON u.id = o.user_id
       JOIN events e ON e.id = o.event_id
       WHERE oi.qr_code = ?`,
      [req.params.code]
    );

    if (!item) return res.status(404).json({ error: 'Boleta no encontrada' });
    if (item.status !== 'paid') return res.status(403).json({ error: 'Pago pendiente' });

    const qrData = JSON.stringify({
      id:    item.qr_code,
      event: item.event_name,
      date:  item.event_date,
      label: item.label,
      qty:   item.quantity,
      name:  item.name,
    });

    const qrBuffer = await QRCode.toBuffer(qrData, {
      type:  'png',
      width: 400,
      color: { dark: '#000000', light: '#ffffff' },
    });

    res.set('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (e) { next(e); }
});

// GET /api/tickets/validate/:code — validar boleta en puerta
router.get('/validate/:code', async (req, res, next) => {
  try {
    const [[item]] = await db.query(
      `SELECT oi.*, o.status, u.name, u.email,
              e.name AS event_name, e.date AS event_date, e.venue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN users u ON u.id = o.user_id
       JOIN events e ON e.id = o.event_id
       WHERE oi.qr_code = ?`,
      [req.params.code]
    );

    if (!item) return res.status(404).json({ valid: false, reason: 'Boleta no encontrada' });

    if (item.status !== 'paid')
      return res.json({ valid: false, reason: 'Pago pendiente o cancelado' });

    if (item.used_at)
      return res.json({ valid: false, reason: 'Boleta ya usada', used_at: item.used_at });

    // Marcar como usada
    await db.query(
      'UPDATE order_items SET used_at = NOW() WHERE qr_code = ?',
      [req.params.code]
    );

    res.json({
      valid:      true,
      name:       item.name,
      email:      item.email,
      event:      item.event_name,
      date:       item.event_date,
      venue:      item.venue,
      label:      item.label,
      quantity:   item.quantity,
    });
  } catch (e) { next(e); }
});

export default router;
