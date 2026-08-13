/**
 * Simulador de hora — SOLO para probar el "en vivo" del itinerario sin
 * esperar a que sea agosto 2026 de verdad. Guarda un "offset" (diferencia
 * entre la hora real y la simulada) en localStorage; getNow() lo suma a
 * Date.now() así que el reloj sigue corriendo normal desde el punto que
 * elegiste, en vez de quedar congelado.
 *
 * No afecta nada del backend (OTP, QR, pedidos) — solo lo que lee este
 * reloj en el frontend (MyAppClock + useLiveSchedule).
 */

const OFFSET_KEY = 'aira_debug_time_offset';

export function getNow(): Date {
  const raw = localStorage.getItem(OFFSET_KEY);
  if (!raw) return new Date();
  const offset = Number(raw);
  if (!offset || Number.isNaN(offset)) return new Date();
  return new Date(Date.now() + offset);
}

/** Fija el reloj simulado a una fecha/hora exacta — sigue corriendo desde ahí */
export function setSimTime(target: Date): void {
  const offset = target.getTime() - Date.now();
  localStorage.setItem(OFFSET_KEY, String(offset));
}

export function clearSimTime(): void {
  localStorage.removeItem(OFFSET_KEY);
}

export function isSimActive(): boolean {
  return localStorage.getItem(OFFSET_KEY) !== null;
}
