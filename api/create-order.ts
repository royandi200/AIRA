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

/**
 * Intenta crear un link de pago Bold probando múltiples endpoints y esquemas
 * de autenticación hasta que uno funcione.
 */
async function createBoldPaymentLink(params: {
  orderId: number; orderRef: string; amount: number;
  customerName: string; customerEmail: string; customerPhone: string; description: string;
}): Promise<string> {
  const BOLD_API_KEY = process.env.BOLD_API_KEY ?? '';
  const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://v0-aira-event.vercel.app';

  const redirectionUrl = `${BASE_URL}/checkout/success?order_id=${params.orderId}`;
  const amountInt      = Math.round(params.amount);

  // Candidatos: [endpoint, authHeader, body]
  const candidates: Array<{ label: string; url: string; auth: string; body: object }> = [
    {
      label: 'payment-vouchers Bearer',
      url:   'https://integrations.bold.co/payment/v2/payment-vouchers',
      auth:  `Bearer ${BOLD_API_KEY}`,
      body: {
        orderId:        params.orderRef,
        amount:         amountInt,
        currency:       'COP',
        description:    params.description,
        redirectionUrl,
        customer: {
          name:  params.customerName,
          email: params.customerEmail,
          phone: params.customerPhone,
        },
      },
    },
    {
      label: 'payment-vouchers x-api-key',
      url:   'https://integrations.bold.co/payment/v2/payment-vouchers',
      auth:  `x-api-key ${BOLD_API_KEY}`,
      body: {
        orderId:        params.orderRef,
        amount:         amountInt,
        currency:       'COP',
        description:    params.description,
        redirectionUrl,
        customer: {
          name:  params.customerName,
          email: params.customerEmail,
          phone: params.customerPhone,
        },
      },
    },
    {
      label: 'checkout link-de-pago Bearer',
      url:   'https://api.bold.co/online/link/v1/payment-links',
      auth:  `Bearer ${BOLD_API_KEY}`,
      body: {
        reference:      params.orderRef,
        amount_in_cents: amountInt * 100,
        currency:       'COP',
        customer_email: params.customerEmail,
        redirect_url:   redirectionUrl,
        description:    params.description,
      },
    },
    {
      label: 'checkout link-de-pago ApiKey header',
      url:   'https://api.bold.co/online/link/v1/payment-links',
      auth:  BOLD_API_KEY,
      body: {
        reference:      params.orderRef,
        amount_in_cents: amountInt * 100,
        currency:       'COP',
        customer_email: params.customerEmail,
        redirect_url:   redirectionUrl,
        description:    params.description,
      },
    },
  ];

  const errors: string[] = [];

  for (const c of candidates) {
    console.log(`[Bold] trying ${c.label}`);
    try {
      const resp = await fetch(c.url, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': c.auth,
        },
        body: JSON.stringify(c.body),
      });
      const text = await resp.text();
      console.log(`[Bold] ${c.label} → status ${resp.status}`);
      console.log(`[Bold] ${c.label} → body:`, text.substring(0, 400));

      if (!resp.ok) {
        errors.push(`${c.label}: ${resp.status} ${text.substring(0, 200)}`);
        continue;
      }

      let data: any;
      try { data = JSON.parse(text); } catch {
        errors.push(`${c.label}: respuesta no es JSON`);
        continue;
      }

      const url =
        data?.payload?.url        ??
        data?.payload?.link       ??
        data?.payload?.checkoutUrl??
        data?.url                 ??
        data?.link                ??
        data?.payment_url         ??
        data?.checkoutUrl         ??
        data?.redirectUrl         ??
        data?.checkout_url        ??
        data?.data?.url           ??
        data?.data?.link          ??
        data?.data?.checkout_url;

      if (url) {
        console.log(`[Bold] SUCCESS via ${c.label} → ${url}`);
        return url;
      }

      errors.push(`${c.label}: OK pero sin URL. body=${text.substring(0, 200)}`);
    } catch (err: any) {
      errors.push(`${c.label}: fetch error ${err?.message}`);
    }
  }

  throw new Error(`Bold: todos los endpoints fallaron.\n${errors.join('\n')}`);
}

// ─── Construye items[] desde el payload simplificado del frontend ──────────────
function resolveItems(body: any): any[] {
  // Si el frontend ya manda items[], úsalo directamente
  if (Array.isArray(body.items) && body.items.length > 0) return body.items;

  // Payload simplificado desde TicketReserve.tsx
  const {
    accessType, ticketLabel, stageLabel,
    isVip = false, qty = 1,
    total, basePrice,
  } = body;

  // Construimos un item sintético con ticketTypeId = 0 (fallback para no-DB)
  // El precio real ya viene calculado en el frontend
  const unitPrice = basePrice
    ? Math.round(basePrice / qty)
    : Math.round((total || 0) / qty);

  return [{
    ticketTypeId: 0,            // sin mapeo DB — se usa solo para el monto
    quantity:     qty,
    isVip:        !!isVip,
    _unitPrice:   unitPrice,
    _label:       ticketLabel ?? stageLabel ?? accessType ?? 'Entrada',
  }];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body as Record<string, any>;
  const {
    name, email, phone, docType, docNumber,
    eventId,
    paymentMode = 'full', abonoPlanKey,
    addPassVip    = false,
    addTransport  = false,
    transportPassengers = 0,
    // campos del frontend simplificado
    total:        frontendTotal,
    primerPago:   frontendPrimerPago,
    abonoPlan:    abonoPlanId,
  } = body;

  const items = resolveItems(body);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ── Upsert usuario ──
    await conn.query(
      `INSERT INTO users (name, email, phone, doc_type, doc_number)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), updated_at=NOW()`,
      [name, email, phone, docType || 'CC', docNumber || null]
    );
    const [[user]]: any = await conn.query('SELECT id FROM users WHERE email = ?', [email]);

    // ── Calcular totales ──
    let subtotal = 0;
    for (const item of items) {
      if (item.ticketTypeId && item.ticketTypeId !== 0) {
        // Validar contra DB solo si tenemos ID real
        const [[tt]]: any = await conn.query(
          'SELECT price, vip_price, available_qty, sold_qty, reserved_qty FROM ticket_types WHERE id = ?',
          [item.ticketTypeId]
        );
        if (!tt) throw new Error('Tipo de boleta no encontrado');
        const unitPrice  = item.isVip && tt.vip_price ? tt.vip_price : tt.price;
        const remaining  = tt.available_qty - tt.sold_qty - (tt.reserved_qty || 0);
        if (remaining < item.quantity) throw new Error('Sin cupos disponibles');
        subtotal        += unitPrice * item.quantity;
        item._unitPrice  = unitPrice;
      } else {
        // Precio ya calculado en frontend
        subtotal += (item._unitPrice ?? 0) * item.quantity;
      }
    }

    // Si el frontend envió el total directamente, usarlo (más confiable)
    const resolvedTotal = frontendTotal ?? (
      subtotal +
      Math.round(subtotal * 0.05) +
      (addPassVip   ? 500_000                    : 0) +
      (addTransport ? 150_000 * transportPassengers : 0)
    );

    const serviceFee     = frontendTotal ? 0 : Math.round(subtotal * 0.05);
    const passVipTotal   = addPassVip   ? 500_000 : 0;
    const transportTotal = addTransport ? 150_000 * transportPassengers : 0;
    const total          = resolvedTotal;

    const orderRef      = await generateOrderRef(conn);
    const reservedUntil = new Date(Date.now() + 10 * 60 * 1000);

    const [orderResult]: any = await conn.query(
      `INSERT INTO orders
         (order_ref, user_id, event_id, subtotal, service_fee, pass_vip_total,
          transport_total, total, payment_mode, reserved_until, add_pass_vip, add_transport)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderRef, user.id, eventId ?? null, subtotal, serviceFee, passVipTotal,
       transportTotal, total, paymentMode, reservedUntil,
       addPassVip ? 1 : 0, addTransport ? 1 : 0]
    );
    const orderId = orderResult.insertId;

    // ── Items (solo si hay ticketTypeId real) ──
    for (const item of items) {
      if (!item.ticketTypeId || item.ticketTypeId === 0) continue;
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

    // ── Abonos ──
    const planKey = abonoPlanKey ?? abonoPlanId;
    if (paymentMode === 'abono' && planKey) {
      const [[plan]]: any = await conn.query(
        'SELECT * FROM abono_plans WHERE plan_key = ? AND is_active = 1', [planKey]
      );
      if (plan) {
        let eventDate = '2026-08-15';
        try {
          const [[ev]]: any = await conn.query('SELECT event_date FROM events WHERE id = ?', [eventId]);
          if (ev?.event_date) eventDate = ev.event_date;
        } catch { /* ignore */ }
        const cuotaAmount = Math.round((total / plan.cuotas) * 100) / 100;
        for (let i = 1; i <= plan.cuotas; i++) {
          await conn.query(
            `INSERT INTO abono_payments (order_id, abono_plan_id, cuota_number, amount, due_date)
             VALUES (?,?,?,?,?)`,
            [orderId, plan.id, i, cuotaAmount, calcDueDate(i, plan.cuotas, eventDate)]
          );
        }
      }
    }

    await conn.commit();

    // ── Descripción del evento ──
    let eventName = 'Evento';
    try {
      const [[eventRow]]: any = await pool.query('SELECT name FROM events WHERE id = ?', [eventId]);
      if (eventRow?.name) eventName = eventRow.name;
    } catch { /* ignore */ }

    // ── Bold payment link ──
    let paymentUrl: string | null = null;
    try {
      paymentUrl = await createBoldPaymentLink({
        orderId, orderRef, amount: total,
        customerName:  name,
        customerEmail: email,
        customerPhone: phone,
        description:   `AIRA ${eventName} · ${orderRef}`,
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
