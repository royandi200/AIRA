/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Pool } from 'mysql2/promise';

/**
 * Columnas de consentimiento en manual_registros + tabla de auditoría
 * myapp_consentimientos (queda un registro aparte, con IP/user-agent,
 * como evidencia de aceptación — no depende solo del campo en
 * manual_registros por si algún día se reimporta esa tabla).
 *
 * OJO: este MySQL/MariaDB no soporta "ADD COLUMN IF NOT EXISTS" (ver
 * error #1064 ya visto con va_en_bus) — cada ALTER va envuelto en su
 * propio catch para que sea idempotente sin esa cláusula.
 */
export async function ensureConsentSchema(pool: Pool) {
  const alters = [
    `ALTER TABLE manual_registros ADD COLUMN consent_accepted_at DATETIME NULL`,
    `ALTER TABLE manual_registros ADD COLUMN contacto_emergencia_nombre VARCHAR(150) NULL`,
    `ALTER TABLE manual_registros ADD COLUMN contacto_emergencia_telefono VARCHAR(30) NULL`,
    `ALTER TABLE manual_registros ADD COLUMN condiciones_medicas TEXT NULL`,
  ];
  for (const sql of alters) await pool.query(sql).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS myapp_consentimientos (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_ref   VARCHAR(50)  NOT NULL,
      nombre      VARCHAR(200) NOT NULL,
      version     VARCHAR(20)  NOT NULL DEFAULT '2026-08',
      ip          VARCHAR(64)  NULL,
      user_agent  VARCHAR(300) NULL,
      accepted_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
}

export const CONSENT_VERSION = '2026-08';
