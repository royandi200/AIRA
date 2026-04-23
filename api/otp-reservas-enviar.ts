/**
 * POST /api/otp-reservas-enviar
 * Envía OTP por WhatsApp (phone) o por email para consultar reservas.
 * NO requiere que el usuario esté en whitelist — cualquiera puede intentar.
 * Si tiene órdenes en la BD, recibe el código.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';
import { generateOTP, hashOTP, otpExpiresAt, sendOTPWhatsApp } from './lib/otp.js';
const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASS, database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT)||3306,
  waitForConnections: true, connectionLimit: 10,
  ssl: { rejectUnauthorized: false },
});

const MAX_PER_HOUR = 5;

async function sendEmailOTP(email: string, otp: string) {
  // Log siempre para debug
  console.log(`[OTP-EMAIL] ${email} -> ${otp}`);
  // Si hay Resend API key configurado, enviar email real
  if (process.env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'AIRA Festival <noreply@viveaira.live>',
        to: [email],
        subject: `${otp} — Tu código AIRA`,
        html: `<div style="font-family:sans-serif;max-width:400px;margin:auto;padding:32px;background:#08101f;color:#fff;border-radius:16px"><h2 style="color:#e1fe52">AIRA Festival</h2><p style="color:#ffffff80">Tu código de verificación:</p><div style="background:#ffffff10;border:1px solid #e1fe5230;border-radius:12px;padding:24px;text-align:center"><span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#e1fe52">${otp}</span></div><p style="color:#ffffff40;font-size:12px">Válido por 10 minutos.</p></div>`,
      }),
    });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, email } = req.body as { phone?: string; email?: string };
  if (!phone && !email) return res.status(400).json({ error: 'phone o email requerido' });

  const isEmail    = Boolean(email);
  const identifier = isEmail ? email!.trim().toLowerCase() : String(phone).replace(/\D/g,'');

  if (!isEmail && identifier.length < 7) return res.status(400).json({ error: 'Número inválido' });
  if (isEmail && !identifier.includes('@')) return res.status(400).json({ error: 'Email inválido' });

  try {
    // Crear tabla si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS otp_reservas_tokens (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        identifier  VARCHAR(200) NOT NULL,
        otp_hash    VARCHAR(64)  NOT NULL,
        intentos    TINYINT      NOT NULL DEFAULT 0,
        usado       TINYINT(1)   NOT NULL DEFAULT 0,
        bloqueado   TINYINT(1)   NOT NULL DEFAULT 0,
        expires_at  DATETIME     NOT NULL,
        created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ident (identifier)
      ) ENGINE=InnoDB
    `);

    // Rate limit por hora
    const [rateRows]: any = await pool.query(
      `SELECT COUNT(*) as total FROM otp_reservas_tokens
       WHERE identifier = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [identifier]
    );
    if (rateRows[0]?.total >= MAX_PER_HOUR) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera una hora.' });
    }

    // Invalidar OTPs anteriores
    await pool.query(
      `UPDATE otp_reservas_tokens SET usado=1 WHERE identifier=? AND usado=0`,
      [identifier]
    );

    // Generar y guardar nuevo OTP
    const otp     = generateOTP();
    const otpHash = await hashOTP(otp);
    const expires = otpExpiresAt();

    await pool.query(
      `INSERT INTO otp_reservas_tokens (identifier, otp_hash, expires_at) VALUES (?,?,?)`,
      [identifier, otpHash, expires]
    );

    // Enviar
    if (isEmail) {
      await sendEmailOTP(identifier, otp);
    } else {
      await sendOTPWhatsApp(identifier, otp);
    }

    return res.status(200).json({
      ok: true,
      message: isEmail ? 'Código enviado a tu email' : 'Código enviado por WhatsApp',
    });
  } catch (err: any) {
    console.error('[otp-reservas-enviar]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
