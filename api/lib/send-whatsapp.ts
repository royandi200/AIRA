// ── WhatsApp via BuilderBot ───────────────────────────────────────────────────
const BB_URL    = 'https://app.builderbot.cloud/api/v2/db9e5f53-cc03-4262-ad69-4097ee2d15f0/messages';
const BB_APIKEY = process.env.BUILDERBOT_APIKEY || 'bb-53ce55a9-fe8a-4189-a839-10222f6d1b1a';

function normalizePhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  return clean.startsWith('57') ? clean : `57${clean}`;
}

export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const normalized = normalizePhone(phone);
  console.log(`[BuilderBot] Enviando WA a ${normalized}`);
  try {
    const res = await fetch(BB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-builderbot': BB_APIKEY },
      body: JSON.stringify({ messages: { content: message }, number: normalized, checkIfExists: false }),
    });
    const text = await res.text();
    if (!res.ok) console.error(`[BuilderBot] ERROR ${res.status}:`, text);
    else console.log(`[BuilderBot] OK → ${normalized}`);
  } catch (err: any) {
    console.error('[BuilderBot] fetch fallo:', err.message);
  }
}

/**
 * Envía la boleta QR por WhatsApp cuando el pago está completo.
 */
export async function sendTicketWhatsApp(params: {
  phone: string;
  name: string;
  orderRef: string;
  eventLabel: string;
  qrToken: string;
}): Promise<void> {
  const { phone, name, orderRef, eventLabel, qrToken } = params;
  const BASE      = 'https://www.viveaira.live';
  const boletaUrl = `${BASE}/boleta/${orderRef}?token=${qrToken}`;

  const msg =
    `✅ *¡Tu boleta AIRA está lista!*\n\n` +
    `Hola ${name} 🎉\n` +
    `Orden: *${orderRef}*\n` +
    `Evento: *${eventLabel}*\n\n` +
    `📲 Descarga tu boleta con QR aquí:\n${boletaUrl}\n\n` +
    `Guarda este mensaje — lo necesitas para ingresar al festival.\n` +
    `📍 *AIRA Experience · 15–17 Agosto 2026 · Guatapé*`;

  await sendWhatsApp(phone, msg);
}

/**
 * Envía el comprobante de reserva (sin QR) cuando se paga una cuota parcial.
 * Incluye link al comprobante web para que el cliente pueda consultarlo.
 */
export async function sendReservaWhatsApp(params: {
  phone: string;
  name: string;
  orderRef: string;
  eventLabel: string;
  cuotasPagadas: number;
  cuotasTotal: number;
  montoPagado: number;
  saldoPendiente: number;
  proximaFecha: string;
}): Promise<void> {
  const { phone, name, orderRef, eventLabel, cuotasPagadas, cuotasTotal,
          montoPagado, saldoPendiente, proximaFecha } = params;

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  const BASE          = 'https://www.viveaira.live';
  const comprobanteUrl = `${BASE}/boleta/${orderRef}`;

  const msg =
    `🔒 *Reserva AIRA confirmada*\n\n` +
    `Hola ${name}\n` +
    `Orden: *${orderRef}*\n` +
    `Evento: *${eventLabel}*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💳 Cuota ${cuotasPagadas} de ${cuotasTotal} pagada\n` +
    `✅ Pagado hoy: *${fmt(montoPagado)}*\n` +
    `⏳ Saldo pendiente: *${fmt(saldoPendiente)}*\n` +
    `📅 Próximo cobro: *${proximaFecha}*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📄 Ver tu comprobante de reserva:\n${comprobanteUrl}\n\n` +
    `⚠️ Tu *QR de acceso* se generará automáticamente cuando completes el pago total.\n\n` +
    `📍 *AIRA Experience · 15–17 Agosto 2026 · Guatapé*`;

  await sendWhatsApp(phone, msg);
}
