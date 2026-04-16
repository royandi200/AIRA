import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import ordersRouter   from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import eventsRouter   from './routes/events.js';
import ticketsRouter  from './routes/tickets.js';

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'https://airaevents.co'],
  credentials: true,
}));

// Webhook de MercadoPago necesita raw body → montamos antes de express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date() }));

// ── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/events',   eventsRouter);
app.use('/api/orders',   ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/tickets',  ticketsRouter);

// ── Error global ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`🚀  AIRA backend escuchando en http://localhost:${PORT}`));
