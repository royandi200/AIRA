import crypto from 'crypto';

// ── BuilderBot Config ────────────────────────────────────────────────────────
const BB_URL    = 'https://app.builderbot.cloud/api/v2/db9e5f53-cc03-4262-ad69-4097ee2d15f0/messages';
const BB_APIKEY = process.env.BUILDERBOT_APIKEY || '';

// ── OTP Utils ────────────────────────────────────────────────────────────────
export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

export function otpExpiresAt(): Date {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 min
}

// ── WhatsApp via BuilderBot ───────────────────────────────────────────────────
export async function sendOTPWhatsApp(phone: string, otp: string): Promise<void> {
  const normalized = phone.startsWith('57') ? phone : `57${phone}`;

  const mensaje =
    `🎟️ *AIRA Festival* — Tu código de verificación es:\n\n` +
    `*${otp}*\n\n` +
    `Vence en 10 minutos. No lo compartas con nadie.`;

  if (!BB_APIKEY) {
    console.log(`[OTP-CONSOLE] 📱 ${normalized} → ${otp}`);
    return;
  }

  const res = await fetch(BB_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-builderbot': BB_APIKEY,
    },
    body: JSON.stringify({
      messages: { content: mensaje },
      number: normalized,
      checkIfExists: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[BuilderBot OTP error]', err);
    // No lanzar error — OTP ya guardado en BD, usuario puede reenviar
    console.log(`[OTP-FALLBACK] 📱 ${normalized} → ${otp}`);
  }
}
