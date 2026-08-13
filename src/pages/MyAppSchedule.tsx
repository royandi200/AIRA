import { useEffect, useState } from 'react';
import { getNow } from './timeDebug';

/**
 * Line-up real de AIRA 2026 (Guatapé, 15-17 de agosto) — 3 escenarios
 * corriendo en simultáneo la mayor parte del tiempo (Japi Stage, Joinn
 * Stage, Playa Aïra/Majestic). Un solo lugar de verdad para el reloj
 * en vivo (MyAppClock) y el panel completo (ItinerarioPanel).
 *
 * Como hay varios escenarios activos a la vez, "en vivo" no es un solo
 * item: useLiveSchedule() devuelve TODOS los sets que están sonando en
 * este momento (uno por escenario), no solo el primero que matchea.
 */

export interface ScheduleItem {
  id: string;
  day: 'Sábado' | 'Domingo' | 'Lunes';
  dayDate: string; // etiqueta visual
  title: string;   // artista / set
  place: string;   // escenario
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
  return { id, day, dayDate, title, place, start: at(dayOfMonth, start), end: at(dayOfMonth, end) };
}

export const SCHEDULE: ScheduleItem[] = [
  // ══ DÍA 1 · Sábado 15 ═══════════════════════════════════════════════════
  // Japi Stage
  item('s1-japi-1', 15, 'Sábado', '15 Agosto', '12:00', '13:30', 'Wayne', 'Japi Stage'),
  item('s1-japi-2', 15, 'Sábado', '15 Agosto', '13:30', '15:00', 'NBL', 'Japi Stage'),
  item('s1-japi-3', 15, 'Sábado', '15 Agosto', '15:00', '16:30', 'Malia', 'Japi Stage'),

  // Joinn Stage
  item('s1-joinn-1', 15, 'Sábado', '15 Agosto', '13:30', '15:00', 'Blvck Rite', 'Joinn Stage'),
  item('s1-joinn-2', 15, 'Sábado', '15 Agosto', '15:00', '16:30', 'Paz', 'Joinn Stage'),
  item('s1-joinn-3', 15, 'Sábado', '15 Agosto', '16:30', '18:00', 'Alex Jockey', 'Joinn Stage'),
  item('s1-joinn-4', 15, 'Sábado', '15 Agosto', '18:00', '19:30', 'Shade', 'Joinn Stage'),
  item('s1-joinn-5', 15, 'Sábado', '15 Agosto', '19:30', '21:00', 'G1V3R', 'Joinn Stage'),
  item('s1-joinn-6', 15, 'Sábado', '15 Agosto', '21:00', '22:30', 'Juano Marciano', 'Joinn Stage'),
  item('s1-joinn-7', 15, 'Sábado', '15 Agosto', '22:30', '00:00', 'Mulatto', 'Joinn Stage'),
  item('s1-joinn-8', 16, 'Sábado', '15-16 Agosto (madrugada)', '00:00', '01:30', '19 Clouds', 'Joinn Stage'),
  item('s1-joinn-9', 16, 'Sábado', '15-16 Agosto (madrugada)', '01:30', '03:00', 'Hylen', 'Joinn Stage'),

  // Playa Aïra
  item('s1-playa-1', 15, 'Sábado', '15 Agosto', '16:30', '18:00', 'Deepmatt', 'Playa Aïra'),
  item('s1-playa-2', 15, 'Sábado', '15 Agosto', '18:00', '19:30', 'Frann', 'Playa Aïra'),
  item('s1-playa-3', 15, 'Sábado', '15 Agosto', '19:30', '21:00', 'Calvin Parra', 'Playa Aïra'),
  item('s1-playa-4', 15, 'Sábado', '15 Agosto', '21:00', '22:30', 'HarrySoul', 'Playa Aïra'),
  item('s1-playa-5', 15, 'Sábado', '15 Agosto', '22:30', '00:00', 'Alex Saint', 'Playa Aïra'),
  item('s1-playa-6', 16, 'Sábado', '15-16 Agosto (madrugada)', '00:00', '01:30', 'Valerio', 'Playa Aïra'),
  item('s1-playa-7', 16, 'Sábado', '15-16 Agosto (madrugada)', '01:30', '03:00', 'Real Salsa', 'Playa Aïra'),

  // ══ DÍA 2 · Domingo 16 ══════════════════════════════════════════════════
  // Japi Stage
  item('s2-japi-1', 16, 'Domingo', '16 Agosto', '10:00', '11:30', 'Donato', 'Japi Stage'),
  item('s2-japi-2', 16, 'Domingo', '16 Agosto', '11:30', '13:00', 'Paoline', 'Japi Stage'),
  item('s2-japi-3', 16, 'Domingo', '16 Agosto', '13:00', '14:30', 'Alejo Chaves', 'Japi Stage'),
  item('s2-japi-4', 16, 'Domingo', '16 Agosto', '14:30', '16:00', 'Valerio', 'Japi Stage'),
  item('s2-japi-5', 16, 'Domingo', '16 Agosto', '16:00', '17:30', 'Alex Jockey', 'Japi Stage'),
  item('s2-japi-6', 16, 'Domingo', '16 Agosto', '17:30', '19:00', 'Paz', 'Japi Stage'),

  // Joinn Stage
  item('s2-joinn-1', 16, 'Domingo', '16 Agosto', '10:00', '11:30', 'Butsants', 'Joinn Stage'),
  item('s2-joinn-2', 16, 'Domingo', '16 Agosto', '11:30', '13:00', 'Fontal', 'Joinn Stage'),
  item('s2-joinn-3', 16, 'Domingo', '16 Agosto', '13:00', '14:30', 'Dani Six', 'Joinn Stage'),
  item('s2-joinn-4', 16, 'Domingo', '16 Agosto', '14:30', '16:00', 'Kasteel', 'Joinn Stage'),
  item('s2-joinn-5', 16, 'Domingo', '16 Agosto', '16:00', '17:30', 'Sara Guardia', 'Joinn Stage'),
  item('s2-joinn-6', 16, 'Domingo', '16 Agosto', '17:30', '19:00', 'Frau Troffea', 'Joinn Stage'),

  // Majestic
  item('s2-maj-1', 16, 'Domingo', '16 Agosto', '20:00', '21:00', 'Paoline B2B Alex Saint', 'Majestic'),
  item('s2-maj-2', 16, 'Domingo', '16 Agosto', '21:00', '00:00', 'Kamilo Sanclemente B2B Juan Pablo Torres', 'Majestic'),

  // Stage Playa (madrugada domingo→lunes)
  item('s2-playa-1', 17, 'Domingo', '16-17 Agosto (madrugada)', '01:00', '03:00', '19 Clouds', 'Stage Playa'),

  // ══ DÍA 3 · Lunes 17 ════════════════════════════════════════════════════
  // Japi Stage
  item('s3-japi-1', 17, 'Lunes', '17 Agosto', '10:00', '11:00', 'Casta', 'Japi Stage'),
  item('s3-japi-2', 17, 'Lunes', '17 Agosto', '11:00', '12:00', 'Luma', 'Japi Stage'),
  item('s3-japi-3', 17, 'Lunes', '17 Agosto', '12:00', '13:00', 'Galiguer', 'Japi Stage'),
  item('s3-japi-4', 17, 'Lunes', '17 Agosto', '13:00', '14:00', 'Frau Troffea', 'Japi Stage'),
  item('s3-japi-5', 17, 'Lunes', '17 Agosto', '14:00', '15:00', 'Mulatto', 'Japi Stage'),
  item('s3-japi-6', 17, 'Lunes', '17 Agosto', '15:00', '16:00', 'Fleurs Avenue', 'Japi Stage'),
  item('s3-japi-7', 17, 'Lunes', '17 Agosto', '16:00', '17:00', 'G1V3R', 'Japi Stage'),

  // Joinn Stage
  item('s3-joinn-1', 17, 'Lunes', '17 Agosto', '10:00', '11:00', 'Paoline', 'Joinn Stage'),
  item('s3-joinn-2', 17, 'Lunes', '17 Agosto', '11:00', '12:00', 'Wayne', 'Joinn Stage'),
  item('s3-joinn-3', 17, 'Lunes', '17 Agosto', '12:00', '13:00', 'Deepmatt', 'Joinn Stage'),
  item('s3-joinn-4', 17, 'Lunes', '17 Agosto', '13:00', '14:00', 'Richie', 'Joinn Stage'),
  item('s3-joinn-5', 17, 'Lunes', '17 Agosto', '14:00', '15:00', 'Alex Saint', 'Joinn Stage'),
  item('s3-joinn-6', 17, 'Lunes', '17 Agosto', '15:00', '16:00', 'Calvin Parra', 'Joinn Stage'),
  item('s3-joinn-7', 17, 'Lunes', '17 Agosto', '16:00', '17:00', 'HarrySoul', 'Joinn Stage'),
].sort((a, b) => a.start.getTime() - b.start.getTime());

// ── Itinerario general del evento (recorridos, yoga, torneos, etc.) —
// paralelo al line-up de DJs, se muestran lado a lado en ItinerarioPanel.
export const ACTIVITIES: ScheduleItem[] = [
  // ── Sábado 15 ──────────────────────────────────────────────────────────
  item('s1', 15, 'Sábado', '15 Agosto', '09:00', '10:00', 'Recorrido turístico por el embalse y sesión de meditación', 'Barco Veroni'),
  item('s2', 15, 'Sábado', '15 Agosto', '10:00', '11:00', 'Recorrido turístico Guatapé', 'Guatapé'),
  item('s3', 15, 'Sábado', '15 Agosto', '11:30', '12:00', 'Recorrido turístico por el embalse', 'Barco Veroni'),
  item('s4', 15, 'Sábado', '15 Agosto', '12:00', '13:30', 'Apertura del evento', 'Pandora Stage'),
  item('s6', 15, 'Sábado', '15 Agosto', '16:00', '17:00', 'Sesión de estiramiento y relajación', 'Playa Aira'),

  // ── Domingo 16 ─────────────────────────────────────────────────────────
  item('d1', 16, 'Domingo', '16 Agosto', '08:00', '10:00', 'Actividades acuáticas', 'Pandora Stage'),
  item('d2', 16, 'Domingo', '16 Agosto', '09:00', '10:00', 'Sesión de yoga / entrenamiento funcional', 'Playa Aira'),
  item('d3', 16, 'Domingo', '16 Agosto', '10:00', '18:00', 'Torneo de voleibol', 'Playa Aira'),
  item('d5', 16, 'Domingo', '16 Agosto', '20:00', '00:00', 'Noche blanca y antifaz', 'Main Stage Majestic'),

  // ── Lunes 17 ───────────────────────────────────────────────────────────
  item('l1', 17, 'Lunes', '17 Agosto', '09:00', '10:00', 'Entrenamiento funcional', 'Playa Aira'),
  item('l2', 17, 'Lunes', '17 Agosto', '10:00', '15:00', 'Torneo de voleibol', 'Playa Aira'),
  item('l4', 17, 'Lunes', '17 Agosto', '17:00', '18:00', 'Sesión de yoga', 'Playa Aira'),
].sort((a, b) => a.start.getTime() - b.start.getTime());

// Un color de marca distinto por escenario/lugar — mismo lenguaje de
// acentos que el dial principal. Se usa en el reloj (MyAppClock), el
// acordeón y las tarjetas del itinerario, así el color de cada escenario
// es consistente en toda la app, no solo en una pantalla.
export const PLACE_COLORS: Record<string, string> = {
  'Japi Stage':  '#e1fe52',
  'Joinn Stage': '#38bdf8',
  'Playa Aïra':  '#f97316',
  'Majestic':    '#a855f7',
  'Stage Playa': '#22c55e',
};
const DEFAULT_PLACE_COLOR = '#38bdf8';
export function colorForPlace(place: string): string {
  return PLACE_COLORS[place] ?? DEFAULT_PLACE_COLOR;
}

export function formatHM(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Estado en vivo del itinerario — recalcula cada 30s. Como hay hasta 3
 * escenarios sonando a la vez, `currentList` trae TODOS los sets activos
 * ahora mismo (uno por escenario); `current` queda como el primero, solo
 * para quien necesite un único valor rápido (ej. compatibilidad).
 */
export function useLiveSchedule() {
  const [now, setNow] = useState(() => getNow());
  useEffect(() => {
    const id = window.setInterval(() => setNow(getNow()), 5_000); // suficiente para el cronograma, sin recargar el render
    return () => window.clearInterval(id);
  }, []);

  const currentList = SCHEDULE.filter(it => now >= it.start && now < it.end);
  const current = currentList[0] ?? null;
  const next = SCHEDULE.filter(it => it.start > now).sort((a, b) => a.start.getTime() - b.start.getTime())[0] ?? null;

  const currentActivity = ACTIVITIES.find(it => now >= it.start && now < it.end) ?? null;
  const nextActivity = ACTIVITIES.filter(it => it.start > now).sort((a, b) => a.start.getTime() - b.start.getTime())[0] ?? null;

  return { now, current, currentList, next, currentActivity, nextActivity };
}
