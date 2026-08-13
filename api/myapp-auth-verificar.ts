/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { randomBytes } from 'crypto';
import { hashOTP } from './lib/otp.js';

/**
 * Login de /myapp — paso 2: verificar OTP y abrir sesión.
 * Crea un token de sesión propio (myapp_sessions, 30 días) — no toca
 * el sistema de otp_tokens/checkout de boletas.
 *
 * Fuente única de verdad: manual_registros (igual que el scanner de
 * la puerta en validate-qr.ts).
 */

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASS,
  database:           process.env.DB_NAME,
  port:               Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  ssl:                { rejectUnauthorized: false },
});

const MAX_INTENTOS  = 3;
const SESSION_DAYS  = 7;

async function ensureSessionTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS myapp_sessions (
      token       VARCHAR(64)  PRIMARY KEY,
      phone       VARCHAR(30)  NOT NULL,
      order_ref   VARCHAR(50)  NOT NULL,
      name        VARCHAR(150) NOT NULL,
      source      VARCHAR(10)  NOT NULL,
      expires_at  DATETIME     NOT NULL,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // La tabla ya existía con order_ref VARCHAR(20) — los order_ref del
  // import masivo (AIRA-M-...) son más largos y quedaban truncados en
  // silencio al guardar la sesión, rompiendo el refresh (myapp-me) justo
  // después del login. Se ensancha la columna si aún no lo está.
  await pool.query(`ALTER TABLE myapp_sessions MODIFY COLUMN order_ref VARCHAR(50) NOT NULL`).catch(() => {});
}

// Mismo criterio que myapp-auth-enviar.ts: match por los últimos 10
// dígitos, porque la BD tiene teléfonos guardados en formatos distintos.
function last10(phone: string): string {
  return phone.slice(-10);
}

interface AttendeeFull {
  order_ref: string;
  name: string;
  is_vip: boolean;
  qr_token: string | null;
  paquete: string | null;
  monto_pendiente: number;
  consent_accepted_at: string | null;
}

async function findAttendeeFull(phone: string): Promise<AttendeeFull | null> {
  const suffix = last10(phone);
  const [rows]: any = await pool.query(
    `SELECT order_ref, nombre AS name, qr_token, paquete, monto_pendiente, consent_accepted_at
     FROM manual_registros WHERE movil LIKE CONCAT('%', ?) ORDER BY created_at DESC LIMIT 1`,
    [suffix]
  );
  if (!rows.length) return null;

  const r = rows[0];
  return {
    order_ref:       r.order_ref,
    name:            r.name,
    // TODO: definir con el negocio qué paquetes cuentan como VIP
    // (ej. "Suite Privada", "Pass VIP") -- por ahora nadie es VIP
    // automáticamente hasta que se confirme el mapeo.
    is_vip:          false,
    qr_token:        r.qr_token || null,
    paquete:         r.paquete || null,
    monto_pendiente: Number(r.monto_pendiente || 0),
    consent_accepted_at: r.consent_accepted_at || null,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, otp } = req.body as Record<string, any>;
  if (!phone || !otp) return res.status(400).json({ error: 'phone y otp son requeridos' });

  const phoneClean = String(phone).replace(/\D/g, '');

  try {
    await ensureSessionTable();

    const [tokens]: any = await pool.query(
      `SELECT id, otp_hash, intentos, bloqueado, expires_at FROM myapp_otp_tokens
       WHERE phone = ? AND usado = 0 ORDER BY created_at DESC LIMIT 1`,
      [phoneClean]
    );
    if (!tokens.length) return res.status(400).json({ error: 'No hay código activo. Solicita uno nuevo.' });
    const token = tokens[0];

    if (token.bloqueado) {
      return res.status(429).json({ error: 'Demasiados intentos fallidos. Solicita un nuevo código.' });
    }
    if (new Date(token.expires_at) < new Date()) {
      return res.status(410).json({ error: 'El código expiró. Solicita uno nuevo.' });
    }

    const otpHash = await hashOTP(String(otp));
    if (token.otp_hash !== otpHash) {
      const newIntentos = token.intentos + 1;
      const bloquear    = newIntentos >= MAX_INTENTOS ? 1 : 0;
      await pool.query('UPDATE myapp_otp_tokens SET intentos = ?, bloqueado = ? WHERE id = ?', [newIntentos, bloquear, token.id]);
      const restantes = MAX_INTENTOS - newIntentos;
      return res.status(401).json({
        error: bloquear ? 'Bloqueado por intentos fallidos. Solicita un nuevo código.' : `Código incorrecto. ${restantes} intento(s) restante(s).`,
      });
    }

    await pool.query('UPDATE myapp_otp_tokens SET usado = 1 WHERE id = ?', [token.id]);

    const attendee = await findAttendeeFull(phoneClean);
    if (!attendee) return res.status(404).json({ error: 'No encontramos tu boleta. Contacta soporte.' });

    const sessionToken = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO myapp_sessions (token, phone, order_ref, name, source, expires_at) VALUES (?, ?, ?, ?, 'manual', ?)`,
      [sessionToken, phoneClean, attendee.order_ref, attendee.name, expiresAt]
    );

    // El QR solo se entrega como "activo" si no hay saldo pendiente —
    // si debe plata, el frontend muestra el saldo en vez del QR.
    const hasBalance = attendee.monto_pendiente > 0;

    return res.status(200).json({
      ok: true,
      token: sessionToken,
      attendee: {
        name:           attendee.name,
        orderRef:       attendee.order_ref,
        isVip:          attendee.is_vip,
        qrToken:        hasBalance ? null : attendee.qr_token,
        paquete:        attendee.paquete,
        montoPendiente: attendee.monto_pendiente,
        consentAcceptedAt: attendee.consent_accepted_at,
        emergencyName: null,
        emergencyPhone: null,
        medicalConditions: null,
      },
    });
  } catch (err: any) {
    console.error('[myapp-auth-verificar]', err.message);
    return res.status(500).json({ error: 'Error interno al verificar el código' });
  }
}
