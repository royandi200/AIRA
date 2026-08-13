import { lazy, Suspense, useMemo, useState } from 'react';
import {
  Fingerprint, UtensilsCrossed, Sailboat, CalendarClock, Radar, Aperture, Gem, Bus, ScanFace,
  X, CheckCircle2, MapPinned, ArrowRight, Bell, LogOut, ChevronRight, ChevronDown, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { SCHEDULE, ACTIVITIES, useLiveSchedule, formatHM, type ScheduleItem } from './MyAppSchedule';
import type { Attendee } from './MyAppAuth';
import MyAppOrders from './MyAppOrders';
import MyAppActivities from './MyAppActivities';
import { useInstallPrompt } from './useInstallPrompt';
import { setSimTime, clearSimTime, isSimActive } from './timeDebug';

// Three.js (react-three-fiber + drei) solo se descarga cuando el usuario
// realmente abre "Mapa" — evita que todo /myapp cargue esa dependencia
// pesada de entrada.
const MyAppMap = lazy(() => import('./MyAppMap'));

function MapLoading() {
  return (
    <div className="mapa-loading">
      <div className="spinner" />
      <span>Cargando mapa 3D…</span>
    </div>
  );
}

/**
 * Contenido de cada sección de /myapp.
 * Todo el contenido es ficticio por ahora (demo) — Gastos y Pasaporte ya
 * tienen interacción real (local, sin backend aún). El resto simula datos
 * reales para poder revisar el look & feel completo antes de conectarlo.
 *
 * Estilo alineado con el sitio principal de AIRA (viveaira.live): paleta
 * aira-lime (#e1fe52) como acento de marca transversal, JetBrains Mono
 * para números/horas, kickers uppercase con tracking amplio.
 */

export interface CompassSection {
  id: string;
  label: string;
  Icon: LucideIcon;
  image: string;
  color: string; // acento por sección
}

export const SECTIONS: CompassSection[] = [
  { id: 'pasaporte',   label: 'Mi Pasaporte', Icon: Fingerprint,     image: '/AIRA.png',           color: '#22c55e' },
  { id: 'pedidos',     label: 'Pedidos',      Icon: UtensilsCrossed, image: '/bar.jpg',            color: '#10b981' },
  { id: 'actividades', label: 'Actividades',  Icon: Sailboat,        image: '/beach-party.jpg',    color: '#0ea5e9' },
  { id: 'lineup',      label: 'Itinerario',   Icon: CalendarClock,   image: '/dj-console.jpg',     color: '#a855f7' },
  { id: 'mapa',        label: 'Mapa',         Icon: Radar,           image: '/venue-map.jpg',      color: '#38bdf8' },
  { id: 'galeria',     label: 'Galería',      Icon: Aperture,        image: '/crowd-1.jpg',        color: '#f97316' },
  { id: 'transporte',  label: 'Transporte',   Icon: Bus,             image: '/yacht-party.jpg',    color: '#ef4444' },
  { id: 'perfil',      label: 'Mi Perfil',    Icon: ScanFace,        image: '/dj-portrait.jpg',    color: '#ec4899' },
];

const BOLETA_BASE = 'https://www.viveaira.live';

/**
 * QR real — mismo dato que valida la entrada: la URL completa de la
 * boleta (https://www.viveaira.live/boleta/{ref}?token={qrToken}), igual
 * a la que genera admin-generar-ticket.ts y a la que ya usa MisReservas.tsx
 * (QRDisplay). Se renderiza con el mismo servicio (api.qrserver.com) para
 * no sumar ninguna librería nueva — nada de placeholder ni datos falsos.
 */
function RealQr({ orderRef, qrToken }: { orderRef: string; qrToken: string }) {
  const boletaUrl = `${BOLETA_BASE}/boleta/${orderRef}?token=${qrToken}`;
  // El QR en sí queda en blanco y negro puro (mejor contraste = escanea
  // más confiable en la puerta) — el look "amarillo" de marca vuelve con
  // el marco/esquinas alrededor, no recoloreando los módulos del QR.
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(boletaUrl)}`;
  return (
    <div className="passport-qr-frame">
      <span className="passport-qr-corner passport-qr-corner--tl" />
      <span className="passport-qr-corner passport-qr-corner--tr" />
      <span className="passport-qr-corner passport-qr-corner--bl" />
      <span className="passport-qr-corner passport-qr-corner--br" />
      <img src={qrImgUrl} alt="Tu QR de acceso a AIRA" width={150} height={150} className="passport-qr-svg" />
    </div>
  );
}

/** Icono de "bloqueado" — se muestra en vez de un QR mientras no hay token real (evita mostrar algo que parezca escaneable sin serlo) */
function QrLocked() {
  return (
    <div className="passport-qr-locked" style={{ width: 150, height: 150 }}>
      🔒
    </div>
  );
}

const VIP_PERKS = [
  'Acceso a zona VIP elevada frente al escenario principal',
  'Barra premium ilimitada — cócteles de autor',
  'Servicio de meseros dedicado',
  'Check-in prioritario, sin filas',
  'Lounge privado con vista al embalse',
  'Kit de bienvenida AIRA',
];

function PasaportePanel({ attendee }: { attendee: Attendee | null }) {
  const isVip = attendee?.isVip ?? false;

  return (
    <div className="passport-card">
      <div className="passport-header">
        <img src="/AIRA BLANCO.png" alt="AIRA" className="passport-logo" />
        <span className="passport-kicker">Pase de Acceso</span>
      </div>

      <div className="passport-body">
        <div className="passport-field">
          <span className="passport-field-label">Titular</span>
          <span className="passport-field-value">{attendee?.name ?? '—'}</span>
        </div>
        <div className="passport-field-row">
          <div className="passport-field">
            <span className="passport-field-label">Referencia</span>
            <span className="passport-field-value">{attendee?.orderRef ?? '—'}</span>
          </div>
          <div className="passport-field">
            <span className="passport-field-label">Acceso</span>
            <span className="passport-field-value">{isVip ? 'VIP' : 'General'}</span>
          </div>
        </div>
        <div className="passport-field">
          <span className="passport-field-label">Alojamiento</span>
          <span className="passport-field-value">{attendee?.paquete ?? '—'}</span>
        </div>

        {attendee && attendee.montoPendiente > 0 ? (
          <div className="passport-pending">
            <span className="passport-pending-icon">⚠️</span>
            <div>
              <p className="passport-pending-title">
                Saldo pendiente: ${attendee.montoPendiente.toLocaleString('es-CO')}
              </p>
              <p className="passport-pending-sub">
                Tu QR de acceso se activa al completar el pago{attendee.paquete ? ` de tu ${attendee.paquete}` : ''}.
              </p>
            </div>
          </div>
        ) : (
          <div className="passport-qr-wrap">
            {attendee?.qrToken && attendee.orderRef ? (
              <>
                <RealQr orderRef={attendee.orderRef} qrToken={attendee.qrToken} />
                <p className="passport-qr-hint">Muestra este QR en la entrada del evento</p>
              </>
            ) : (
              <>
                <QrLocked />
                <p className="passport-qr-hint">Tu QR real se activa al confirmar el pago de tu boleta</p>
              </>
            )}
          </div>
        )}
      </div>

      {isVip && (
        <div className="passport-vip">
          <div className="passport-vip-header">
            <Gem size={18} className="passport-vip-icon" />
            <span>Beneficios VIP</span>
          </div>
          <div className="vip-perks">
            {VIP_PERKS.map((p) => (
              <div key={p} className="vip-perk">
                <CheckCircle2 size={16} className="vip-perk-check" />
                <span>{p}</span>
              </div>
            ))}
          </div>
          <button className="vip-cta">
            Habla con tu concierge <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Itinerario ───────────────────────────────────────────────────────────────
// Datos reales del PDF "ITINERARIO AIRA" (src/pages/MyAppSchedule.tsx).
// Muestra qué está pasando AHORA (banner en vivo) y el cronograma completo
// de los 3 días para saber qué viene — todo con el mismo reloj real.
const ITIN_DAYS: ScheduleItem['day'][] = ['Sábado', 'Domingo', 'Lunes'];

// Un color de marca distinto por escenario/lugar — el mismo lenguaje de
// acentos que ya usa el dial principal. Se usa para el glow difuminado
// de cada tarjeta y el punto de los acordeones, no para el fondo sólido.
const PLACE_COLORS: Record<string, string> = {
  'Japi Stage':    '#e1fe52',
  'Joinn Stage':   '#38bdf8',
  'Playa Aïra':    '#f97316',
  'Majestic':      '#a855f7',
  'Stage Playa':   '#22c55e',
};
const DEFAULT_COLOR = '#38bdf8';
function colorFor(place: string): string {
  return PLACE_COLORS[place] ?? DEFAULT_COLOR;
}

function groupByPlace(items: ScheduleItem[]): { place: string; color: string; items: ScheduleItem[] }[] {
  const order: string[] = [];
  const map = new Map<string, ScheduleItem[]>();
  for (const it of items) {
    if (!map.has(it.place)) { map.set(it.place, []); order.push(it.place); }
    map.get(it.place)!.push(it);
  }
  return order.map(place => ({ place, color: colorFor(place), items: map.get(place)! }));
}

/** Tarjeta de un ítem del cronograma — hora arriba, glow difuminado del color del lugar detrás */
function ScheduleCard({ item, isLive, isPast }: { item: ScheduleItem; isLive: boolean; isPast: boolean }) {
  const color = colorFor(item.place);
  return (
    <div className="sched-item">
      <span className="sched-time">{formatHM(item.start)}</span>
      <div
        className={`sched-card ${isLive ? 'is-live' : ''} ${isPast ? 'is-past' : ''}`}
        style={{ ['--card-color' as any]: color }}
      >
        <span className="sched-card-glow" />
        <div className="sched-card-body">
          <span className="sched-card-title">{item.title}</span>
          <span className="sched-card-place"><span className="sched-card-dot" />{item.place}</span>
        </div>
        {isLive && <span className="sched-card-live">EN VIVO</span>}
      </div>
    </div>
  );
}

/** Acordeón por escenario — colapsado por defecto salvo el que tiene un set en vivo */
function StageAccordion({ groups, now, liveIds }: {
  groups: { place: string; color: string; items: ScheduleItem[] }[];
  now: Date; liveIds: Set<string>;
}) {
  const liveStage = groups.find(g => g.items.some(it => liveIds.has(it.id)))?.place;
  const [open, setOpen] = useState<Set<string>>(() => new Set(liveStage ? [liveStage] : [groups[0]?.place].filter(Boolean) as string[]));

  const toggle = (place: string) => setOpen(prev => {
    const next = new Set(prev);
    next.has(place) ? next.delete(place) : next.add(place);
    return next;
  });

  return (
    <div className="stage-accordion">
      {groups.map(g => {
        const isOpen = open.has(g.place);
        const hasLive = g.items.some(it => liveIds.has(it.id));
        return (
          <div key={g.place} className={`stage-group ${isOpen ? 'is-open' : ''}`} style={{ ['--card-color' as any]: g.color }}>
            <button className="stage-group-head" onClick={() => toggle(g.place)}>
              <span className="stage-group-dot" />
              <span className="stage-group-name">{g.place}</span>
              {hasLive && <span className="stage-group-live">EN VIVO</span>}
              <span className="stage-group-count">{g.items.length}</span>
              <ChevronDown size={15} className="stage-group-chevron" />
            </button>
            {isOpen && (
              <div className="stage-group-body">
                {g.items.map(it => (
                  <ScheduleCard key={it.id} item={it} isLive={liveIds.has(it.id)} isPast={it.end <= now && !liveIds.has(it.id)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type ItinView = 'actividades' | 'lineup';

function ItinerarioPanel() {
  const { now, current, currentList, next, currentActivity, nextActivity } = useLiveSchedule();
  const [dayFilter, setDayFilter] = useState<ScheduleItem['day']>(current?.day ?? next?.day ?? 'Sábado');
  const [view, setView] = useState<ItinView>(() => (currentActivity && !current ? 'actividades' : 'lineup'));

  const activities = ACTIVITIES.filter(it => it.day === dayFilter);
  const lineup = SCHEDULE.filter(it => it.day === dayFilter);
  const liveIds = new Set(currentList.map(it => it.id));
  const lineupGroups = useMemo(() => groupByPlace(lineup), [lineup]);

  return (
    <div className="itin-panel">
      {(currentList.length > 0 || currentActivity) && (
        <div className={`itin-live-stack ${currentList.length > 1 ? 'itin-live-stack--multi' : ''}`}>
          {currentActivity && (
            <div className="itin-live-banner itin-live-banner--activity" style={{ ['--card-color' as any]: colorFor(currentActivity.place) }}>
              <span className="itin-live-banner-glow" />
              <span className="itin-live-dot" />
              <div className="itin-live-text">
                <span className="itin-live-kicker">Actividad ahora · {currentActivity.place}</span>
                <span className="itin-live-title">{currentActivity.title}</span>
                <span className="itin-live-place">hasta las {formatHM(currentActivity.end)}</span>
              </div>
            </div>
          )}
          {currentList.map(it => (
            <div key={it.id} className="itin-live-banner" style={{ ['--card-color' as any]: colorFor(it.place) }}>
              <span className="itin-live-banner-glow" />
              <span className="itin-live-dot" />
              <div className="itin-live-text">
                <span className="itin-live-kicker">Sucediendo ahora · {it.place}</span>
                <span className="itin-live-title">{it.title}</span>
                <span className="itin-live-place">hasta las {formatHM(it.end)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {currentList.length === 0 && !currentActivity && (next || nextActivity) && (
        <div className="itin-live-banner itin-live-banner--next">
          <div className="itin-live-text">
            <span className="itin-live-kicker">Próximo</span>
            <span className="itin-live-title">{(next ?? nextActivity)!.title}</span>
            <span className="itin-live-place">{(next ?? nextActivity)!.place} · {formatHM((next ?? nextActivity)!.start)}</span>
          </div>
        </div>
      )}

      <div className="lineup-daytabs">
        {ITIN_DAYS.map(d => (
          <button
            key={d}
            className={`lineup-daytab ${d === dayFilter ? 'is-active' : ''}`}
            onClick={() => setDayFilter(d)}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="itin-tabs">
        <button className={`itin-tab ${view === 'actividades' ? 'is-active' : ''}`} onClick={() => setView('actividades')}>
          🎯 Actividades
        </button>
        <button className={`itin-tab ${view === 'lineup' ? 'is-active' : ''}`} onClick={() => setView('lineup')}>
          🎧 Line-up
        </button>
      </div>

      {view === 'actividades' ? (
        <div className="sched-list">
          {activities.map(it => (
            <ScheduleCard key={it.id} item={it} isLive={currentActivity?.id === it.id} isPast={it.end <= now && currentActivity?.id !== it.id} />
          ))}
          {activities.length === 0 && <p className="itin-column-empty">Sin actividades este día</p>}
        </div>
      ) : (
        lineupGroups.length > 0
          ? <StageAccordion groups={lineupGroups} now={now} liveIds={liveIds} />
          : <p className="itin-column-empty">Sin sets este día</p>
      )}
    </div>
  );
}

// ── Galería ──────────────────────────────────────────────────────────────────
const GALLERY_ITEMS = [
  { src: '/crowd-1.jpg',    caption: 'La marea AIRA' },
  { src: '/dj-1.jpg',       caption: 'Cabina en llamas' },
  { src: '/stage-1.jpg',    caption: 'Main Stage · Noche 1' },
  { src: '/dancers.jpg',    caption: 'Pista sin freno' },
  { src: '/bar.jpg',        caption: 'Barra flotante' },
  { src: '/celebration.jpg',caption: 'Conteo regresivo' },
  { src: '/sunset.jpg',     caption: 'Atardecer en el embalse' },
  { src: '/vinyl.jpg',      caption: 'Vinilos & bajos' },
  { src: '/dj-female.jpg',  caption: 'Set al atardecer' },
];

function GaleriaPanel() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="galeria-panel">
      <p className="galeria-hint">Toca una foto para verla completa</p>
      <div className="galeria-grid">
        {GALLERY_ITEMS.map((g, i) => (
          <button key={g.src} className="galeria-thumb" onClick={() => setOpen(i)}>
            <img src={g.src} alt={g.caption} loading="lazy" />
          </button>
        ))}
      </div>

      {open !== null && (
        <div className="galeria-lightbox" onClick={() => setOpen(null)}>
          <button className="galeria-lightbox-close" onClick={() => setOpen(null)} aria-label="Cerrar">
            <X size={20} />
          </button>
          <img src={GALLERY_ITEMS[open].src} alt={GALLERY_ITEMS[open].caption} />
          <p className="galeria-lightbox-caption">{GALLERY_ITEMS[open].caption}</p>
        </div>
      )}
    </div>
  );
}

// ── Transporte ───────────────────────────────────────────────────────────────
const ROUTES = [
  { id: 'r1', from: 'Terminal Norte, Medellín',    to: 'Joinn Houtel, Guatapé',    depart: 'Vie 10:00 AM', duration: '1h 45min', seats: 12 },
  { id: 'r2', from: 'C.C. Santafé, Medellín',       to: 'Joinn Houtel, Guatapé',    depart: 'Vie 12:30 PM', duration: '1h 30min', seats: 4  },
  { id: 'r3', from: 'Joinn Houtel, Guatapé',        to: 'Terminal Norte, Medellín', depart: 'Dom 8:00 AM',  duration: '1h 45min', seats: 20 },
];

function TransportePanel() {
  return (
    <div className="transporte-panel">
      <p className="transporte-hint">Rutas incluidas en tu paquete de transporte</p>
      {ROUTES.map(r => (
        <div key={r.id} className="transporte-card">
          <div className="transporte-route">
            <span className="transporte-point">{r.from}</span>
            <ArrowRight size={14} className="transporte-arrow" />
            <span className="transporte-point">{r.to}</span>
          </div>
          <div className="transporte-meta">
            <span className="transporte-time">{r.depart}</span>
            <span className="transporte-dur">{r.duration}</span>
            <span className={`transporte-seats ${r.seats <= 5 ? 'is-low' : ''}`}>
              {r.seats} cupos
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Mi Perfil ────────────────────────────────────────────────────────────────
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? 'A') + (parts[1]?.[0] ?? '')).toUpperCase();
}

// ── Simulador de hora — solo para probar el "en vivo" sin esperar al
// evento real. Mueve el reloj de toda la app (clock + itinerario) a un
// momento del 15-17 de agosto y lo deja corriendo normal desde ahí.
const SIM_PRESETS: { label: string; date: string }[] = [
  { label: 'Sáb · Apertura (12:30)',      date: '2026-08-15T12:30:00' },
  { label: 'Sáb · Noche, 3 escenarios',    date: '2026-08-15T22:00:00' },
  { label: 'Dom · Torneo + line-up (15:00)', date: '2026-08-16T15:00:00' },
  { label: 'Dom · Noche blanca Majestic',  date: '2026-08-16T20:30:00' },
  { label: 'Lun · Cierre (12:30)',         date: '2026-08-17T12:30:00' },
];

function SimTimePanel() {
  const [active, setActive] = useState(() => isSimActive());
  const [, force] = useState(0);

  const apply = (dateStr: string) => {
    setSimTime(new Date(dateStr));
    setActive(true);
    force(n => n + 1);
  };
  const clear = () => {
    clearSimTime();
    setActive(false);
    force(n => n + 1);
  };

  return (
    <div className="perfil-sim">
      <span className="perfil-sim-title">🧪 Probar "en vivo" (simular hora del evento)</span>
      <div className="perfil-sim-grid">
        {SIM_PRESETS.map(p => (
          <button key={p.date} className="perfil-sim-btn" onClick={() => apply(p.date)}>{p.label}</button>
        ))}
      </div>
      {active && (
        <button className="perfil-sim-clear" onClick={clear}>Volver a la hora real</button>
      )}
    </div>
  );
}

function PerfilPanel({ attendee, onLogout }: { attendee: Attendee | null; onLogout: () => void }) {
  const name = attendee?.name ?? 'Invitado AIRA';
  const { canInstall, isIOS, showManualHint, installed, install } = useInstallPrompt();
  return (
    <div className="perfil-panel">
      <div className="perfil-avatar-row">
        <div className="perfil-avatar">{initials(name)}</div>
        <div className="perfil-id">
          <span className="perfil-name">{name}</span>
          <span className="perfil-ticket-badge">{attendee?.paquete ?? 'Sin paquete'} · {attendee?.orderRef ?? '—'}</span>
        </div>
      </div>

      <div className="perfil-stats">
        <div className="perfil-stat">
          <MapPinned size={16} className="perfil-stat-icon" />
          <span className="perfil-stat-label">Alojamiento</span>
          <span className="perfil-stat-value">{attendee?.paquete || '— Pendiente —'}</span>
        </div>
        <div className="perfil-stat">
          <Bell size={16} className="perfil-stat-icon" />
          <span className="perfil-stat-label">Notificaciones</span>
          <span className="perfil-stat-value">Activas</span>
        </div>
        <div className="perfil-stat">
          <ShieldCheck size={16} className="perfil-stat-icon" />
          <span className="perfil-stat-label">Consentimiento</span>
          <span className="perfil-stat-value">
            {attendee?.consentAcceptedAt
              ? `✅ Aceptado ${new Date(attendee.consentAcceptedAt).toLocaleDateString('es-CO')}`
              : '— Pendiente —'}
          </span>
        </div>
      </div>

      <div className="perfil-menu">
        <button className="perfil-menu-item">
          <span>Editar datos</span>
          <ChevronRight size={16} />
        </button>
        <button className="perfil-menu-item">
          <span>Historial de pedidos</span>
          <ChevronRight size={16} />
        </button>
        {!installed && canInstall && (
          <button className="perfil-menu-item" onClick={install}>
            <span>📲 Instalar app en el celular</span>
            <ChevronRight size={16} />
          </button>
        )}
        <button className="perfil-menu-item perfil-menu-item--danger" onClick={onLogout}>
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>

      {!installed && !canInstall && (isIOS || showManualHint) && (
        <p className="perfil-install-hint">
          {isIOS
            ? <>En iPhone: toca <strong>Compartir</strong> ⬆️ y luego <strong>"Agregar a pantalla de inicio"</strong> para instalar la app.</>
            : <>Para instalar la app: toca el menú <strong>⋮</strong> del navegador y elige <strong>"Instalar app"</strong> o <strong>"Agregar a pantalla de inicio"</strong>.</>}
        </p>
      )}

      <SimTimePanel />
    </div>
  );
}

function ComingSoonPanel({ section }: { section: CompassSection }) {
  const { Icon } = section;
  return (
    <div className="soon-panel">
      <Icon className="soon-icon" style={{ color: section.color }} strokeWidth={1.4} />
      <p className="soon-text">Estamos preparando <strong>{section.label}</strong> — vuelve pronto.</p>
    </div>
  );
}

export function renderSectionContent(section: CompassSection, attendee: Attendee | null, onLogout: () => void) {
  switch (section.id) {
    case 'pasaporte':   return <PasaportePanel attendee={attendee} />;
    case 'pedidos':     return <MyAppOrders attendee={attendee} />;
    case 'actividades': return <MyAppActivities />;
    case 'mapa':       return <Suspense fallback={<MapLoading />}><MyAppMap attendee={attendee} /></Suspense>;
    case 'lineup':     return <ItinerarioPanel />;
    case 'galeria':    return <GaleriaPanel />;
    case 'transporte': return <TransportePanel />;
    case 'perfil':     return <PerfilPanel attendee={attendee} onLogout={onLogout} />;
    default:           return <ComingSoonPanel section={section} />;
  }
}
