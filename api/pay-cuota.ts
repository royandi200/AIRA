import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderRef } = req.body as { orderRef: string };
  if (!orderRef) return res.status(400).json({ error: 'orderRef requerido' });

  try {
    const [[order]]: any = await pool.query(
      `SELECT o.*, u.name, u.email, u.phone, e.name AS event_name, e.event_date
       FROM orders o
       JOIN users  u ON u.id = o.user_id
       JOIN events e ON e.id = o.event_id
       WHERE o.order_ref = ?`,
      [orderRef]
    );
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.status === 'paid') return res.status(400).json({ error: 'Esta orden ya está pagada completamente' });
    if (order.payment_mode !== 'abono') return res.status(400).json({ error: 'Esta orden no es de abono' });

    // Traer la próxima cuota pendiente
    const [[nextCuota]]: any = await pool.query(
      `SELECT ap.*, pl.cuotas AS total_cuotas, pl.label AS plan_label
       FROM abono_payments ap
       JOIN abono_plans pl ON pl.id = ap.abono_plan_id
       WHERE ap.order_id = ? AND ap.status = 'pending'
       ORDER BY ap.cuota_number ASC
       LIMIT 1`,
      [order.id]
    );
    if (!nextCuota) return res.status(400).json({ error: 'No hay cuotas pendientes' });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const apiKey  = process.env.BOLD_API_KEY;

    // Generar link Bold para esta cuota
    const boldPayload = {
      orderId:        `${orderRef}-C${nextCuota.cuota_number}`,
      amount:         Math.round(nextCuota.amount),
      currency:       'COP',
      description:    `${order.event_name} · ${orderRef} · Cuota ${nextCuota.cuota_number}/${nextCuota.total_cuotas}`,
      redirectionUrl: `${siteUrl}?reserva=${orderRef}`,
      customer: {
        name:  order.name,
        email: order.email,
        phone: order.phone ?? undefined,
      },
      metadata: {
        order_ref:    orderRef,
        order_id:     String(order.id),
        cuota_number: String(nextCuota.cuota_number),
      },
    };

    const boldRes = await fetch('https://integrations.bold.co/payment/v2/payment-vouchers', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(boldPayload),
    });

    const boldData = await boldRes.json();
    if (!boldRes.ok || !boldData.payload?.url) {
      console.error('[pay-cuota] Bold error:', boldData);
      return res.status(502).json({ error: 'No se pudo generar el link de pago' });
    }

    return res.status(200).json({
      ok:           true,
      paymentUrl:   boldData.payload.url,
      cuotaNumber:  nextCuota.cuota_number,
      totalCuotas:  nextCuota.total_cuotas,
      amount:       nextCuota.amount,
    });
  } catch (err: any) {
    console.error('[pay-cuota]', err.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}
