import type { Pool } from 'mysql2/promise';

/**
 * Asegura que exista la columna qr_used_at en manual_registros. Este
 * MySQL/MariaDB NO soporta "ADD COLUMN IF NOT EXISTS" (error #1064) —
 * va sin esa cláusula, protegida por su propio try/catch (falla limpio
 * si ya existe). La llaman validate-qr.ts, seguridad-lista.ts y
 * seguridad-transporte.ts — cualquiera de los tres la crea si falta.
 */
export async function ensureQrUsedColumn(pool: Pool): Promise<void> {
  await pool.query(`ALTER TABLE manual_registros ADD COLUMN qr_used_at DATETIME NULL`).catch(() => {});
}
