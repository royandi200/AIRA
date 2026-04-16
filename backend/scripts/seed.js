/**
 * AIRA — Seed: inserta el evento Guatapé y sus tipos de boleta
 * Ejecutar: node scripts/seed.js
 */
import dotenv from 'dotenv';
dotenv.config();
import db from '../src/db.js';

const [existingEvent] = await db.query('SELECT id FROM events WHERE name = ?', ['AIRA Guatapé 2025']);

if (existingEvent.length === 0) {
  const [event] = await db.query(
    `INSERT INTO events (name, venue, city, date, time, venue_type)
     VALUES ('AIRA Guatapé 2025', 'Casa Finca El Peñol', 'Guatapé', '2025-08-15', '14:00:00', 'festival')`
  );
  const eventId = event.insertId;

  const ticketTypes = [
    // Boletería por día
    { name: 'DÍA 1 - After Fiesta de Yates',     price: 80_000,  qty: 80, stage: 1, is_vip: 0 },
    { name: 'DÍA 2 - Fiesta Majestic (General)', price: 150_000, qty: 80, stage: 1, is_vip: 0 },
    { name: 'DÍA 2 - Fiesta Majestic (VIP)',     price: 250_000, qty: 30, stage: 1, is_vip: 1 },
    { name: 'DÍA 3 - Open Deck',                 price: 50_000,  qty: 80, stage: 1, is_vip: 0 },
    // Paquete completo — etapas
    { name: 'Paquete Completo · Creyentes',       price: 590_000,   qty: 35, stage: 1, is_vip: 0 },
    { name: 'Paquete Completo · Referidos',       price: 690_000,   qty: 35, stage: 2, is_vip: 0 },
    { name: 'Paquete Completo · 1ª Etapa',        price: 790_000,   qty: 28, stage: 3, is_vip: 0 },
    { name: 'Paquete Completo · 2ª Etapa',        price: 890_000,   qty: 28, stage: 4, is_vip: 0 },
    { name: 'Paquete Completo · 3ª Etapa',        price: 1_000_000, qty: 7,  stage: 5, is_vip: 0 },
    // Add-ons
    { name: 'Pass VIP',    price: 500_000, qty: 50, stage: 1, is_vip: 1 },
    { name: 'Transporte',  price: 150_000, qty: 60, stage: 1, is_vip: 0 },
  ];

  for (const tt of ticketTypes) {
    await db.query(
      `INSERT INTO ticket_types (event_id, name, price, available_qty, stage, is_vip)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [eventId, tt.name, tt.price, tt.qty, tt.stage, tt.is_vip]
    );
  }
  console.log('🌱  Seed completado: evento Guatapé 2025 insertado.');
} else {
  console.log('⚠️   El evento ya existe. Seed omitido.');
}

process.exit(0);
