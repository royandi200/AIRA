import type { Pool } from 'mysql2/promise';

/**
 * Check-ins por punto de control — reemplaza el viejo esquema de "un solo
 * qr_used_at bloquea todo". Ahora cada persona puede pasar por varios
 * puntos de control independientes (Transporte, Ingreso 1, Ingreso 2,
 * Ingreso 3, …) sin que uno bloquee a los demás — el mismo QR sirve para
 * todos, cada punto lleva su propio registro.
 */
export async function ensureCheckinsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS checkins (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_ref   VARCHAR(50)  NOT NULL,
      checkpoint  VARCHAR(40)  NOT NULL,
      scanned_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_checkin (order_ref, checkpoint)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
}

// Lista de puntos de control disponibles — por ahora solo Ingreso y
// Transporte (checks distintos e independientes en la BD). Para agregar
// más adelante Ingreso 2/3 u otras zonas: sumar una línea acá y otra en
// la misma lista del frontend (Seguridad.tsx).
export const CHECKPOINTS: { id: string; label: string }[] = [
  { id: 'ingreso',    label: 'Ingreso' },
  { id: 'transporte', label: 'Transporte (bus)' },
];
export const CHECKPOINT_IDS = CHECKPOINTS.map(c => c.id);
