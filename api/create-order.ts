/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASS,
  database:           process.env.DB_NAME,
  port:               Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  ssl:                { rejectUnauthorized: false },
});

async function generateOrderRef(conn: any): Promise<string> {
  const [rows]: any = await conn.query('SELECT COUNT(*) as total FROM orders');
  const next = String(rows[0].total + 1).padStart(5, '0');
  return `AIRA-${next}`;
}

function calcDueDate(cuotaNumber: number, cuotas: number, eventDate: string): string {
  const event = new Date(eventDate);
  const now   = Date.now();
  const msRange    = event.getTime() - now;
  const msPerCuota = msRange / cuotas;
  const due        = new Date(now + msPerCuota * cuotaNumber);
  const final      = due < event ? due : event;
  return final.toISOString().split('T')[0];
}

async function validateAbonoEligibility(conn: any, items: any[]): Promise<void> {
  for (const item of items) {
    const [[tt]]: any = await conn.query(
      `SELECT name, access_type FROM ticket_types WHERE id = ?`,
      [item.ticketTypeId]
    );
    if (!tt) throw new Error(`Tipo de boleta ${item.ticketTypeId} no encontrado`);
    const isVipPackage = tt.access_type === 'package' && tt.name.toLowerCase().includes('vip');
    if (!isVipPackage)
      throw new Error(`El pago en cuotas solo está disponible para el Paquete VIP 3 Días. "${tt.name}" requiere pago completo.`);
  }
}

async function createBoldPaymentLink(params: {
  orderId: number; orderRef: string; amount: number;
  customerName: string; customerEmail: string; customerPhone: string; description: string;
}): Promise<string> {
  const BOLD_API_KEY = process.env.BOLD_API_KEY;
  const BASE_URL     = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://v0-aira-event.vercel.app';

  // Endpoint oficial Bold Colombia — Payment Vouchers API
  const BOLD_ENDPOINT = 'https://integrations.bold.co/payment/v2/payment-vouchers';

  console.log('[Bold] endpoint:', BOLD_ENDPOINT);
  console.log('[Bold] BOLD_API_KEY presente:', !!BOLD_API_KEY);
  console.log('[Bold] BOLD_API_KEY prefijo:', BOLD_API_KEY?.substring(0, 8));
  console.log('[Bold] amount:', Math.round(params.amount));
  console.log('[Bold] orderRef:', params.orderRef);

  const bodyPayload = {
    orderId:     params.orderRef,
    amount:      Math.round(params.amount),
    currency:    'COP',
    description: params.description,
    redirectionUrl: `${BASE_URL}/checkout/success?order_id=${params.orderId}`,
    imageUrl:    `${BASE_URL}/logo.png`,
    customer: {
      name:  params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone,
    },
  };

  console.log('[Bold] body:', JSON.stringify(bodyPayload));

  let response: Response;
  try {
    response = await fetch(BOLD_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `x-api-key ${BOLD_API_KEY}`,
      },
      body: JSON.stringify(bodyPayload),
    });
  } catch (fetchErr: any) {
    console.error('[Bold] fetch() lanzó excepción:', fetchErr?.message, fetchErr?.cause);
    throw new Error(`Bold fetch error: ${fetchErr?.message} | cause: ${JSON.stringify(fetchErr?.cause)}`);
  }

  console.log('[Bold] HTTP status:', response.status);
  const rawText = await response.text();
  console.log('[Bold] raw response:', rawText);

  if (!response.ok) {
    throw new Error(`Bold API ${response.status}: ${rawText}`);
  }

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Bold respuesta no es JSON: ${rawText}`);
  }

  // Bold puede retornar el link en distintos campos según versión
  const url =
    data?.payload?.url      ??
    data?.payload?.link     ??
    data?.url               ??
    data?.link              ??
    data?.payment_url       ??
    data?.checkoutUrl       ??
    data?.redirectUrl;

  if (!url) throw new Error(`Bold no retornó URL de pago. Respuesta: ${rawText}`);
  return url;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    name, email, phone, docType, docNumber,
    eventId, items,
    paymentMode = 'full', abonoPlanKey,
    addPassVip = false, addTransport = false,
    transportPassengers = 0,
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (paymentMode === 'abono') await validateAbonoEligibility(conn, items);

    await conn.query(
      `INSERT INTO users (name, email, phone, doc_type, doc_number)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), updated_at=NOW()`,
      [name, email, phone, docType || 'CC', docNumber || null]
    );
    const [[user]]: any = await conn.query('SELECT id FROM users WHERE email = ?', [email]);

    let subtotal = 0;
    for (const item of items) {
      const [[tt]]: any = await conn.query(
        'SELECT price, vip_price, available_qty, sold_qty, reserved_qty FROM ticket_types WHERE id = ?',
        [item.ticketTypeId]
      );
      const unitPrice = item.isVip && tt.vip_price ? tt.vip_price : tt.price;
      const remaining = tt.available_qty - tt.sold_qty - (tt.reserved_qty || 0);
      if (remaining < item.quantity) throw new Error('Sin cupos para la boleta seleccionada');
      subtotal        += unitPrice * item.quantity;
      item._unitPrice  = unitPrice;
    }

    const serviceFee     = Math.round(subtotal * 0.05 * 100) / 100;
    const passVipTotal   = addPassVip   ? 500000 : 0;
    const transportTotal = addTransport ? 150000 * transportPassengers : 0;
    const total          = subtotal + serviceFee + passVipTotal + transportTotal;

    const orderRef      = await generateOrderRef(conn);
    const reservedUntil = new Date(Date.now() + 10 * 60 * 1000);

    const [orderResult]: any = await conn.query(
      `INSERT INTO orders
         (order_ref, user_id, event_id, subtotal, service_fee, pass_vip_total,
          transport_total, total, payment_mode, reserved_until, add_pass_vip, add_transport)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderRef, user.id, eventId, subtotal, serviceFee, passVipTotal,
       transportTotal, total, paymentMode, reservedUntil,
       addPassVip ? 1 : 0, addTransport ? 1 : 0]
    );
    const orderId = orderResult.insertId;

    for (const item of items) {
      await conn.query(
        `INSERT INTO order_items (order_id, ticket_type_id, quantity, unit_price, is_vip)
         VALUES (?,?,?,?,?)`,
        [orderId, item.ticketTypeId, item.quantity, item._unitPrice, item.isVip ? 1 : 0]
      );
      await conn.query(
        'UPDATE ticket_types SET reserved_qty = reserved_qty + ? WHERE id = ?',
        [item.quantity, item.ticketTypeId]
      );
    }

    if (addTransport) {
      await conn.query(
        `INSERT INTO transport_bookings (order_id, passengers, price) VALUES (?,?,?)`,
        [orderId, transportPassengers, transportTotal]
      );
    }

    if (paymentMode === 'abono' && abonoPlanKey) {
      const [[plan]]: any = await conn.query(
        'SELECT * FROM abono_plans WHERE plan_key = ? AND is_active = 1', [abonoPlanKey]
      );
      if (!plan) throw new Error('Plan de abono no válido');
      const [[event]]: any = await conn.query(
        'SELECT event_date FROM events WHERE id = ?', [eventId]
      );
      const cuotaAmount = Math.round((total / plan.cuotas) * 100) / 100;
      for (let i = 1; i <= plan.cuotas; i++) {
        await conn.query(
          `INSERT INTO abono_payments (order_id, abono_plan_id, cuota_number, amount, due_date)
           VALUES (?,?,?,?,?)`,
          [orderId, plan.id, i, cuotaAmount, calcDueDate(i, plan.cuotas, event.event_date)]
        );
      }
    }

    await conn.commit();

    const [[eventRow]]: any = await pool.query('SELECT name FROM events WHERE id = ?', [eventId]);

    let paymentUrl: string | null = null;
    try {
      paymentUrl = await createBoldPaymentLink({
        orderId, orderRef, amount: total,
        customerName:  name,
        customerEmail: email,
        customerPhone: phone,
        description:   `AIRA ${eventRow?.name ?? 'Evento'} · ${orderRef}`,
      });
      await pool.query('UPDATE orders SET bold_link = ? WHERE id = ?', [paymentUrl, orderId]);
    } catch (boldErr: any) {
      console.error('[Bold] Error creando link de pago:', boldErr.message);
      return res.status(201).json({
        orderId, orderRef, total, reservedUntil, paymentMode,
        paymentUrl: null,
        boldError: boldErr.message,
      });
    }

    return res.status(201).json({ orderId, orderRef, total, reservedUntil, paymentMode, paymentUrl });

  } catch (err: any) {
    await conn.rollback();
    console.error('[create-order]', err.message);
    return res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
}
