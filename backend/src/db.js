import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Si se provee DB_URL (Railway, PlanetScale) la usamos directamente
const pool = process.env.DB_URL
  ? mysql.createPool(process.env.DB_URL)
  : mysql.createPool({
      host:            process.env.DB_HOST     || 'localhost',
      port:            Number(process.env.DB_PORT) || 3306,
      user:            process.env.DB_USER     || 'root',
      password:        process.env.DB_PASS     || '',
      database:        process.env.DB_NAME     || 'aira_events',
      waitForConnections: true,
      connectionLimit: 10,
      timezone:        '+00:00',
    });

export default pool;
