import type { Pool } from 'mysql2/promise';
import webpush from 'web-push';

/**
 * Notificaciones push (Web Push nativo, sin terceros) — cada navegador que
 * activa notificaciones guarda su "suscripción" acá, ligada al order_ref
 * de la sesión activa. api/myapp-push-send.ts la usa para hacer el
 * broadcast a todos los asistentes suscritos.
 */
export async function ensurePushTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS myapp_push_subscriptions (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_ref   VARCHAR(50)   NOT NULL,
      endpoint    VARCHAR(500)  NOT NULL,
      p256dh      VARCHAR(255)  NOT NULL,
      auth        VARCHAR(255)  NOT NULL,
      created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_endpoint (endpoint(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
}

let configured = false;
export function ensureVapidConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:contacto@airafestival.com',
    pub,
    priv
  );
  configured = true;
  return true;
}

export { webpush };
