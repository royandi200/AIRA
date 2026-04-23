import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, email } = req.body as { phone?: string; email?: string };
  if (!phone && !email) return res.status(400).json({ error: 'Ingresa tu teléfono o email' });

  try {
    let orders: any[] = [];

    if (phone) {
      const phoneClean = String(phone).replace(/\D/g, '');
      if (phoneClean.length >= 7) {
        const [rows]: any = await pool.query(
          `SELECT o.id, o.order_ref, o.status, o.payment_mode, o.total,
                  o.created_at, o.paid_at,
                  u.name AS buyer_name, u.email AS buyer_email, u.phone AS buyer_phone,
                  e.name AS event_name, e.event_date, e.venue, e.city
           FROM orders o
           JOIN users u ON u.id = o.user_id
           JOIN events e ON e.id = o.event_id
           WHERE o.status NOT IN ('cancelled','refunded')
             AND REPLACE(REPLACE(u.phone, ' ', ''), '+', '') LIKE ?
           ORDER BY o.created_at DESC LIMIT 10`,
          [`%${phoneClean}%`]
        );
        orders = Array.isArray(rows) ? rows : [];
      }
    }

    if (orders.length === 0 && email) {
      const [rows]: any = await pool.query(
        `SELECT o.id, o.order_ref, o.status, o.payment_mode, o.total,
                o.created_at, o.paid_at,
                u.name AS buyer_name, u.email AS buyer_email, u.phone AS buyer_phone,
                e.name AS event_name, e.event_date, e.venue, e.city
         FROM orders o
         JOIN users u ON u.id = o.user_id
         JOIN events e ON e.id = o.event_id
         WHERE o.status NOT IN ('cancelled','refunded')
           AND LOWER(u.email) = LOWER(?)
         ORDER BY o.created_at DESC LIMIT 10`,
        [email.trim()]
      );
      orders = Array.isArray(rows) ? rows : [];
    }

    if (!orders.length) {
      return res.status(404).json({ error: 'No encontramos reservas con ese teléfono o email' });
    }

    const enriched = await Promise.all(orders.map(async (order: any) => {
      const [items]: any = await pool.query(
        `SELECT oi.id, oi.quantity, oi.unit_price, oi.is_vip, oi.qr_code,
                tt.name AS ticket_name, tt.stage_label
         FROM order_items oi
         JOIN ticket_types tt ON tt.id = oi.ticket_type_id
         WHERE oi.order_id = ?`,
        [order.id]
      );

      const [abonos]: any = await pool.query(
        `SELECT ap.cuota_number, ap.amount, ap.due_date, ap.status, ap.paid_at,
                pl.label AS plan_label, pl.cuotas AS total_cuotas
         FROM abono_payments ap
         JOIN abono_plans pl ON pl.id = ap.abono_plan_id
         WHERE ap.order_id = ?
         ORDER BY ap.cuota_number`,
        [order.id]
      );

      return {
        ...order,
        items:  Array.isArray(items)  ? items  : [],
        abonos: Array.isArray(abonos) ? abonos : [],
      };
    }));

    return res.status(200).json({ ok: true, orders: enriched });

  } catch (err: any) {
    console.error('[mis-reservas] ERROR:', err.message);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
}
