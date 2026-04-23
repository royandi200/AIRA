import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, email } = req.body as { phone?: string; email?: string };
  if (!phone && !email) return res.status(400).json({ error: 'Ingresa tu teléfono o email' });

  try {
    const phoneClean = phone ? String(phone).replace(/\D/g, '') : null;

    const [orders]: any = await pool.query(
      `SELECT o.id, o.order_ref, o.status, o.payment_mode, o.total,
              o.subtotal, o.service_fee, o.pass_vip_total, o.transport_total,
              o.created_at, o.paid_at,
              u.name AS buyer_name, u.email AS buyer_email, u.phone AS buyer_phone,
              e.name AS event_name, e.event_date, e.venue, e.city
       FROM orders o
       JOIN users  u ON u.id = o.user_id
       JOIN events e ON e.id = o.event_id
       WHERE o.status NOT IN ('cancelled','refunded')
         AND (
           ${phoneClean ? `REPLACE(REPLACE(u.phone,' ',''),'+','') LIKE ?` : '1=0'}
           ${email ? `${phoneClean ? 'OR' : ''} u.email = ?` : ''}
         )
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [
        ...(phoneClean ? [`%${phoneClean}%`] : []),
        ...(email      ? [email.trim().toLowerCase()] : []),
      ]
    );

    if (!orders.length) {
      return res.status(404).json({ error: 'No encontramos reservas con ese teléfono o email' });
    }

    // Para cada orden traer items y abonos
    const enriched = await Promise.all(orders.map(async (order: any) => {
      const [items]: any = await pool.query(
        `SELECT oi.id, oi.quantity, oi.unit_price, oi.is_vip, oi.qr_code, oi.qr_generated_at,
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

      return { ...order, items, abonos };
    }));

    return res.status(200).json({ ok: true, orders: enriched });
  } catch (err: any) {
    console.error('[mis-reservas]', err.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}
