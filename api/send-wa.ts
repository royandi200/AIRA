import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendWhatsApp } from './lib/send-whatsapp.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const adminToken = process.env.ADMIN_TOKEN
  const token = req.headers['x-admin-token'] || req.headers['x-promotor-token']
  const isAdmin = adminToken && token === adminToken
  const isPromotor = typeof token === 'string' && token.startsWith('REF:')
  if (!isAdmin && !isPromotor)
    return res.status(401).json({ error: 'No autorizado' })

  const { phone, message } = req.body
  if (!phone || !message)
    return res.status(400).json({ error: 'phone y message son requeridos' })

  try {
    await sendWhatsApp(String(phone), String(message))
    return res.status(200).json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
