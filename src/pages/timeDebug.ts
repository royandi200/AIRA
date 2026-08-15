/**
 * Simulador de hora — SOLO se usó para probar el "en vivo" del itinerario
 * sin esperar a que fuera agosto 2026 de verdad. Guardaba un "offset"
 * (diferencia entre la hora real y la simulada) en localStorage; getNow()
 * lo sumaba a Date.now() así el reloj seguía corriendo normal desde el
 * punto elegido, en vez de quedar congelado.
 *
 * El panel para activarlo/desactivarlo ya se sacó de Perfil (era solo de
 * pruebas) — pero quien lo haya activado antes se queda con el offset
 * guardado en su celular PARA SIEMPRE, sin ninguna forma de quitarlo
 * desde la app. Por eso getNow() se autolimpia: si encuentra un offset
 * viejo, lo borra de una vez y sigue con la hora real.
 *
 * No afecta nada del backend (OTP, QR, pedidos) — solo lo que lee este
 * reloj en el frontend (MyAppClock + useLiveSchedule).
 */

const OFFSET_KEY = 'aira_debug_time_offset';

export function getNow(): Date {
  const raw = localStorage.getItem(OFFSET_KEY);
  if (!raw) return new Date();
  // Autolimpieza — el offset ya cumplió su función de pruebas, y no hay
  // UI para quitarlo manualmente. Se descarta y de aquí en más siempre
  // corre con la hora real.
  localStorage.removeItem(OFFSET_KEY);
  return new Date();
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
