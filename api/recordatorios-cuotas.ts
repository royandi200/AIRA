/**
 * POST /api/recordatorios-cuotas
 * Envía recordatorios WhatsApp para cuotas que vencen en 3 días o 1 día.
 * Protegido por CRON_SECRET para llamadas automáticas.
 * También acepta x-admin-key para disparo manual desde Admin.
 *
 * Agrega columnas a abono_payments si no existen:
 *   reminder_3d_sent TINYINT DEFAULT 0
 *   reminder_1d_sent TINYINT DEFAULT 0
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';

const BB_URL    = 'https://app.builderbot.cloud/api/v2/f19bc71c-a140-4caf-af9a-714ae61c23a5/messages';
const BB_APIKEY = process.env.BUILDERBOT_APIKEY || 'bb-5d2c154a-2668-4076-a65a-8c6247ae97ea';

const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASS, database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true, connectionLimit: 10,
  ssl: { rejectUnauthorized: false },
});

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: Date) =>
  d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const normalized = String(phone).replace(/\D/g, '');
  const number = normalized.startsWith('57') ? normalized : `57${normalized}`;
  try {
    const res = await fetch(BB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-builderbot': BB_APIKEY },
      body: JSON.stringify({ messages: { content: message }, number, checkIfExists: false }),
    });
    const txt = await res.text();
    console.log(`[WA] ${number} → ${res.status}: ${txt.slice(0, 80)}`);
    return res.ok;
  } catch (err: any) {
    console.error(`[WA] Error ${number}:`, err.message);
    return false;
  }
}

async function ensureColumns() {
  for (const col of ['reminder_3d_sent', 'reminder_1d_sent']) {
    try {
      await pool.query(`ALTER TABLE abono_payments ADD COLUMN ${col} TINYINT(1) NOT NULL DEFAULT 0`);
      console.log(`[migrate] columna ${col} creada`);
    } catch { /* ya existe */ }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: cron secret o admin key
  const cronSecret  = process.env.CRON_SECRET;
  const adminKey    = process.env.ADMIN_SECRET;
  const authHeader  = req.headers['authorization'] || '';
  const adminHeader = req.headers['x-admin-key']   || '';

  const isCron  = cronSecret  && authHeader === `Bearer ${cronSecret}`;
  const isAdmin = adminKey    && adminHeader === adminKey;

  if (!isCron && !isAdmin) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const dryRun = req.query.dry === '1' || req.body?.dry === true;

  try {
    await ensureColumns();

    const log: string[] = [];
    let enviados = 0, errores = 0;

    // ── Cuotas que vencen en ~3 días (entre 2.5 y 3.5 días) ────────────────
    const [cuotas3d]: any = await pool.query(
      `SELECT ap.id, ap.cuota_number, ap.amount, ap.due_date,
              o.order_ref, o.total, o.payment_mode,
              u.name AS buyer_name, u.phone AS buyer_phone,
              e.name AS event_name,
              pl.cuotas AS total_cuotas
       FROM abono_payments ap
       JOIN orders o      ON o.id = ap.order_id
       JOIN users u       ON u.id = o.user_id
       JOIN events e      ON e.id = o.event_id
       JOIN abono_plans pl ON pl.id = ap.abono_plan_id
       WHERE ap.status = 'pending'
         AND ap.reminder_3d_sent = 0
         AND ap.due_date BETWEEN
               DATE_ADD(CURDATE(), INTERVAL 2 DAY)
           AND DATE_ADD(CURDATE(), INTERVAL 4 DAY)
       ORDER BY ap.due_date ASC
       LIMIT 200`
    );

    // ── Cuotas que vencen mañana ────────────────────────────────────────────
    const [cuotas1d]: any = await pool.query(
      `SELECT ap.id, ap.cuota_number, ap.amount, ap.due_date,
              o.order_ref, o.total, o.payment_mode,
              u.name AS buyer_name, u.phone AS buyer_phone,
              e.name AS event_name,
              pl.cuotas AS total_cuotas
       FROM abono_payments ap
       JOIN orders o      ON o.id = ap.order_id
       JOIN users u       ON u.id = o.user_id
       JOIN events e      ON e.id = o.event_id
       JOIN abono_plans pl ON pl.id = ap.abono_plan_id
       WHERE ap.status = 'pending'
         AND ap.reminder_1d_sent = 0
         AND ap.due_date BETWEEN
               CURDATE()
           AND DATE_ADD(CURDATE(), INTERVAL 1 DAY)
       ORDER BY ap.due_date ASC
       LIMIT 200`
    );

    log.push(`📋 Cuotas a 3 días: ${cuotas3d.length} | Cuotas a 1 día: ${cuotas1d.length}`);

    // Procesar 3 días
    for (const c of cuotas3d) {
      if (!c.buyer_phone) { log.push(`⚠ Sin teléfono: ${c.order_ref}`); continue; }
      const due = fmtDate(new Date(c.due_date));
      const msg =
        `🎟️ *AIRA Festival* — Recordatorio de pago\n\n` +
        `Hola ${c.buyer_name?.split(' ')[0] || 'amig@'}, te recordamos que tu cuota ${c.cuota_number} de ${c.total_cuotas} vence en *3 días*.\n\n` +
        `📅 Fecha límite: *${due}*\n` +
        `💰 Monto: *${fmt(c.amount)}*\n` +
        `🎫 Reserva: ${c.order_ref}\n\n` +
        `Ingresa a 👉 *www.viveaira.live* sección Booking → *Mis reservas* para pagar fácil y rápido.\n\n` +
        `_No respondas este mensaje._`;

      log.push(`→ [3d] ${c.order_ref} cuota ${c.cuota_number} | ${c.buyer_phone}`);
      if (!dryRun) {
        const ok = await sendWhatsApp(c.buyer_phone, msg);
        if (ok) {
          await pool.query(`UPDATE abono_payments SET reminder_3d_sent=1 WHERE id=?`, [c.id]);
          enviados++;
        } else { errores++; }
      } else { enviados++; }
    }

    // Procesar 1 día
    for (const c of cuotas1d) {
      if (!c.buyer_phone) { log.push(`⚠ Sin teléfono: ${c.order_ref}`); continue; }
      const due = fmtDate(new Date(c.due_date));
      const msg =
        `⚠️ *AIRA Festival* — ¡Tu cuota vence mañana!\n\n` +
        `${c.buyer_name?.split(' ')[0] || 'Hola'}, tu cuota ${c.cuota_number} de ${c.total_cuotas} vence *mañana ${due}*.\n\n` +
        `💰 Monto: *${fmt(c.amount)}*\n` +
        `🎫 Reserva: ${c.order_ref}\n\n` +
        `👉 Paga ahora en *www.viveaira.live* → Booking → *Mis reservas* para no perder tu cupo.\n\n` +
        `_No respondas este mensaje._`;

      log.push(`→ [1d] ${c.order_ref} cuota ${c.cuota_number} | ${c.buyer_phone}`);
      if (!dryRun) {
        const ok = await sendWhatsApp(c.buyer_phone, msg);
        if (ok) {
          await pool.query(`UPDATE abono_payments SET reminder_1d_sent=1 WHERE id=?`, [c.id]);
          enviados++;
        } else { errores++; }
      } else { enviados++; }
    }

    const result = {
      ok: true, dryRun,
      total: cuotas3d.length + cuotas1d.length,
      enviados, errores, log,
    };

    console.log('[recordatorios-cuotas]', JSON.stringify({ enviados, errores, dryRun }));
    return res.status(200).json(result);

  } catch (err: any) {
    console.error('[recordatorios-cuotas]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
