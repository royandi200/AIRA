import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { qrCode, scannedBy, deviceInfo, eventId } = req.body;
  if (!qrCode) return res.status(400).json({ error: 'QR requerido' });

  const conn = await pool.getConnection();
  try {
    // Buscar el item con ese QR
    const [[item]]: any = await conn.query(
      `SELECT oi.id, oi.order_id, oi.ticket_type_id,
              o.status AS order_status, o.event_id,
              tt.name AS ticket_name
       FROM order_items oi
       JOIN orders      o  ON o.id  = oi.order_id
       JOIN ticket_types tt ON tt.id = oi.ticket_type_id
       WHERE oi.qr_code = ?`,
      [qrCode]
    );

    let scanResult: string;
    let message: string;

    if (!item) {
      scanResult = 'not_found';
      message = '❌ QR no encontrado';
    } else if (String(item.event_id) !== String(eventId)) {
      scanResult = 'event_mismatch';
      message = '⚠️ QR de otro evento';
    } else if (item.order_status !== 'paid' && item.order_status !== 'partial') {
      scanResult = 'not_found';
      message = '❌ Orden sin pago confirmado';
    } else {
      // Verificar si ya fue escaneado
      const [[prevScan]]: any = await conn.query(
        `SELECT id FROM qr_scans
         WHERE order_item_id = ? AND scan_result = 'valid'
         LIMIT 1`,
        [item.id]
      );
      if (prevScan) {
        scanResult = 'already_used';
        message = '🔴 Boleta ya utilizada';
      } else {
        scanResult = 'valid';
        message = `✅ Acceso válido — ${item.ticket_name}`;
      }
    }

    // Registrar escaneo
    await conn.query(
      `INSERT INTO qr_scans (order_item_id, qr_code, scanned_by, scan_result, device_info)
       VALUES (?,?,?,?,?)`,
      [item?.id || null, qrCode, scannedBy, scanResult, deviceInfo]
    );

    res.status(200).json({
      result: scanResult,
      message,
      ticket: item ? { name: item.ticket_name, orderId: item.order_id } : null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}
