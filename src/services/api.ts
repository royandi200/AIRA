/**
 * AIRA — API Service
 * Centraliza todas las llamadas al backend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

// ── Eventos ──────────────────────────────────────────────────────────────────
export const getEvents = () => apiFetch('/api/events');
export const getTicketTypes = (eventId: string | number) =>
  apiFetch(`/api/events/${eventId}/ticket-types`);

// ── Órdenes ──────────────────────────────────────────────────────────────────
export interface CreateOrderPayload {
  name: string;
  email: string;
  phone: string;
  eventId?: string;
  accessType: 'day' | 'package';
  ticketLabel: string | null;
  stageLabel: string | null;
  isVip: boolean;
  qty: number;
  addPassVip: boolean;
  addTransport: boolean;
  total: number;
  paymentMode: 'full' | 'abono';
  abonoPlan: string | null;
  primerPago: number;
}

export interface CreateOrderResponse {
  orderId: number;
  preferenceId: string;
  paymentUrl: string;
  sandboxUrl: string;
}

export const createOrder = (payload: CreateOrderPayload): Promise<CreateOrderResponse> =>
  apiFetch('/api/create-order', { method: 'POST', body: JSON.stringify(payload) });

export const getOrder = (orderId: number | string) =>
  apiFetch(`/api/orders/${orderId}`);

export const getOrdersByEmail = (email: string) =>
  apiFetch(`/api/orders/by-email/${encodeURIComponent(email)}`);

// ── Pagos ──────────────────────────────────────────────────────────────────
export const getPaymentStatus = (orderId: number | string) =>
  apiFetch(`/api/payments/status/${orderId}`);

// ── Boletas ──────────────────────────────────────────────────────────────────
export const getTicketQrUrl  = (qrCode: string) => `${BASE_URL}/api/tickets/qr/${qrCode}`;
export const validateTicket  = (qrCode: string) => apiFetch(`/api/tickets/validate/${qrCode}`);
