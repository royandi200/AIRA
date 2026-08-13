/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Pool } from 'mysql2/promise';
import { createHash } from 'crypto';

/**
 * Columnas de consentimiento en manual_registros + tabla de auditoria
 * myapp_consentimientos (queda un registro aparte, con IP/user-agent,
 * como evidencia de aceptacion — no depende solo del campo en
 * manual_registros por si algun dia se reimporta esa tabla).
 *
 * content_hash: SHA-256 del texto legal completo (clausulas +
 * declaraciones) tal como existia en el momento de la aceptacion.
 * Sirve como huella inmutable independiente de futuras ediciones del
 * texto en el codigo — si alguien pregunta "esto es lo que acepte?",
 * se puede recalcular el hash del texto vigente y compararlo.
 *
 * OJO: este MySQL/MariaDB no soporta "ADD COLUMN IF NOT EXISTS" (ver
 * error #1064 ya visto con va_en_bus) — cada ALTER va envuelto en su
 * propio catch para que sea idempotente sin esa clausula.
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
      content_hash VARCHAR(64) NULL,
      ip          VARCHAR(64)  NULL,
      user_agent  VARCHAR(300) NULL,
      accepted_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});

  await pool.query(`ALTER TABLE myapp_consentimientos ADD COLUMN content_hash VARCHAR(64) NULL`).catch(() => {});
}

export const CONSENT_VERSION = '2026-08';

/**
 * Texto legal completo (clausulas + declaraciones) usado para calcular
 * el hash de integridad. Debe mantenerse en sincronia con el contenido
 * real mostrado en MyAppConsent.tsx — si se edita el texto ahi, este
 * mismo texto se debe actualizar aqui para que el hash siga siendo fiel
 * a lo que el usuario ve y acepta.
 */
export function hashConsentText(fullText: string): string {
  return createHash('sha256').update(fullText, 'utf8').digest('hex');
}
