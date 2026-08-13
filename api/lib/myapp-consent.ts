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
 *
 * content_text: el texto legal completo EN CRUDO, archivado tal cual
 * en cada fila. Sin esto, el hash por si solo no sirve para nada una
 * vez el documento cambie en el codigo (no hay contra que comparar).
 * Con content_text guardado, cada aceptacion queda autocontenida: se
 * puede recalcular sha256(content_text) y verificar que sigue
 * coincidiendo con content_hash, sin depender de ningun archivo
 * externo ni de que el codigo actual siga teniendo ese texto.
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
      content_text LONGTEXT NULL,
      ip          VARCHAR(64)  NULL,
      user_agent  VARCHAR(300) NULL,
      accepted_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});

  await pool.query(`ALTER TABLE myapp_consentimientos ADD COLUMN content_hash VARCHAR(64) NULL`).catch(() => {});
  await pool.query(`ALTER TABLE myapp_consentimientos ADD COLUMN content_text LONGTEXT NULL`).catch(() => {});
}

export const CONSENT_VERSION = '2026-08';

/** SHA-256 del texto legal completo aceptado, para verificar integridad. */
export function hashConsentText(fullText: string): string {
  return createHash('sha256').update(fullText, 'utf8').digest('hex');
}
