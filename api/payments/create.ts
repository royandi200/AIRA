import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderRef } = req.body;

  try {
    const [[order]]: any = await pool.query(
      `SELECT o.*, u.name, u.email, u.phone, e.name AS event_name
       FROM orders o
       JOIN users  u ON u.id = o.user_id
       JOIN events e ON e.id = o.event_id
       WHERE o.order_ref = ? AND o.status = 'pending'`,
      [orderRef]
    );
    if (!order) return res.status(404).json({ error: 'Orden no encontrada o ya procesada' });

    // Monto a cobrar: primer abono o total completo
    let amountToPay = order.total;
    if (order.payment_mode === 'abono') {
      const [[firstCuota]]: any = await pool.query(
        `SELECT amount FROM abono_payments
         WHERE order_id = ? AND cuota_number = 1`,
        [order.id]
      );
      if (firstCuota) amountToPay = firstCuota.amount;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const apiKey  = process.env.BOLD_API_KEY;

    // Bold Payment Links API — endpoint correcto
    const boldPayload = {
      orderId:        orderRef,
      amount:         Math.round(amountToPay),
      currency:       'COP',
      description:    `${order.event_name} — ${orderRef}`,
      redirectionUrl: `${siteUrl}/checkout/success?ref=${orderRef}`,
      customer: {
        name:  order.name,
        email: order.email,
        phone: order.phone ?? undefined,
      },
      metadata: {
        order_ref: orderRef,
        order_id:  String(order.id),
      },
    };

    const boldRes = await fetch('https://integrations.bold.co/payment/v2/payment-vouchers', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(boldPayload),
    });

    const rawText = await boldRes.text();
    let boldData: any;
    try {
      boldData = JSON.parse(rawText);
    } catch {
      throw new Error(`Bold API ${boldRes.status}: ${rawText.slice(0, 300)}`);
    }

    if (!boldRes.ok) {
      throw new Error(`Bold API ${boldRes.status}: ${JSON.stringify(boldData)}`);
    }

    // La URL puede venir en distintos campos según versión de la API
    const paymentUrl =
      boldData.checkoutUrl ??
      boldData.checkout_url ??
      boldData.redirectUrl ??
      boldData.redirect_url ??
      boldData.link ??
      boldData.paymentLink ??
      boldData.url ??
      null;

    if (!paymentUrl) {
      throw new Error(`Bold no devolvió URL de pago. Respuesta: ${JSON.stringify(boldData)}`);
    }

    res.status(200).json({
      checkoutUrl: paymentUrl,
      paymentId:   boldData.id ?? boldData.paymentId ?? orderRef,
      amountToPay,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
