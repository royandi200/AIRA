// ── BuilderBot Config ────────────────────────────────────────────────────────
const BB_URL    = 'https://app.builderbot.cloud/api/v2/db9e5f53-cc03-4262-ad69-4097ee2d15f0/messages';
const BB_APIKEY = process.env.BUILDERBOT_APIKEY || '';

// ── OTP Utils ────────────────────────────────────────────────────────────────
export function generateOTP(): string {
  // Usar globalThis.crypto (Web Crypto API) — disponible en Node 19+ y Vercel ESM sin imports
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  const num = 100000 + (array[0] % 900000);
  return String(num);
}

export async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data    = encoder.encode(String(otp));
  const hashBuf = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
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
    console.log(`[OTP-FALLBACK] 📱 ${normalized} → ${otp}`);
  }
}
