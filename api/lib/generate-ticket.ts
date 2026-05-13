import { createHash, randomBytes } from 'crypto';

/** Genera un token único opaco para el QR */
export function generateQRToken(orderRef: string): string {
  const rand = randomBytes(16).toString('hex');
  return createHash('sha256').update(`${orderRef}-${rand}-${Date.now()}`).digest('hex').substring(0, 40);
}

/** Formatea precio COP */
function fmt(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

interface TicketData {
  orderRef: string;
  name: string;
  email: string;
  eventLabel: string;
  days: string;
  isVip: boolean;
  total: number;
  qrToken: string;
  montoPendiente?: number; // opcional: muestra banner si > 0
}

interface ReservaData {
  orderRef: string;
  name: string;
  email: string;
  eventLabel: string;
  days: string;
  total: number;
  cuotasPagadas: number;
  cuotasTotal: number;
  montoPagado: number;
  saldoPendiente: number;
  proximaFecha: string;
}

/** Genera el HTML de la boleta QR (pago completo o parcial con banner) */
export function generateTicketHTML(data: TicketData): string {
  const BASE = 'https://www.viveaira.live';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${BASE}/validate?token=${data.qrToken}`)}&bgcolor=030612&color=e1fe52&margin=12`;
  const hasPendiente = typeof data.montoPendiente === 'number' && data.montoPendiente > 0;

  const pendienteBanner = hasPendiente ? `
  <div class="pending-banner">
    <div class="pending-icon">⚠️</div>
    <div class="pending-text">
      <div class="pending-title">Saldo pendiente: ${fmt(data.montoPendiente!)}</div>
      <div class="pending-sub">Esta boleta es válida. Recuerda completar tu pago para confirmar tu acceso total.</div>
    </div>
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Boleta AIRA · ${data.orderRef}</title>
<style>
  @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#030612;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;font-family:'Satoshi',sans-serif}
  .card{background:#0d1117;border:1px solid #1e2a1a;border-radius:24px;max-width:420px;width:100%;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.6)}
  .header{background:linear-gradient(135deg,#030612 0%,#0a1a0a 100%);padding:28px 28px 20px;border-bottom:1px solid #1e2a1a;display:flex;align-items:center;justify-content:space-between}
  .logo{font-size:28px;font-weight:700;letter-spacing:-.02em;color:#e1fe52}
  .status{background:#e1fe5215;border:1px solid #e1fe5230;color:#e1fe52;font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;padding:4px 12px;border-radius:999px}
  .body{padding:28px}
  .event{font-size:18px;font-weight:700;color:#fff;margin-bottom:4px}
  .meta{font-size:13px;color:#4d7a4a;font-weight:500;letter-spacing:.05em;text-transform:uppercase;margin-bottom:20px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
  .field{background:#111620;border-radius:12px;padding:12px 14px}
  .field-label{font-size:9px;text-transform:uppercase;letter-spacing:.15em;color:#3d5c3a;font-weight:600;margin-bottom:4px}
  .field-value{font-size:13px;font-weight:600;color:#d4f5d0}
  .qr-wrap{display:flex;flex-direction:column;align-items:center;padding:20px;background:#030612;border-radius:16px;margin-bottom:20px;border:1px dashed #1e3a1a}
  .qr-img{width:160px;height:160px;border-radius:8px}
  .qr-hint{font-size:10px;color:#2d4d2a;text-transform:uppercase;letter-spacing:.12em;margin-top:10px}
  .footer{background:#080e0a;padding:16px 28px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #1e2a1a}
  .order-ref{font-size:11px;color:#2d4d2a;font-family:monospace;letter-spacing:.1em}
  .total{font-size:14px;font-weight:700;color:#e1fe52}
  .pending-banner{display:flex;align-items:flex-start;gap:12px;background:#2a1f00;border:1px solid #f5a62340;border-radius:14px;padding:14px 16px;margin-bottom:20px}
  .pending-icon{font-size:20px;flex-shrink:0;margin-top:1px}
  .pending-title{font-size:13px;font-weight:700;color:#f5a623;margin-bottom:3px}
  .pending-sub{font-size:11px;color:#a07030;line-height:1.5}
  ${data.isVip ? '.vip-badge{background:#e1fe52;color:#030612;font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;padding:3px 10px;border-radius:999px;display:inline-block;margin-bottom:12px}' : ''}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="logo">AIRA</div>
    <div class="status">✓ ACCESO CONFIRMADO</div>
  </div>
  <div class="body">
    ${data.isVip ? '<div class="vip-badge">⭐ VIP</div>' : ''}
    <div class="event">${data.eventLabel}</div>
    <div class="meta">15–17 Agosto 2026 · Guatapé</div>
    <div class="grid">
      <div class="field"><div class="field-label">Asistente</div><div class="field-value">${data.name}</div></div>
      <div class="field"><div class="field-label">Día(s)</div><div class="field-value">${data.days}</div></div>
      <div class="field"><div class="field-label">Correo</div><div class="field-value" style="font-size:11px">${data.email}</div></div>
      <div class="field"><div class="field-label">Tipo</div><div class="field-value">${data.isVip ? 'VIP ⭐' : 'General'}</div></div>
    </div>
    ${pendienteBanner}
    <div class="qr-wrap">
      <img class="qr-img" src="${qrUrl}" alt="QR de acceso"/>
      <div class="qr-hint">Muestra este QR en la entrada</div>
    </div>
  </div>
  <div class="footer">
    <div class="order-ref">${data.orderRef}</div>
    <div class="total">${fmt(data.total)}</div>
  </div>
</div>
</body>
</html>`;
}

/** Genera el HTML del comprobante de reserva (pago a cuotas, sin QR) */
export function generateReservaHTML(data: ReservaData): string {
  const progress = Math.round((data.cuotasPagadas / data.cuotasTotal) * 100);
  const fmt2 = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Reserva AIRA · ${data.orderRef}</title>
<style>
  @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#030612;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;font-family:'Satoshi',sans-serif}
  .card{background:#0d1117;border:1px solid #1a1f2e;border-radius:24px;max-width:420px;width:100%;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.6)}
  .header{background:linear-gradient(135deg,#030612 0%,#0a0e1a 100%);padding:28px 28px 20px;border-bottom:1px solid #1a1f2e;display:flex;align-items:center;justify-content:space-between}
  .logo{font-size:28px;font-weight:700;letter-spacing:-.02em;color:#e1fe52}
  .status{background:#f5a62315;border:1px solid #f5a62330;color:#f5a623;font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;padding:4px 12px;border-radius:999px}
  .body{padding:28px}
  .event{font-size:18px;font-weight:700;color:#fff;margin-bottom:4px}
  .meta{font-size:13px;color:#4d607a;font-weight:500;letter-spacing:.05em;text-transform:uppercase;margin-bottom:20px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
  .field{background:#111620;border-radius:12px;padding:12px 14px}
  .field-label{font-size:9px;text-transform:uppercase;letter-spacing:.15em;color:#3d4d6a;font-weight:600;margin-bottom:4px}
  .field-value{font-size:13px;font-weight:600;color:#c8d8f0}
  .lock-wrap{display:flex;flex-direction:column;align-items:center;padding:24px 20px;background:#030612;border-radius:16px;margin-bottom:20px;border:1px dashed #1a2a3a}
  .lock-icon{font-size:48px;margin-bottom:8px}
  .lock-title{font-size:14px;font-weight:700;color:#c8d8f0;margin-bottom:4px}
  .lock-sub{font-size:11px;color:#3d5a7a;text-align:center;max-width:240px;line-height:1.6}
  .progress-wrap{margin-bottom:20px}
  .progress-label{display:flex;justify-content:space-between;font-size:11px;color:#4d607a;margin-bottom:6px}
  .progress-bar{height:6px;background:#1a1f2e;border-radius:999px;overflow:hidden}
  .progress-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#f5a623,#e1fe52);width:${progress}%}
  .footer{background:#080e16;padding:16px 28px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #1a1f2e}
  .order-ref{font-size:11px;color:#2d4060;font-family:monospace;letter-spacing:.1em}
  .total{font-size:14px;font-weight:700;color:#f5a623}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="logo">AIRA</div>
    <div class="status">🔒 RESERVA ACTIVA</div>
  </div>
  <div class="body">
    <div class="event">${data.eventLabel}</div>
    <div class="meta">15–17 Agosto 2026 · Guatapé</div>
    <div class="grid">
      <div class="field"><div class="field-label">Asistente</div><div class="field-value">${data.name}</div></div>
      <div class="field"><div class="field-label">Día(s)</div><div class="field-value">${data.days}</div></div>
      <div class="field"><div class="field-label">Pagado</div><div class="field-value" style="color:#e1fe52">${fmt2(data.montoPagado)}</div></div>
      <div class="field"><div class="field-label">Saldo</div><div class="field-value" style="color:#f5a623">${fmt2(data.saldoPendiente)}</div></div>
    </div>
    <div class="progress-wrap">
      <div class="progress-label"><span>Cuota ${data.cuotasPagadas} de ${data.cuotasTotal}</span><span>${progress}%</span></div>
      <div class="progress-bar"><div class="progress-fill"></div></div>
    </div>
    <div class="lock-wrap">
      <div class="lock-icon">🔐</div>
      <div class="lock-title">QR pendiente</div>
      <div class="lock-sub">Tu código de acceso se generará automáticamente al completar el pago total.<br/>Próximo cobro: <strong style="color:#f5a623">${data.proximaFecha}</strong></div>
    </div>
  </div>
  <div class="footer">
    <div class="order-ref">${data.orderRef}</div>
    <div class="total">Total: ${fmt2(data.total)}</div>
  </div>
</div>
</body>
</html>`;
}
