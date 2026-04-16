/**
 * AIRA — Migraciones MySQL
 * Ejecutar: node scripts/migrate.js
 */
import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(
  process.env.DB_URL || {
    host:     process.env.DB_HOST || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true,
  }
);

await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'aira_events'}\``);
await conn.query(`USE \`${process.env.DB_NAME || 'aira_events'}\``);

const schema = `
-- Usuarios / compradores
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  email      VARCHAR(200) UNIQUE NOT NULL,
  phone      VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Eventos AIRA
CREATE TABLE IF NOT EXISTS events (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(200) NOT NULL,
  venue          VARCHAR(200),
  city           VARCHAR(100),
  date           DATE NOT NULL,
  time           TIME,
  image_url      VARCHAR(500),
  venue_type     ENUM('festival','yacht','club') DEFAULT 'festival',
  status         ENUM('active','sold_out','cancelled') DEFAULT 'active',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tipos de boleta por evento
CREATE TABLE IF NOT EXISTS ticket_types (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  event_id      INT NOT NULL,
  name          VARCHAR(150) NOT NULL,
  description   TEXT,
  price         DECIMAL(12,2) NOT NULL,
  available_qty INT NOT NULL DEFAULT 0,
  sold_qty      INT NOT NULL DEFAULT 0,
  stage         INT NOT NULL DEFAULT 1,
  is_vip        TINYINT(1) DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Órdenes de compra
CREATE TABLE IF NOT EXISTS orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  event_id       INT NOT NULL,
  total          DECIMAL(12,2) NOT NULL,
  amount_due     DECIMAL(12,2) NOT NULL COMMENT 'Primer pago (full o abono)',
  status         ENUM('pending','paid','cancelled','refunded') DEFAULT 'pending',
  payment_mode   ENUM('full','abono') DEFAULT 'full',
  abono_plan     VARCHAR(10) COMMENT 'a50 | a33 | a25',
  payment_id     VARCHAR(300) COMMENT 'ID de MercadoPago preference o payment',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

-- Items de cada orden (boletas individuales)
CREATE TABLE IF NOT EXISTS order_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT NOT NULL,
  label      VARCHAR(200) NOT NULL COMMENT 'Descripción legible: DÍA 2 VIP, Pass VIP, etc.',
  quantity   INT NOT NULL DEFAULT 1,
  type       ENUM('day','package','addon') NOT NULL DEFAULT 'day',
  qr_code    VARCHAR(36) UNIQUE NOT NULL COMMENT 'UUID único por item',
  used_at    TIMESTAMP NULL COMMENT 'Timestamp de validación en puerta',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
`;

await conn.query(schema);
console.log('✅  Migraciones aplicadas correctamente.');
await conn.end();
