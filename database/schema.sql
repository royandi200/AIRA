-- ─────────────────────────────────────────────────────────────
-- AIRA Events · MySQL Schema
-- Ejecutar en tu VPS: mysql -u root -p < schema.sql
-- ─────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS aira_events CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE aira_events;

-- Usuarios / compradores
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100)  NOT NULL,
  email      VARCHAR(150)  NOT NULL UNIQUE,
  phone      VARCHAR(25),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Órdenes de compra
CREATE TABLE IF NOT EXISTS orders (
  id            VARCHAR(36)  PRIMARY KEY,           -- UUID
  user_id       INT          NOT NULL REFERENCES users(id),
  event_id      VARCHAR(50),
  access_type   ENUM('day','package') NOT NULL,
  ticket_label  VARCHAR(100),                        -- "DÍA 1", "DÍA 2 VIP"
  stage_label   VARCHAR(100),                        -- "1ª Etapa", "Referidos"
  is_vip        TINYINT(1)   DEFAULT 0,
  qty           INT          NOT NULL DEFAULT 1,
  add_pass_vip  TINYINT(1)   DEFAULT 0,
  add_transport TINYINT(1)   DEFAULT 0,
  total         DECIMAL(12,2) NOT NULL,
  status        ENUM('pending','paid','cancelled','refunded') DEFAULT 'pending',
  payment_id    VARCHAR(200),                        -- ID transacción Bold
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Items / QR codes (uno por boleta)
CREATE TABLE IF NOT EXISTS order_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   VARCHAR(36)  NOT NULL REFERENCES orders(id),
  qr_code    VARCHAR(36)  NOT NULL UNIQUE,           -- UUID → genera el QR
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Índices útiles
CREATE INDEX idx_orders_user    ON orders(user_id);
CREATE INDEX idx_orders_status  ON orders(status);
CREATE INDEX idx_items_order    ON order_items(order_id);

-- Usuario de solo lectura/escritura para la app (ajusta la contraseña)
CREATE USER IF NOT EXISTS 'aira_user'@'%' IDENTIFIED BY 'CAMBIA_ESTA_PASSWORD';
GRANT SELECT, INSERT, UPDATE ON aira_events.* TO 'aira_user'@'%';
FLUSH PRIVILEGES;
