// ── BuilderBot Config ────────────────────────────────────────────────────────
const BB_URL    = 'https://app.builderbot.cloud/api/v2/f19bc71c-a140-4caf-af9a-714ae61c23a5/messages';
const BB_APIKEY = process.env.BUILDERBOT_APIKEY || 'bb-5d2c154a-2668-4076-a65a-8c6247ae97ea';

// ── OTP Utils ────────────────────────────────────────────────────────────────
export function generateOTP(): string {
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

  console.log(`[BuilderBot] Enviando OTP a ${normalized}...`);

  try {
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

    const responseText = await res.text();
    if (!res.ok) {
      console.error(`[BuilderBot] ERROR ${res.status}:`, responseText);
      throw new Error(`BuilderBot ${res.status}: ${responseText}`);
    }

    console.log(`[BuilderBot] OK OTP enviado a ${normalized}:`, responseText);
  } catch (err: any) {
    console.error(`[BuilderBot] fetch fallo:`, err.message);
    console.log(`[OTP-FALLBACK] ${normalized} -> ${otp}`);
  }
}
