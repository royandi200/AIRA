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
 * Crea un link de pago Bold usando la API oficial documentada.
 *
 * Docs: https://developers.bold.co/pagos-en-linea/api-integration
 * URL base: https://integrations.api.bold.co
 * Auth: Authorization: x-api-key <KEY>
 * Endpoint: POST /online/link/v1
 *
 * Fallback (API de Pagos BETA):
 * URL base: https://api.online.payments.bold.co
 * Endpoint: POST /v1/payment-intent
 */
async function createBoldPaymentLink(params: {
  orderId: number; orderRef: string; amount: number;
  customerName: string; customerEmail: string; customerPhone: string; description: string;
}): Promise<string> {
  const BOLD_API_KEY = process.env.BOLD_API_KEY ?? '';
  const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://v0-aira-event.vercel.app';

  const callbackUrl = `${BASE_URL}/checkout/success?order_id=${params.orderId}`;
  const amountInt   = Math.round(params.amount);

  // Fecha de expiración = 10 minutos en nanosegundos desde epoch
  const expirationNs = (Date.now() + 10 * 60 * 1000) * 1_000_000;

  const authHeader = `x-api-key ${BOLD_API_KEY}`;

  const candidates: Array<{ label: string; url: string; body: object; extractUrl: (d: any) => string | undefined }> = [
    // ── Opción 1: Link de Pago API (integrations.api.bold.co) ──────────────────
    {
      label: 'link-de-pago CLOSE',
      url:   'https://integrations.api.bold.co/online/link/v1',
      body: {
        amount_type:     'CLOSE',
        description:     params.description,
        expiration_date: expirationNs,
        callback_url:    callbackUrl,
        payer_email:     params.customerEmail,
        amount: {
          currency:     'COP',
          total_amount: amountInt,
        },
      },
      extractUrl: (d) => d?.payload?.url ?? d?.payload?.link,
    },
    // ── Opción 2: Link de Pago API — OPEN (sin monto, por si CLOSE falla) ──────
    {
      label: 'link-de-pago OPEN',
      url:   'https://integrations.api.bold.co/online/link/v1',
      body: {
        amount_type:  'OPEN',
        description:  params.description,
        callback_url: callbackUrl,
        payer_email:  params.customerEmail,
      },
      extractUrl: (d) => d?.payload?.url ?? d?.payload?.link,
    },
    // ── Opción 3: API de Pagos BETA (payment-intent) ────────────────────────────
    {
      label: 'payment-intent BETA',
      url:   'https://api.online.payments.bold.co/v1/payment-intent',
      body: {
        reference_id: params.orderRef,
        description:  params.description,
        callback_url: callbackUrl,
        amount: {
          currency:     'COP',
          total_amount: amountInt,
        },
        customer: {
          name:  params.customerName,
          phone: params.customerPhone,
          email: params.customerEmail,
        },
      },
      // La API de intención devuelve referencia, no URL directa.
      // Construimos la URL de checkout de Bold con el reference_id.
      extractUrl: (d) =>
        d?.payload?.url ??
        d?.url ??
        (d?.payload?.reference_id
          ? `https://checkout.bold.co/${d.payload.reference_id}`
          : undefined),
    },
  ];

  const errors: string[] = [];

  for (const c of candidates) {
    console.log(`[Bold] trying ${c.label} → ${c.url}`);
    try {
      const resp = await fetch(c.url, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(c.body),
      });

      const text = await resp.text();
      console.log(`[Bold] ${c.label} → HTTP ${resp.status}`);
      console.log(`[Bold] ${c.label} → body: ${text.substring(0, 500)}`);

      if (!resp.ok) {
        errors.push(`${c.label}: HTTP ${resp.status} — ${text.substring(0, 300)}`);
        continue;
      }

      let data: any;
      try { data = JSON.parse(text); } catch {
        errors.push(`${c.label}: respuesta no es JSON`);
        continue;
      }

      const url = c.extractUrl(data);
      if (url) {
        console.log(`[Bold] SUCCESS via ${c.label} → ${url}`);
        return url;
      }

      errors.push(`${c.label}: OK pero sin URL. body=${text.substring(0, 300)}`);
    } catch (err: any) {
      errors.push(`${c.label}: fetch error — ${err?.message}`);
      console.error(`[Bold] ${c.label} fetch error:`, err);
    }
  }

  throw new Error(`Bold: todos los endpoints fallaron.\n${errors.join('\n')}`);
}

// ─── Construye items[] desde el payload simplificado del frontend ──────────────
function resolveItems(body: any): any[] {
  if (Array.isArray(body.items) && body.items.length > 0) return body.items;

  const {
    accessType, ticketLabel, stageLabel,
    isVip = false, qty = 1,
    total, basePrice,
  } = body;

  const unitPrice = basePrice
    ? Math.round(basePrice / qty)
    : Math.round((total || 0) / qty);

  return [{
    ticketTypeId: 0,
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
    total:        frontendTotal,
    primerPago:   frontendPrimerPago,
    abonoPlan:    abonoPlanId,
  } = body;

  const items = resolveItems(body);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO users (name, email, phone, doc_type, doc_number)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), updated_at=NOW()`,
      [name, email, phone, docType || 'CC', docNumber || null]
    );
    const [[user]]: any = await conn.query('SELECT id FROM users WHERE email = ?', [email]);

    let subtotal = 0;
    for (const item of items) {
      if (item.ticketTypeId && item.ticketTypeId !== 0) {
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
        subtotal += (item._unitPrice ?? 0) * item.quantity;
      }
    }

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

    let eventName = 'Evento';
    try {
      const [[eventRow]]: any = await pool.query('SELECT name FROM events WHERE id = ?', [eventId]);
      if (eventRow?.name) eventName = eventRow.name;
    } catch { /* ignore */ }

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
