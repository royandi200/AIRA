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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const ref   = (req.query.ref   as string) || '';
  const token = (req.query.token as string) || '';

  if (!ref) return res.status(400).send('<h2>ref requerido</h2>');

  try {

    // ── 1. Registros MANUALES (AIRA-M-…) ────────────────────────────────────
    if (ref.startsWith('AIRA-M-')) {
      const [[manual]]: any = await pool.query(
        `SELECT id, order_ref, nombre, email, movil, paquete,
                monto_total, monto_recibido, monto_pendiente, qr_token
         FROM manual_registros WHERE order_ref = ?`,
        [ref]
      );

      if (!manual) return res.status(404).send(errorPage('Orden no encontrada', 'La referencia ingresada no existe.'));

      if (!manual.qr_token) return res.status(400).send(errorPage('Boleta no disponible', 'La boleta aún no ha sido generada para este registro.'));

      if (token && token !== manual.qr_token) {
        return res.status(403).send(errorPage('Acceso denegado', 'El token no es válido para esta boleta.'));
      }

      const montoPendiente = Number(manual.monto_pendiente) || 0;

      const html = generateTicketHTML({
        orderRef:       manual.order_ref,
        name:           manual.nombre,
        email:          manual.email || '',
        eventLabel:     manual.paquete || 'AIRA Experience',
        days:           '15–17 AGO',
        isVip:          String(manual.paquete || '').toLowerCase().includes('vip'),
        total:          Number(manual.monto_total),
        qrToken:        manual.qr_token,
        montoPendiente, // ← banner amarillo si > 0
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    // ── 2. Orders normales (Bold / online) ──────────────────────────────────
    const [[order]]: any = await pool.query(
      `SELECT o.id, o.order_ref, o.status, o.payment_mode, o.total,
              o.qr_token, o.add_pass_vip,
              u.name, u.email, u.phone
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.order_ref = ?`,
      [ref]
    );

    if (!order) return res.status(404).send(errorPage('Orden no encontrada', 'La referencia ingresada no existe.'));

    // ── BOLETA QR (pago completo) ────────────────────────────────────────────
    if (order.status === 'paid' && order.qr_token) {
      if (token && token !== order.qr_token) {
        return res.status(403).send(errorPage('Acceso denegado', 'El token no es válido para esta boleta.'));
      }

      let items: any[] = [];
      try {
        const [rows]: any = await pool.query(
          `SELECT tt.name as ticket_name, oi.quantity
           FROM order_items oi
           JOIN ticket_types tt ON tt.id = oi.ticket_type_id
           WHERE oi.order_id = ?`,
          [order.id]
        );
        items = rows || [];
      } catch { /* fallback */ }

      const eventLabel = items.length > 0
        ? items.map((i: any) => i.ticket_name).filter(Boolean).join(' + ')
        : 'AIRA Experience';

      const html = generateTicketHTML({
        orderRef:   order.order_ref,
        name:       order.name,
        email:      order.email,
        eventLabel,
        days:       '15–17 AGO',
        isVip:      Boolean(order.add_pass_vip),
        total:      Number(order.total),
        qrToken:    order.qr_token,
        // montoPendiente no aplica para Bold (ya está paid)
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    // ── COMPROBANTE RESERVA (abono) ──────────────────────────────────────────
    if (order.payment_mode === 'abono') {
      let cuotasPagadas = 1;
      let cuotasTotal   = 2;
      let montoPagado   = Math.round(Number(order.total) / 2);
      let proximaFecha  = '—';

      try {
        const [[totRow]]: any = await pool.query(
          'SELECT COUNT(*) as cnt FROM abono_payments WHERE order_id = ?', [order.id]
        );
        const [[pagRow]]: any = await pool.query(
          'SELECT COUNT(*) as cnt FROM abono_payments WHERE order_id = ? AND paid_at IS NOT NULL', [order.id]
        );
        const [[proxRow]]: any = await pool.query(
          'SELECT due_date FROM abono_payments WHERE order_id = ? AND paid_at IS NULL ORDER BY cuota_number LIMIT 1', [order.id]
        );
        cuotasTotal   = Number(totRow?.cnt) || 2;
        cuotasPagadas = Number(pagRow?.cnt) || 1;
        montoPagado   = Math.round((Number(order.total) / cuotasTotal) * cuotasPagadas);
        proximaFecha  = proxRow?.due_date ? new Date(proxRow.due_date).toLocaleDateString('es-CO') : '—';
      } catch { /* usa defaults */ }

      let items: any[] = [];
      try {
        const [rows]: any = await pool.query(
          `SELECT tt.name as ticket_name FROM order_items oi
           JOIN ticket_types tt ON tt.id = oi.ticket_type_id WHERE oi.order_id = ?`,
          [order.id]
        );
        items = rows || [];
      } catch { /* fallback */ }

      const eventLabel = items.length > 0
        ? items.map((i: any) => i.ticket_name).filter(Boolean).join(' + ')
        : 'AIRA Experience';

      const html = generateReservaHTML({
        orderRef:       order.order_ref,
        name:           order.name,
        email:          order.email,
        eventLabel,
        days:           '15–17 AGO',
        total:          Number(order.total),
        cuotasPagadas,
        cuotasTotal,
        montoPagado,
        saldoPendiente: Number(order.total) - montoPagado,
        proximaFecha,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    return res.status(400).send(errorPage('Boleta no disponible', 'El pago aún no ha sido confirmado.'));

  } catch (err: any) {
    console.error('[boleta] ERROR:', err.message);
    return res.status(500).send(errorPage('Error interno', err.message));
  }
}

function errorPage(title: string, detail: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>AIRA · ${title}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#030612;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;color:#fff;text-align:center;padding:24px}
  .wrap{max-width:360px}.logo{font-size:32px;font-weight:700;color:#e1fe52;margin-bottom:24px}h2{margin-bottom:8px}p{color:#666;font-size:14px}</style>
  </head><body><div class="wrap"><div class="logo">AIRA</div><h2>${title}</h2><p>${detail}</p></div></body></html>`;
}
