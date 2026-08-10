import { useEffect, useState } from 'react';

/**
 * Itinerario real de AIRA 2026 (Guatapé/El Peñol, 15-17 de agosto) —
 * fuente: PDF "ITINERARIO AIRA". Un solo lugar de verdad para el
 * reloj en vivo (MyAppClock) y el panel completo (ItinerarioPanel).
 */

export interface ScheduleItem {
  id: string;
  day: 'Sábado' | 'Domingo' | 'Lunes';
  dayDate: string; // etiqueta visual
  title: string;
  place: string;
  start: Date;
  end: Date;
}

const YEAR = 2026;
const MONTH = 8; // agosto

function at(dayOfMonth: number, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(YEAR, MONTH - 1, dayOfMonth, h, m, 0, 0);
}

function item(
  id: string,
  dayOfMonth: number,
  day: ScheduleItem['day'],
  dayDate: string,
  start: string,
  end: string,
  title: string,
  place: string
): ScheduleItem {
  const startDate = at(dayOfMonth, start);
  let endDate = at(dayOfMonth, end);
  // Si la hora de fin es "menor" que la de inicio, cruza medianoche
  if (endDate <= startDate) endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
  return { id, day, dayDate, title, place, start: startDate, end: endDate };
}

export const SCHEDULE: ScheduleItem[] = [
  // ── Sábado 15 ──────────────────────────────────────────────────────────
  item('s1', 15, 'Sábado', '15 Agosto', '09:00', '10:00', 'Recorrido turístico por el embalse y sesión de meditación', 'Barco Veroni'),
  item('s2', 15, 'Sábado', '15 Agosto', '10:00', '11:00', 'Recorrido turístico Guatapé', 'Guatapé'),
  item('s3', 15, 'Sábado', '15 Agosto', '11:30', '12:00', 'Recorrido turístico por el embalse', 'Barco Veroni'),
  item('s4', 15, 'Sábado', '15 Agosto', '12:00', '13:30', 'Apertura del evento', 'Pandora Stage'),
  item('s5', 15, 'Sábado', '15 Agosto', '13:30', '18:00', 'Presentación de artistas', 'Pandora Stage y Joinn Stage'),
  item('s6', 15, 'Sábado', '15 Agosto', '16:00', '17:00', 'Sesión de estiramiento y relajación', 'Playa Aira'),
  item('s7', 15, 'Sábado', '15 Agosto', '18:00', '03:00', 'Presentación de artistas', 'Aira Stage y Joinn Stage'),

  // ── Domingo 16 ─────────────────────────────────────────────────────────
  item('d1', 16, 'Domingo', '16 Agosto', '08:00', '10:00', 'Actividades acuáticas', 'Pandora Stage'),
  item('d2', 16, 'Domingo', '16 Agosto', '09:00', '10:00', 'Sesión de yoga / entrenamiento funcional', 'Playa Aira'),
  item('d3', 16, 'Domingo', '16 Agosto', '10:00', '18:00', 'Torneo de voleibol', 'Playa Aira'),
  item('d4', 16, 'Domingo', '16 Agosto', '10:00', '18:00', 'Presentación de artistas', 'Pandora Stage y Joinn Stage'),
  item('d5', 16, 'Domingo', '16 Agosto', '20:00', '12:00', 'Noche blanca y antifaz / presentación de artistas', 'Main Stage Majestic'),
  // Ojo: 01:00–03:00 cae en la madrugada del lunes 17 (parte de la
  // misma noche que empieza el domingo a las 20:00) — se fecha en el
  // día calendario correcto (17) para que el estado "en vivo" del
  // reloj funcione bien, aunque el PDF la liste en la página del domingo.
  item('d6', 17, 'Domingo', '16-17 Agosto (madrugada)', '01:00', '03:00', 'Presentación de artistas', 'Aira Stage'),

  // ── Lunes 17 ───────────────────────────────────────────────────────────
  item('l1', 17, 'Lunes', '17 Agosto', '09:00', '10:00', 'Entrenamiento funcional', 'Playa Aira'),
  item('l2', 17, 'Lunes', '17 Agosto', '10:00', '15:00', 'Torneo de voleibol', 'Playa Aira'),
  item('l3', 17, 'Lunes', '17 Agosto', '10:00', '17:00', 'Presentación de artistas', 'Pandora Stage y Joinn Stage'),
  item('l4', 17, 'Lunes', '17 Agosto', '17:00', '18:00', 'Sesión de yoga', 'Playa Aira'),
].sort((a, b) => a.start.getTime() - b.start.getTime());

export function formatHM(d: Date): string {
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Estado en vivo del itinerario — recalcula cada 30s (suficiente para un cronograma) */
export function useLiveSchedule() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const current = SCHEDULE.find(it => now >= it.start && now < it.end) ?? null;
  const next = SCHEDULE.filter(it => it.start > now).sort((a, b) => a.start.getTime() - b.start.getTime())[0] ?? null;

  return { now, current, next };
}
