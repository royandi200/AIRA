// Entry point que monta el alias /api/create-order
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import ordersRouter      from './routes/orders.js';
import paymentsRouter    from './routes/payments.js';
import eventsRouter      from './routes/events.js';
import ticketsRouter     from './routes/tickets.js';
import createOrderRouter from './routes/create-order.js';

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://airaevents.co',
  ],
  credentials: true,
}));

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date() }));

app.use('/api/events',        eventsRouter);
app.use('/api/orders',        ordersRouter);
app.use('/api/payments',      paymentsRouter);
app.use('/api/tickets',       ticketsRouter);
app.use('/api/create-order',  createOrderRouter);   // alias usado por TicketReserve.tsx

app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () =>
  console.log(`\ud83d\ude80  AIRA backend → http://localhost:${PORT}`)
);
