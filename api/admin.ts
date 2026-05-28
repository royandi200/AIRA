/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return res.status(500).json({ error: 'ADMIN_TOKEN no configurado en el servidor' });
  const token = req.headers['x-admin-token'];
  if (token !== adminToken) return res.status(401).json({ error: 'No autorizado' });

  const section = (req.query.section as string) || 'overview';

  try {
    if (section === 'overview') {

      // ── 1. Recaudo Bold (orders) ────────────────────────────────────────
      const [[boldRevenue]]: any = await pool.query(
        `SELECT
           COALESCE(SUM(total),0)                                          AS total_revenue,
           COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0) AS paid_revenue,
           COUNT(*)                                                        AS total_orders,
           SUM(CASE WHEN status='paid'      THEN 1 ELSE 0 END)           AS paid_orders,
           SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END)           AS pending_orders,
           SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END)           AS cancelled_orders
         FROM orders`
      );

      // ── 2. Recaudo manual (manual_registros) ───────────────────────────
      // Cada fila = 1 persona. monto_recibido = abonado confirmado.
      const [[manualRevenue]]: any = await pool.query(
        `SELECT
           COUNT(*)                                    AS manual_registros,
           COALESCE(SUM(monto_total),    0)            AS manual_total,
           COALESCE(SUM(monto_recibido), 0)            AS manual_recibido,
           COALESCE(SUM(monto_pendiente),0)            AS manual_pendiente
         FROM manual_registros`
      );

      // ── 3. Resumen combinado ────────────────────────────────────────────
      const revenue = {
        // Bold
        total_revenue:      Number(boldRevenue.total_revenue),
        paid_revenue:       Number(boldRevenue.paid_revenue),
        total_orders:       Number(boldRevenue.total_orders),
        paid_orders:        Number(boldRevenue.paid_orders),
        pending_orders:     Number(boldRevenue.pending_orders),
        cancelled_orders:   Number(boldRevenue.cancelled_orders),
        // Manual
        manual_registros:   Number(manualRevenue.manual_registros),
        manual_recibido:    Number(manualRevenue.manual_recibido),
        manual_pendiente:   Number(manualRevenue.manual_pendiente),
        // Totales combinados
        recaudado_total:    Number(boldRevenue.paid_revenue) + Number(manualRevenue.manual_recibido),
        ordenes_total:      Number(boldRevenue.paid_orders)  + Number(manualRevenue.manual_registros),
      };

      // ── 4. Cupos — tickets + manuales activos por paquete ──────────────
      const [tickets]: any = await pool.query(
        `SELECT tt.name, tt.access_type,
                tt.available_qty, tt.sold_qty,
                COALESCE(tt.reserved_qty, 0) AS reserved_qty,
                tt.price
         FROM ticket_types tt ORDER BY tt.id`
      );

      // Manuales activos agrupados por paquete (nombre del ticket_type)
      const [manualByPaquete]: any = await pool.query(
        `SELECT paquete, COUNT(*) AS manual_activos
         FROM manual_registros
         WHERE paquete IS NOT NULL
         GROUP BY paquete`
      );

      // Mapa paquete → count
      const manualMap: Record<string, number> = {};
      for (const row of manualByPaquete) {
        manualMap[row.paquete] = Number(row.manual_activos);
      }

      // Enriquecer tickets con manual_activos y libres reales
      const ticketsEnriquecidos = tickets.map((t: any) => {
        const manual_activos = manualMap[t.name] ?? 0;
        const libres_real    = Math.max(0, t.available_qty - t.sold_qty - t.reserved_qty - manual_activos);
        return { ...t, manual_activos, libres_real };
      });

      // ── 5. Órdenes recientes (Bold + manual combinadas) ────────────────
      const [boldOrders]: any = await pool.query(
        `SELECT o.id, o.order_ref, o.total, o.status, o.payment_mode,
                o.reserved_until, o.created_at, o.codigo_referido,
                u.name AS customer_name, u.email AS customer_email,
                'bold' AS source
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         ORDER BY o.created_at DESC LIMIT 30`
      );

      const [manualOrders]: any = await pool.query(
        `SELECT id, order_ref, monto_total AS total, 'manual' AS status,
                medio_pago AS payment_mode, created_at, null AS reserved_until,
                codigo_referido, nombre AS customer_name, email AS customer_email,
                'manual' AS source
         FROM manual_registros
         ORDER BY created_at DESC LIMIT 20`
      );

      // Mezclar y ordenar por fecha desc
      const recentOrders = [...boldOrders, ...manualOrders]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50);

      // ── 6. Ingresos diarios (Bold confirmado + manual recibido) ─────────
      const [boldDaily]: any = await pool.query(
        `SELECT DATE(created_at) AS day,
                SUM(CASE WHEN status='paid' THEN total ELSE 0 END) AS revenue,
                COUNT(*) AS orders
         FROM orders
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(created_at)
         ORDER BY day ASC`
      );

      const [manualDaily]: any = await pool.query(
        `SELECT DATE(created_at) AS day,
                COALESCE(SUM(monto_recibido), 0) AS revenue,
                COUNT(*) AS orders
         FROM manual_registros
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(created_at)
         ORDER BY day ASC`
      );

      // Combinar diarios por fecha
      const dailyMap: Record<string, { revenue: number; orders: number }> = {};
      for (const r of boldDaily) {
        dailyMap[r.day] = { revenue: Number(r.revenue), orders: Number(r.orders) };
      }
      for (const r of manualDaily) {
        if (dailyMap[r.day]) {
          dailyMap[r.day].revenue += Number(r.revenue);
          dailyMap[r.day].orders  += Number(r.orders);
        } else {
          dailyMap[r.day] = { revenue: Number(r.revenue), orders: Number(r.orders) };
        }
      }
      const dailyRevenue = Object.entries(dailyMap)
        .map(([day, v]) => ({ day, ...v }))
        .sort((a, b) => a.day.localeCompare(b.day));

      return res.status(200).json({
        revenue,
        tickets: ticketsEnriquecidos,
        recentOrders,
        dailyRevenue,
      });
    }

    return res.status(400).json({ error: 'Sección desconocida' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
