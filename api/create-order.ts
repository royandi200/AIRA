import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db';
import { v4 as uuidv4 } from 'uuid';

async function generateOrderRef(conn: any): Promise<string> {
  const [rows]: any = await conn.query('SELECT COUNT(*) as total FROM orders');
  const next = String(rows[0].total + 1).padStart(5, '0');
  return `AIRA-${next}`;
}

function calcDueDate(cuotaNumber: number, cuotas: number, eventDate: string): string {
  const event = new Date(eventDate);
  const now = Date.now();
  const msRange = event.getTime() - now;
  const msPerCuota = msRange / cuotas;
  const due = new Date(now + msPerCuota * cuotaNumber);
  const final = due < event ? due : event;
  return final.toISOString().split('T')[0];
}

// Valida que el pago en cuotas solo aplique al Paquete VIP 3 Días
async function validateAbonoEligibility(conn: any, items: any[]): Promise<void> {
  for (const item of items) {
    const [[tt]]: any = await conn.query(
      `SELECT name, access_type FROM ticket_types WHERE id = ?`,
      [item.ticketTypeId]
    );
    if (!tt) throw new Error(`Tipo de boleta ${item.ticketTypeId} no encontrado`);
    const isVipPackage =
      tt.access_type === 'package' &&
      tt.name.toLowerCase().includes('vip');
    if (!isVipPackage) {
      throw new Error(
        `El pago en cuotas solo está disponible para el Paquete VIP 3 Días. "${tt.name}" requiere pago completo.`
      );
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    name, email, phone, docType, docNumber,
    eventId, items,
    paymentMode = 'full', abonoPlanKey,
    addPassVip = false, addTransport = false,
    transportPassengers = 0
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Validar elegibilidad de abono ANTES de crear nada
    if (paymentMode === 'abono') {
      await validateAbonoEligibility(conn, items);
    }

    // 1. Upsert usuario
    await conn.query(
      `INSERT INTO users (name, email, phone, doc_type, doc_number)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), updated_at=NOW()`,
      [name, email, phone, docType || 'CC', docNumber]
    );
    const [[user]]: any = await conn.query('SELECT id FROM users WHERE email = ?', [email]);

    // 2. Calcular totales
    let subtotal = 0;
    for (const item of items) {
      const [[tt]]: any = await conn.query(
        'SELECT price, vip_price, available_qty, sold_qty, reserved_qty FROM ticket_types WHERE id = ?',
        [item.ticketTypeId]
      );
      const unitPrice = item.isVip && tt.vip_price ? tt.vip_price : tt.price;
      const remaining = tt.available_qty - tt.sold_qty - tt.reserved_qty;
      if (remaining < item.quantity) throw new Error(`Sin cupos para la boleta seleccionada`);
      subtotal += unitPrice * item.quantity;
      item._unitPrice = unitPrice;
    }

    const serviceFee     = Math.round(subtotal * 0.05 * 100) / 100;
    const passVipTotal   = addPassVip ? 50000 : 0;
    const transportTotal = addTransport ? (35000 * transportPassengers) : 0;
    const total          = subtotal + serviceFee + passVipTotal + transportTotal;

    // 3. Crear orden
    const orderRef     = await generateOrderRef(conn);
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

    // 4. Items + reservar cupos
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

    // 5. Transporte
    if (addTransport) {
      await conn.query(
        `INSERT INTO transport_bookings (order_id, passengers, price) VALUES (?,?,?)`,
        [orderId, transportPassengers, transportTotal]
      );
    }

    // 6. Generar cuotas de abono (solo Paquete VIP 3 Días)
    if (paymentMode === 'abono' && abonoPlanKey) {
      const [[plan]]: any = await conn.query(
        'SELECT * FROM abono_plans WHERE plan_key = ? AND is_active = 1',
        [abonoPlanKey]
      );
      if (!plan) throw new Error('Plan de abono no válido');

      const [[event]]: any = await conn.query(
        'SELECT event_date FROM events WHERE id = ?', [eventId]
      );

      const cuotaAmount = Math.round((total / plan.cuotas) * 100) / 100;

      for (let i = 1; i <= plan.cuotas; i++) {
        const dueDate = calcDueDate(i, plan.cuotas, event.event_date);
        await conn.query(
          `INSERT INTO abono_payments (order_id, abono_plan_id, cuota_number, amount, due_date)
           VALUES (?,?,?,?,?)`,
          [orderId, plan.id, i, cuotaAmount, dueDate]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ orderId, orderRef, total, reservedUntil, paymentMode });

  } catch (err: any) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
}
