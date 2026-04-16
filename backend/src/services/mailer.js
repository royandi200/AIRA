import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendTicketEmail({ order, items }) {
  // Generar QR en base64 para el primer item principal
  const mainItem = items.find(i => i.type !== 'addon') || items[0];
  const qrData   = JSON.stringify({
    id:    mainItem.qr_code,
    event: order.event_name,
    date:  order.event_date,
    label: mainItem.label,
    qty:   mainItem.quantity,
    name:  order.name,
  });
  const qrBase64 = await QRCode.toDataURL(qrData);

  const itemsList = items
    .map(i => `<li style="margin-bottom:8px"><strong>${i.label}</strong> × ${i.quantity}</li>`)
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#030612;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#08101f;border-radius:24px;border:1px solid rgba(255,255,255,0.1);overflow:hidden">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0a1628 0%,#091520 100%);padding:40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08)">
          <p style="font-family:monospace;font-size:10px;letter-spacing:.35em;color:#e1fe52;text-transform:uppercase;margin:0 0 12px">AIRA Events</p>
          <h1 style="font-size:36px;color:#fff;margin:0 0 8px;font-weight:700">¡Tu boleta está lista! 🎉</h1>
          <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0">${order.event_name} · ${order.venue}</p>
        </td></tr>
        <!-- Evento -->
        <tr><td style="padding:32px 40px">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);overflow:hidden">
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06)">
                <p style="font-size:10px;font-family:monospace;letter-spacing:.2em;color:rgba(255,255,255,0.35);text-transform:uppercase;margin:0 0 4px">Comprador</p>
                <p style="font-size:15px;color:#fff;margin:0;font-weight:600">${order.name}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06)">
                <p style="font-size:10px;font-family:monospace;letter-spacing:.2em;color:rgba(255,255,255,0.35);text-transform:uppercase;margin:0 0 4px">Fecha del evento</p>
                <p style="font-size:15px;color:#fff;margin:0">${new Date(order.event_date).toLocaleDateString('es-CO',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px">
                <p style="font-size:10px;font-family:monospace;letter-spacing:.2em;color:rgba(255,255,255,0.35);text-transform:uppercase;margin:0 0 8px">Tu selección</p>
                <ul style="padding:0;margin:0;list-style:none;color:rgba(255,255,255,0.8);font-size:14px">${itemsList}</ul>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- QR -->
        <tr><td style="padding:0 40px 32px;text-align:center">
          <p style="font-size:10px;font-family:monospace;letter-spacing:.25em;color:rgba(255,255,255,0.35);text-transform:uppercase;margin:0 0 16px">Código QR · Presenta en entrada</p>
          <img src="${qrBase64}" alt="QR Boleta" width="200" height="200" style="border-radius:16px;border:4px solid rgba(225,254,82,0.3)" />
          <p style="font-family:monospace;font-size:10px;color:rgba(255,255,255,0.2);margin:12px 0 0;word-break:break-all">${mainItem.qr_code}</p>
        </td></tr>
        <!-- Total -->
        <tr><td style="padding:0 40px 32px">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:16px;background:rgba(225,254,82,0.06);border:1px solid rgba(225,254,82,0.2);padding:20px">
            <tr>
              <td><p style="font-size:10px;font-family:monospace;letter-spacing:.2em;color:rgba(225,254,82,0.6);text-transform:uppercase;margin:0 0 4px">Total pagado</p><p style="font-size:28px;color:#e1fe52;font-weight:700;margin:0">${new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(order.total)}</p></td>
              <td style="text-align:right"><p style="font-size:10px;font-family:monospace;letter-spacing:.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;margin:0 0 4px">Orden #</p><p style="font-size:20px;color:rgba(255,255,255,0.6);font-weight:600;margin:0">${order.id}</p></td>
            </tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
          <p style="font-size:11px;color:rgba(255,255,255,0.2);margin:0">AIRA Events · Guatapé, Colombia · <a href="https://airaevents.co" style="color:rgba(225,254,82,0.5)">airaevents.co</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    process.env.MAIL_FROM || 'AIRA Events <hola@airaevents.co>',
    to:      order.email,
    subject: `🎟 Tus boletas para ${order.event_name} — AIRA`,
    html,
  });

  console.log(`[MAILER] Email de boletas enviado a ${order.email}`);
}
