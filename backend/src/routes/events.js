import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/events  — todos los eventos activos
router.get('/', async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*, 
              COALESCE(SUM(tt.sold_qty), 0) AS sold_total,
              COALESCE(SUM(tt.available_qty), 0) AS capacity_total
       FROM events e
       LEFT JOIN ticket_types tt ON tt.event_id = e.id
       WHERE e.status != 'cancelled'
       GROUP BY e.id
       ORDER BY e.date ASC`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/events/:id/ticket-types
router.get('/:id/ticket-types', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM ticket_types WHERE event_id = ? ORDER BY stage ASC, price ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

export default router;
