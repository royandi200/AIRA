/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { createHmac } from 'crypto';
import { generateQRToken } from './lib/generate-ticket.js';
import { sendTicketWhatsApp, sendReservaWhatsApp } from './lib/send-whatsapp.js';

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASS,
  database:           process.env.DB_NAME,
  port:               Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit:    5,
  ssl:                { rejectUnauthorized: false },
});

function verifySignature(req: VercelRequest, rawBody: string): boolean {
  const signature = req.headers['x-bold-signature'] as string | undefined;
  if (!signature) {
    console.warn('[webhook-bold] sin header x-bold-signature — aceptando (modo test)');
    return true;
  }
  const secret   = process.env.BOLD_WEBHOOK_SECRET || process.env.BOLD_API_KEY || '';
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return signature === expected;
}

async function sendQRTicket(conn: any, orderId: number, orderRef: string): Promise<void> {
  const qrToken = generateQRToken(String(orderRef));
  try { await conn.query('UPDATE orders SET qr_token = ? WHERE id = ?', [qrToken, orderId]); } catch { /* ok */ }

  const [[fullOrder]]: any = await conn.query(
    `SELECT o.order_ref, o.total, o.add_pass_vip, u.name, u.phone
     FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`,
    [orderId]
  );
  if (!fullOrder) return;

  const [[ticketInfo]]: any = await conn.query(
    `SELECT tt.name as ticket_name FROM order_items oi
     JOIN ticket_types tt ON tt.id = oi.ticket_type_id WHERE oi.order_id = ? LIMIT 1`,
    [orderId]
  ).catch(() => [[null]]);

  await sendTicketWhatsApp({
    phone:      fullOrder.phone,
    name:       fullOrder.name,
    orderRef:   fullOrder.order_ref,
    eventLabel: ticketInfo?.ticket_name ?? 'AIRA Experience',
    qrToken,
  });
  console.log(`[webhook-bold] ✅ QR generado y enviado a ${fullOrder.phone} — ${fullOrder.order_ref}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = JSON.stringify(req.body);
  if (!verifySignature(req, rawBody)) {
    console.warn('[webhook-bold] firma inválida');
    return res.status(401).json({ error: 'Firma inválida' });
  }

  const payload       = req.body as Record<string, any>;
  const orderRef      = payload.order_id ?? payload.reference ?? payload.metadata?.order_ref ?? null;
  const boldStatus    = payload.status ?? payload.payment_status ?? payload.transaction_status ?? '';
  const transactionId = payload.transaction_id ?? payload.id ?? null;

  console.log('[webhook-bold] payload:', JSON.stringify(payload).substring(0, 600));

  if (!orderRef) return res.status(400).json({ error: 'order_ref requerido' });

  const newStatus =
    boldStatus === 'APPROVED' ? 'paid'
    : ['REJECTED', 'FAILED', 'CANCELLED'].includes(boldStatus) ? 'cancelled'
    : 'pending';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const isNumeric = /^\d+$/.test(String(orderRef));
    const [[order]]: any = await conn.query(
      isNumeric
        ? 'SELECT id, status, payment_mode, qr_token, codigo_referido FROM orders WHERE id = ?'
        : 'SELECT id, status, payment_mode, qr_token, codigo_referido FROM orders WHERE order_ref = ?',
      [orderRef]
    );

    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

    const orderId     = order.id;
    const isAbono     = order.payment_mode === 'abono';
    const alreadyPaid = order.status === 'paid';

    // Actualizar status y datos de transacción
    await conn.query('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, orderId]);
    if (transactionId) {
      try { await conn.query('UPDATE orders SET bold_payment_id = ? WHERE id = ?', [transactionId, orderId]); } catch { /* ok */ }
    }

    // ── PAGO APROBADO ─────────────────────────────────────────────────────────
    if (newStatus === 'paid') {
      try { await conn.query('UPDATE orders SET paid_at = NOW() WHERE id = ?', [orderId]); } catch { /* ok */ }

      // Mover reserved → sold en ticket_types
      const [items]: any = await conn.query('SELECT ticket_type_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of items) {
        await conn.query(
          `UPDATE ticket_types SET sold_qty = sold_qty + ?, reserved_qty = GREATEST(0, reserved_qty - ?) WHERE id = ?`,
          [item.quantity, item.quantity, item.ticket_type_id]
        );
      }

      // ── Descontar uso del código referido SOLO al confirmar pago ─────────
      // El código ya fue validado y guardado en orders.codigo_referido al
      // crear la orden. Aquí lo consumimos una sola vez (solo si aún no estaba
      // pagada, para evitar doble descuento en callbacks duplicados de Bold).
      if (!alreadyPaid && order.codigo_referido) {
        try {
          await conn.query(
            `UPDATE codigos_referido
             SET usos_actuales = usos_actuales + 1
             WHERE codigo = ? AND usos_actuales < usos_max`,
            [order.codigo_referido]
          );
          console.log(`[webhook-bold] 🎟️  Uso descontado al código referido: ${order.codigo_referido}`);
        } catch (refErr: any) {
          // No bloquear el pago si falla el descuento del referido
          console.warn('[webhook-bold] No se pudo descontar uso referido:', refErr.message);
        }
      }

      if (isAbono) {
        // ── MODO ABONO: marcar cuota y decidir si es la última ───────────────
        await conn.query(
          `UPDATE abono_payments SET paid_at = NOW()
           WHERE order_id = ? AND paid_at IS NULL ORDER BY cuota_number LIMIT 1`,
          [orderId]
        );

        const [[pendientes]]: any = await conn.query(
          'SELECT COUNT(*) as cnt FROM abono_payments WHERE order_id = ? AND paid_at IS NULL',
          [orderId]
        );
        const [[pagadas]]: any = await conn.query(
          'SELECT COUNT(*) as cnt FROM abono_payments WHERE order_id = ? AND paid_at IS NOT NULL',
          [orderId]
        );
        const [[totalCuotas]]: any = await conn.query(
          'SELECT COUNT(*) as cnt FROM abono_payments WHERE order_id = ?',
          [orderId]
        );
        const [[proxima]]: any = await conn.query(
          'SELECT due_date, amount FROM abono_payments WHERE order_id = ? AND paid_at IS NULL ORDER BY cuota_number LIMIT 1',
          [orderId]
        );

        if (pendientes?.cnt > 0) {
          // Aún quedan cuotas → comprobante de reserva SIN QR
          const [[fullOrder]]: any = await conn.query(
            `SELECT o.order_ref, o.total, u.name, u.phone
             FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`,
            [orderId]
          );
          const [[ticketInfo]]: any = await conn.query(
            `SELECT tt.name as ticket_name FROM order_items oi
             JOIN ticket_types tt ON tt.id = oi.ticket_type_id WHERE oi.order_id = ? LIMIT 1`,
            [orderId]
          ).catch(() => [[null]]);

          if (fullOrder) {
            const cuotaAmt    = Number(proxima?.amount ?? 0) || Math.round(Number(fullOrder.total) / totalCuotas.cnt);
            const montoPagado = cuotaAmt * pagadas.cnt;
            await sendReservaWhatsApp({
              phone:          fullOrder.phone,
              name:           fullOrder.name,
              orderRef:       fullOrder.order_ref,
              eventLabel:     ticketInfo?.ticket_name ?? 'AIRA Experience',
              cuotasPagadas:  pagadas.cnt,
              cuotasTotal:    totalCuotas.cnt,
              montoPagado,
              saldoPendiente: Number(fullOrder.total) - montoPagado,
              proximaFecha:   proxima?.due_date ? new Date(proxima.due_date).toLocaleDateString('es-CO') : '—',
            });
            console.log(`[webhook-bold] 📋 Reserva enviada — ${fullOrder.order_ref} (${pagadas.cnt}/${totalCuotas.cnt})`);
          }
        } else {
          // ✅ Última cuota — ahora sí generar QR y enviar boleta
          if (!order.qr_token) {
            await sendQRTicket(conn, orderId, orderRef);
          }
        }

      } else {
        // ── MODO FULL: generar QR directamente ──────────────────────────────
        if (!alreadyPaid && !order.qr_token) {
          await sendQRTicket(conn, orderId, orderRef);
        }
      }
    }

    // ── CANCELADO ─────────────────────────────────────────────────────────────
    if (newStatus === 'cancelled') {
      const [items]: any = await conn.query('SELECT ticket_type_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of items) {
        await conn.query(
          'UPDATE ticket_types SET reserved_qty = GREATEST(0, reserved_qty - ?) WHERE id = ?',
          [item.quantity, item.ticket_type_id]
        );
      }
    }

    await conn.commit();
    console.log(`[webhook-bold] orden ${orderId} → ${newStatus}`);
    return res.status(200).json({ ok: true, orderId, status: newStatus });

  } catch (err: any) {
    await conn.rollback();
    console.error('[webhook-bold]', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}
