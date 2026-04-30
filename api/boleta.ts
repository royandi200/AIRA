/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { generateTicketHTML, generateReservaHTML } from './lib/generate-ticket.js';

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

/**
 * GET /api/boleta?ref=AIRA-00001&token=abc123
 * Devuelve el HTML de la boleta QR o del comprobante de reserva.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { ref, token } = req.query as Record<string, string>;
  if (!ref) return res.status(400).json({ error: 'ref requerido' });

  const [[order]]: any = await pool.query(
    `SELECT o.id, o.order_ref, o.status, o.payment_mode, o.total,
            o.qr_token, o.add_pass_vip,
            u.name, u.email, u.phone
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.order_ref = ?`,
    [ref]
  );

  if (!order) return res.status(404).send('<h2>Orden no encontrada</h2>');

  // Si es boleta QR: verificar token
  if (order.status === 'paid' && order.qr_token) {
    if (token && token !== order.qr_token) {
      return res.status(403).send('<h2>Token inválido</h2>');
    }
    // Obtener items para construir label
    const [items]: any = await pool.query(
      `SELECT tt.name as ticket_name, tt.day_label, oi.quantity, oi.is_vip
       FROM order_items oi
       JOIN ticket_types tt ON tt.id = oi.ticket_type_id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    const eventLabel = items.length > 0
      ? items.map((i: any) => i.ticket_name || i.day_label).join(' + ')
      : 'AIRA Experience';
    const days = items.length > 0
      ? items.map((i: any) => i.day_label ?? '').filter(Boolean).join(', ')
      : '15–17 AGO';
    const isVip = order.add_pass_vip || (items.length > 0 && items.some((i: any) => i.is_vip));

    const html = generateTicketHTML({
      orderRef:   order.order_ref,
      name:       order.name,
      email:      order.email,
      eventLabel,
      days,
      isVip,
      total:      Number(order.total),
      qrToken:    order.qr_token,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  // Si es comprobante de reserva (pago a cuotas)
  if (order.payment_mode === 'abono') {
    const [[abono]]: any = await pool.query(
      `SELECT cuota_number, amount, due_date, paid_at
       FROM abono_payments WHERE order_id = ? ORDER BY cuota_number`,
      [order.id]
    ).catch(() => [[null]]);

    const [[plan]]: any = await pool.query(
      `SELECT COUNT(*) as total FROM abono_payments WHERE order_id = ?`,
      [order.id]
    ).catch(() => [[{ total: 2 }]]);

    const [pagadas]: any = await pool.query(
      `SELECT COUNT(*) as pagadas FROM abono_payments WHERE order_id = ? AND paid_at IS NOT NULL`,
      [order.id]
    ).catch(() => [[{ pagadas: 1 }]]);

    const cuotasTotal   = plan?.total ?? 2;
    const cuotasPagadas = pagadas?.pagadas ?? 1;
    const cuotaAmt      = abono ? Number(abono.amount) : Math.round(Number(order.total) / cuotasTotal);
    const montoPagado   = cuotaAmt * cuotasPagadas;
    const saldoPendiente = Number(order.total) - montoPagado;

    const [items]: any = await pool.query(
      `SELECT tt.name as ticket_name, tt.day_label FROM order_items oi
       JOIN ticket_types tt ON tt.id = oi.ticket_type_id
       WHERE oi.order_id = ?`,
      [order.id]
    );
    const eventLabel = items.length > 0
      ? items.map((i: any) => i.ticket_name || i.day_label).join(' + ')
      : 'AIRA Experience';
    const days = items.length > 0
      ? items.map((i: any) => i.day_label ?? '').filter(Boolean).join(', ')
      : '15–17 AGO';

    const html = generateReservaHTML({
      orderRef:        order.order_ref,
      name:            order.name,
      email:           order.email,
      eventLabel,
      days,
      total:           Number(order.total),
      cuotasPagadas,
      cuotasTotal,
      montoPagado,
      saldoPendiente,
      proximaFecha:    abono?.due_date ? new Date(abono.due_date).toLocaleDateString('es-CO') : '—',
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  return res.status(400).send('<h2>Estado de orden no válido para generar boleta</h2>');
}
