-- ============================================================
--  AIRA EVENTS — Schema completo MySQL
--  Versión: 2.0
--  Tablas: events, ticket_types, users, orders, order_items,
--          abono_plans, abono_payments, qr_scans, transport_bookings
-- ============================================================

CREATE DATABASE IF NOT EXISTS aira_events
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE aira_events;

-- ============================================================
-- 1. EVENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(100)  NOT NULL UNIQUE,          -- 'guatape-2026'
  name          VARCHAR(200)  NOT NULL,                 -- 'AIRA Guatapé'
  venue         VARCHAR(200)  NOT NULL,                 -- 'Yate Majestic'
  city          VARCHAR(100)  NOT NULL,
  event_date    DATE          NOT NULL,
  event_time    TIME          NOT NULL,
  venue_type    ENUM('festival','yacht','club') NOT NULL DEFAULT 'festival',
  total_capacity INT UNSIGNED NOT NULL DEFAULT 0,
  status        ENUM('draft','active','sold_out','cancelled') NOT NULL DEFAULT 'draft',
  image_url     VARCHAR(500),
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 2. TIPOS DE BOLETA
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_types (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id      INT UNSIGNED NOT NULL,
  name          VARCHAR(100) NOT NULL,                  -- 'VIP', 'General', 'Cabaña Suite'
  description   TEXT,
  price         DECIMAL(12,2) NOT NULL,
  vip_price     DECIMAL(12,2),                          -- precio VIP si aplica
  stage         TINYINT UNSIGNED NOT NULL DEFAULT 1,    -- etapa 1,2,3...
  stage_label   VARCHAR(50),                            -- 'Creyentes','Referidos','1ª Etapa'
  stage_dates   VARCHAR(100),                          -- '5 MAY – 5 JUN'
  available_qty INT UNSIGNED NOT NULL DEFAULT 0,
  sold_qty      INT UNSIGNED NOT NULL DEFAULT 0,
  reserved_qty  INT UNSIGNED NOT NULL DEFAULT 0,        -- cupos con timer activo
  access_type   ENUM('day','package') NOT NULL DEFAULT 'day',
  is_locked     TINYINT(1) NOT NULL DEFAULT 0,          -- 1 = solo Melomania
  lock_note     VARCHAR(200),
  is_urgent     TINYINT(1) NOT NULL DEFAULT 0,
  sort_order    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tt_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 3. USUARIOS / COMPRADORES
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(180) NOT NULL,
  phone         VARCHAR(30),
  doc_type      ENUM('CC','CE','NIT','PP') DEFAULT 'CC',
  doc_number    VARCHAR(30),
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email (email)
) ENGINE=InnoDB;

-- ============================================================
-- 4. ÓRDENES DE COMPRA
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_ref        VARCHAR(20)  NOT NULL UNIQUE,        -- 'AIRA-00001'
  user_id          INT UNSIGNED NOT NULL,
  event_id         INT UNSIGNED NOT NULL,
  subtotal         DECIMAL(12,2) NOT NULL DEFAULT 0,
  service_fee      DECIMAL(12,2) NOT NULL DEFAULT 0,
  pass_vip_total   DECIMAL(12,2) NOT NULL DEFAULT 0,
  transport_total  DECIMAL(12,2) NOT NULL DEFAULT 0,
  total            DECIMAL(12,2) NOT NULL,
  -- Modo de pago
  payment_mode     ENUM('full','abono') NOT NULL DEFAULT 'full',
  -- Estado general
  status           ENUM(
    'pending',      -- creada, esperando primer pago
    'partial',      -- abono recibido, cuotas pendientes
    'paid',         -- pago completo
    'overdue',      -- cuota vencida
    'cancelled',
    'refunded'
  ) NOT NULL DEFAULT 'pending',
  -- Datos del proveedor de pago
  payment_provider VARCHAR(30)  DEFAULT 'bold',        -- 'bold','mercadopago'
  -- Fechas de control
  reserved_until   DATETIME,                           -- timer 10 min checkout
  paid_at          DATETIME,
  cancelled_at     DATETIME,
  -- Extras
  add_pass_vip     TINYINT(1) NOT NULL DEFAULT 0,
  add_transport    TINYINT(1) NOT NULL DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_user  FOREIGN KEY (user_id)  REFERENCES users(id),
  CONSTRAINT fk_order_event FOREIGN KEY (event_id) REFERENCES events(id)
) ENGINE=InnoDB;

-- ============================================================
-- 5. ITEMS DE CADA ORDEN
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id         INT UNSIGNED NOT NULL,
  ticket_type_id   INT UNSIGNED NOT NULL,
  quantity         INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price       DECIMAL(12,2) NOT NULL,
  is_vip           TINYINT(1) NOT NULL DEFAULT 0,
  -- QR único por boleta (se genera al confirmar pago)
  qr_code          VARCHAR(36) UNIQUE,                  -- UUID v4
  qr_generated_at  DATETIME,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_order  FOREIGN KEY (order_id)       REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_ticket FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id)
) ENGINE=InnoDB;

-- ============================================================
-- 6. PLANES DE ABONO
-- ============================================================
CREATE TABLE IF NOT EXISTS abono_plans (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_key     VARCHAR(10)  NOT NULL UNIQUE,            -- 'a50','a33','a25'
  label        VARCHAR(50)  NOT NULL,                   -- '2 cuotas'
  cuotas       TINYINT UNSIGNED NOT NULL,               -- 2, 3, 4
  pct_first    DECIMAL(5,4) NOT NULL,                   -- 0.5000, 0.3333, 0.2500
  description  VARCHAR(200),
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Datos iniciales de planes
INSERT INTO abono_plans (plan_key, label, cuotas, pct_first, description) VALUES
  ('a50', '2 cuotas', 2, 0.5000, '50% ahora · 50% antes del evento'),
  ('a33', '3 cuotas', 3, 0.3334, '33% ahora · 33% · 33% antes del evento'),
  ('a25', '4 cuotas', 4, 0.2500, '25% ahora · resto en 3 cuotas');

-- ============================================================
-- 7. PAGOS DE ABONO (cuotas individuales)
-- ============================================================
CREATE TABLE IF NOT EXISTS abono_payments (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id         INT UNSIGNED NOT NULL,
  abono_plan_id    INT UNSIGNED NOT NULL,
  cuota_number     TINYINT UNSIGNED NOT NULL,           -- 1, 2, 3, 4
  amount           DECIMAL(12,2) NOT NULL,
  due_date         DATE NOT NULL,                      -- fecha límite de pago
  status           ENUM('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
  -- Datos del proveedor
  payment_id       VARCHAR(200),                       -- ID externo Bold
  payment_ref      VARCHAR(200),                       -- referencia Bold
  paid_at          DATETIME,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_abono_order FOREIGN KEY (order_id)      REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_abono_plan  FOREIGN KEY (abono_plan_id) REFERENCES abono_plans(id)
) ENGINE=InnoDB;

-- ============================================================
-- 8. ESCANEOS DE QR (control de acceso en puerta)
-- ============================================================
CREATE TABLE IF NOT EXISTS qr_scans (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_item_id  INT UNSIGNED NOT NULL,
  qr_code        VARCHAR(36) NOT NULL,
  scanned_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  scanned_by     VARCHAR(100),                         -- usuario del staff
  scan_result    ENUM('valid','already_used','not_found','event_mismatch') NOT NULL,
  device_info    VARCHAR(200),                         -- info del dispositivo
  CONSTRAINT fk_scan_item FOREIGN KEY (order_item_id) REFERENCES order_items(id)
) ENGINE=InnoDB;

-- ============================================================
-- 9. RESERVAS DE TRANSPORTE
-- ============================================================
CREATE TABLE IF NOT EXISTS transport_bookings (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id     INT UNSIGNED NOT NULL,
  route        VARCHAR(100) NOT NULL DEFAULT 'Bogotá - Guatapé - Bogotá',
  passengers   INT UNSIGNED NOT NULL DEFAULT 1,
  price        DECIMAL(12,2) NOT NULL,
  status       ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  notes        TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_transport_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 10. WEBHOOKS LOG (auditoría de pagos Bold)
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider     VARCHAR(30) NOT NULL DEFAULT 'bold',
  event_type   VARCHAR(100),                           -- 'payment.approved'
  payload      JSON,
  order_ref    VARCHAR(20),
  processed    TINYINT(1) NOT NULL DEFAULT 0,
  error        TEXT,
  received_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_orders_user        ON orders(user_id);
CREATE INDEX idx_orders_event       ON orders(event_id);
CREATE INDEX idx_orders_ref         ON orders(order_ref);
CREATE INDEX idx_order_items_qr     ON order_items(qr_code);
CREATE INDEX idx_abono_order        ON abono_payments(order_id);
CREATE INDEX idx_abono_status       ON abono_payments(status);
CREATE INDEX idx_abono_due          ON abono_payments(due_date);
CREATE INDEX idx_ticket_event       ON ticket_types(event_id);
CREATE INDEX idx_webhook_order      ON webhook_logs(order_ref);
CREATE INDEX idx_users_email        ON users(email);

-- ============================================================
-- VISTA: resumen de órdenes con usuario y evento
-- ============================================================
CREATE OR REPLACE VIEW v_orders_summary AS
SELECT
  o.id,
  o.order_ref,
  o.status,
  o.payment_mode,
  o.total,
  o.created_at,
  o.paid_at,
  u.name    AS buyer_name,
  u.email   AS buyer_email,
  u.phone   AS buyer_phone,
  e.name    AS event_name,
  e.city    AS event_city,
  e.event_date,
  -- Suma de abonos pagados
  COALESCE((
    SELECT SUM(ap.amount)
    FROM abono_payments ap
    WHERE ap.order_id = o.id AND ap.status = 'paid'
  ), 0) AS total_paid,
  -- Saldo pendiente
  o.total - COALESCE((
    SELECT SUM(ap.amount)
    FROM abono_payments ap
    WHERE ap.order_id = o.id AND ap.status = 'paid'
  ), 0) AS balance_due
FROM orders o
JOIN users  u ON u.id = o.user_id
JOIN events e ON e.id = o.event_id;

-- ============================================================
-- VISTA: cuotas vencidas (para cobros automáticos)
-- ============================================================
CREATE OR REPLACE VIEW v_overdue_abonos AS
SELECT
  ap.*,
  o.order_ref,
  u.name  AS buyer_name,
  u.email AS buyer_email,
  u.phone AS buyer_phone
FROM abono_payments ap
JOIN orders o ON o.id = ap.order_id
JOIN users  u ON u.id = o.user_id
WHERE ap.status = 'pending'
  AND ap.due_date < CURDATE();
