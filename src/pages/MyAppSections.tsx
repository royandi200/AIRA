import { lazy, Suspense, useState } from 'react';
import {
  Fingerprint, UtensilsCrossed, Sailboat, CalendarClock, Radar, Aperture, Gem, Bus, ScanFace,
  X, CheckCircle2, MapPinned, ArrowRight, Bell, LogOut, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { SCHEDULE, useLiveSchedule, formatHM, type ScheduleItem } from './MyAppSchedule';
import type { Attendee } from './MyAppAuth';
import MyAppOrders from './MyAppOrders';
import MyAppActivities from './MyAppActivities';

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

/** Placeholder visual tipo QR — se reemplaza por el QR real (orders.qr_token) cuando se conecte al backend */
function QrPlaceholder({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" width="150" height="150" className="passport-qr-svg">
      <rect width="120" height="120" rx="10" fill="#fff" />
      {[[6, 6], [80, 6], [6, 80]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="34" height="34" rx="4" fill="#111" />
          <rect x={x + 6} y={y + 6} width="22" height="22" rx="2" fill="#fff" />
          <rect x={x + 12} y={y + 12} width="10" height="10" rx="1" fill={color} />
        </g>
      ))}
      {Array.from({ length: 40 }).map((_, i) => {
        const gx = 46 + (i % 8) * 8;
        const gy = 46 + Math.floor(i / 8) * 8;
        return Math.random() > 0.45 ? <rect key={i} x={gx} y={gy} width="6" height="6" fill="#111" /> : null;
      })}
    </svg>
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

        <div className="passport-qr-wrap">
          <QrPlaceholder color="#22c55e" />
          {attendee?.qrToken ? (
            <>
              <p className="passport-qr-hint">Muestra tu boleta con QR en la entrada del evento</p>
              <a
                className="passport-qr-link"
                href={`/boleta/${attendee.orderRef}?token=${attendee.qrToken}`}
                target="_blank"
                rel="noreferrer"
              >
                Ver mi boleta con QR real
              </a>
            </>
          ) : (
            <p className="passport-qr-hint">Tu QR real se activa al confirmar el pago de tu boleta</p>
          )}
        </div>
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

function ItinerarioPanel() {
  const { now, current, next } = useLiveSchedule();
  const [dayFilter, setDayFilter] = useState<ScheduleItem['day']>(current?.day ?? next?.day ?? 'Sábado');

  const items = SCHEDULE.filter(it => it.day === dayFilter);

  return (
    <div className="itin-panel">
      {current && (
        <div className="itin-live-banner">
          <span className="itin-live-dot" />
          <div className="itin-live-text">
            <span className="itin-live-kicker">Sucediendo ahora</span>
            <span className="itin-live-title">{current.title}</span>
            <span className="itin-live-place">{current.place} · hasta las {formatHM(current.end)}</span>
          </div>
        </div>
      )}
      {!current && next && (
        <div className="itin-live-banner itin-live-banner--next">
          <div className="itin-live-text">
            <span className="itin-live-kicker">Próximo</span>
            <span className="itin-live-title">{next.title}</span>
            <span className="itin-live-place">{next.place} · {formatHM(next.start)}</span>
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

      <div className="lineup-timeline">
        {items.map((it) => {
          const isLive = current?.id === it.id;
          const isPast = it.end <= now && !isLive;
          return (
            <div key={it.id} className={`lineup-set ${isLive ? 'is-headliner' : ''} ${isPast ? 'is-past' : ''}`}>
              <span className="lineup-set-time">{formatHM(it.start)}</span>
              <div className="lineup-set-dot" />
              <div className="lineup-set-body">
                <span className="lineup-set-artist">{it.title}</span>
                <span className="lineup-set-stage">{it.place}</span>
              </div>
              {isLive && <span className="lineup-set-badge">EN VIVO</span>}
            </div>
          );
        })}
      </div>
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

function PerfilPanel({ attendee, onLogout }: { attendee: Attendee | null; onLogout: () => void }) {
  const name = attendee?.name ?? 'Invitado AIRA';
  return (
    <div className="perfil-panel">
      <div className="perfil-avatar-row">
        <div className="perfil-avatar">{initials(name)}</div>
        <div className="perfil-id">
          <span className="perfil-name">{name}</span>
          <span className="perfil-ticket-badge">{attendee?.isVip ? 'Pase VIP' : 'Pase General'} · {attendee?.orderRef ?? '—'}</span>
        </div>
      </div>

      <div className="perfil-stats">
        <div className="perfil-stat">
          <MapPinned size={16} className="perfil-stat-icon" />
          <span className="perfil-stat-label">Cabaña asignada</span>
          <span className="perfil-stat-value">— Pendiente —</span>
        </div>
        <div className="perfil-stat">
          <Bell size={16} className="perfil-stat-icon" />
          <span className="perfil-stat-label">Notificaciones</span>
          <span className="perfil-stat-value">Activas</span>
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
        <button className="perfil-menu-item perfil-menu-item--danger" onClick={onLogout}>
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
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
    case 'pedidos':     return <MyAppOrders />;
    case 'actividades': return <MyAppActivities />;
    case 'mapa':       return <Suspense fallback={<MapLoading />}><MyAppMap /></Suspense>;
    case 'lineup':     return <ItinerarioPanel />;
    case 'galeria':    return <GaleriaPanel />;
    case 'transporte': return <TransportePanel />;
    case 'perfil':     return <PerfilPanel attendee={attendee} onLogout={onLogout} />;
    default:           return <ComingSoonPanel section={section} />;
  }
}
