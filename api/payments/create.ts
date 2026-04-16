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

    // Bold Checkout
    const boldPayload = {
      amount: { currency: 'COP', total_amount: Math.round(amountToPay) },
      description: `${order.event_name} — ${orderRef}`,
      metadata: { order_ref: orderRef, order_id: order.id },
      customer: { name: order.name, email: order.email, phone: order.phone },
      redirect_url: `${siteUrl}/checkout/success?ref=${orderRef}`,
      cancel_url:   `${siteUrl}/checkout/cancelled?ref=${orderRef}`,
    };

    const boldRes = await fetch('https://checkout.bold.co/api/v1/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `x-api-key ${process.env.BOLD_API_KEY}`
      },
      body: JSON.stringify(boldPayload)
    });

    const boldData = await boldRes.json();
    if (!boldRes.ok) throw new Error(boldData.message || 'Error Bold');

    res.status(200).json({
      checkoutUrl: boldData.checkout_url,
      paymentId:   boldData.id,
      amountToPay
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
