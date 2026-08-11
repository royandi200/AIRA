// ── BuilderBot Config ────────────────────────────────────────────────────────
const BB_URL    = 'https://app.builderbot.cloud/api/v2/db9e5f53-cc03-4262-ad69-4097ee2d15f0/messages';
const BB_APIKEY = process.env.BUILDERBOT_APIKEY || 'bb-53ce55a9-fe8a-4189-a839-10222f6d1b1a';

// ── WebSSenger (crwave.com.co) — SMS OTP ────────────────────────────────────
// Mismo servicio y token que usa v0-distriofertas para su OTP por SMS.
// Solo la usa el login de /myapp (myapp-auth-enviar.ts) — el OTP del
// checkout de boletas sigue por WhatsApp (sendOTPWhatsApp), sin tocar.
const SMS_OTP_URL   = 'https://crwave.com.co/client/api/v1/sms/otp/';
const SMS_OTP_TOKEN = process.env.OTP_Distriofertas || '';

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

/** Envía el OTP por SMS vía WebSSenger — usado solo por el login de /myapp */
export async function sendOTPSms(phone: string, otp: string): Promise<void> {
  const normalized = phone.startsWith('57') ? phone : `57${phone}`;
  const mensaje = `AIRA: tu codigo de verificacion es ${otp}. Vence en 10 minutos. No lo compartas.`;

  if (!SMS_OTP_TOKEN) {
    console.log(`[OTP-CONSOLE] (falta OTP_Distriofertas) Teléfono: ${normalized} | Código: ${otp}`);
    return;
  }

  try {
    const res = await fetch(SMS_OTP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${SMS_OTP_TOKEN}`,
      },
      body: JSON.stringify({
        phone_number: normalized,
        message: mensaje,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[WebSSenger SMS OTP error] status=${res.status} body=${err.slice(0, 300)}`);
      console.log(`[OTP-FALLBACK] ${normalized} -> ${otp}`);
      return;
    }
    console.log(`[WebSSenger SMS OTP OK] Enviado a ${normalized}`);
  } catch (err: any) {
    console.error(`[WebSSenger SMS OTP fetch error]`, err.message);
    console.log(`[OTP-FALLBACK] ${normalized} -> ${otp}`);
  }
}
