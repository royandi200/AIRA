import { lazy, Suspense, useState } from 'react';
import {
  Fingerprint, Wallet, Headphones, Radar, Aperture, Gem, Bus, ScanFace,
  X, CheckCircle2, MapPinned, ArrowRight, Bell, LogOut, Sparkles, ChevronRight,
  type LucideIcon,
} from 'lucide-react';

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
  { id: 'pasaporte',  label: 'Mi Pasaporte', Icon: Fingerprint, image: '/AIRA.png',           color: '#22c55e' },
  { id: 'gastos',     label: 'Tus Gastos',   Icon: Wallet,      image: '/vinyl.jpg',           color: '#10b981' },
  { id: 'lineup',     label: 'Line-Up',      Icon: Headphones,  image: '/dj-console.jpg',      color: '#a855f7' },
  { id: 'mapa',       label: 'Mapa',         Icon: Radar,       image: '/venue-map.jpg',       color: '#38bdf8' },
  { id: 'galeria',    label: 'Galería',      Icon: Aperture,    image: '/crowd-1.jpg',         color: '#f97316' },
  { id: 'vip',        label: 'VIP',          Icon: Gem,         image: '/vip-area.jpg',        color: '#e1fe52' },
  { id: 'transporte', label: 'Transporte',   Icon: Bus,         image: '/yacht-party.jpg',     color: '#ef4444' },
  { id: 'perfil',     label: 'Mi Perfil',    Icon: ScanFace,    image: '/dj-portrait.jpg',     color: '#ec4899' },
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

function PasaportePanel() {
  return (
    <div className="passport-card">
      <div className="passport-header">
        <img src="/AIRA BLANCO.png" alt="AIRA" className="passport-logo" />
        <span className="passport-kicker">Pase de Acceso</span>
      </div>

      <div className="passport-body">
        <div className="passport-field">
          <span className="passport-field-label">Titular</span>
          <span className="passport-field-value">— Vincula tu orden —</span>
        </div>
        <div className="passport-field-row">
          <div className="passport-field">
            <span className="passport-field-label">Referencia</span>
            <span className="passport-field-value">AIRA-XXXX</span>
          </div>
          <div className="passport-field">
            <span className="passport-field-label">Acceso</span>
            <span className="passport-field-value">General</span>
          </div>
        </div>

        <div className="passport-qr-wrap">
          <QrPlaceholder color="#22c55e" />
          <p className="passport-qr-hint">Tu QR real se activa al confirmar el pago de tu boleta</p>
        </div>
      </div>
    </div>
  );
}

interface Expense {
  id: number;
  label: string;
  amount: number;
}

function GastosPanel() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [label, setLabel]       = useState('');
  const [amount, setAmount]     = useState('');

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const addExpense = () => {
    const n = Number(amount);
    if (!label.trim() || !n || n <= 0) return;
    setExpenses(prev => [...prev, { id: Date.now(), label: label.trim(), amount: n }]);
    setLabel('');
    setAmount('');
  };

  const removeExpense = (id: number) => setExpenses(prev => prev.filter(e => e.id !== id));

  return (
    <div className="gastos-panel">
      <div className="gastos-total">
        <span className="gastos-total-label">Total gastado</span>
        <span className="gastos-total-value">
          ${total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
        </span>
      </div>

      <div className="gastos-form">
        <input
          className="gastos-input"
          placeholder="¿En qué? (ej. Trago, transporte...)"
          value={label}
          onChange={e => setLabel(e.target.value)}
        />
        <div className="gastos-form-row">
          <input
            className="gastos-input gastos-input--amount"
            placeholder="$ monto"
            inputMode="numeric"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
          />
          <button className="gastos-add-btn" onClick={addExpense}>Agregar</button>
        </div>
      </div>

      <div className="gastos-list">
        {expenses.length === 0 && <p className="gastos-empty">Aún no registras gastos.</p>}
        {expenses.map(e => (
          <div key={e.id} className="gastos-item">
            <span className="gastos-item-label">{e.label}</span>
            <span className="gastos-item-amount">${e.amount.toLocaleString('es-CO')}</span>
            <button className="gastos-item-remove" onClick={() => removeExpense(e.id)} aria-label="Eliminar">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Line-Up ─────────────────────────────────────────────────────────────────
interface LineupSet { time: string; artist: string; stage: string; headliner?: boolean }
interface LineupDay { id: string; label: string; sub: string; date: string; sets: LineupSet[] }

const LINEUP_DAYS: LineupDay[] = [
  {
    id: 'day1', label: 'DÍA 1', sub: 'After Fiesta de Yates', date: 'VIE 21 NOV',
    sets: [
      { time: '14:00', artist: 'NOVA SORA',           stage: 'Muelle Principal' },
      { time: '16:30', artist: 'KAIROS B2B ECLYPS',   stage: 'Muelle Principal' },
      { time: '19:00', artist: 'VELVETRA',            stage: 'Cubierta Norte', headliner: true },
      { time: '21:30', artist: 'DJ AXIOM',            stage: 'Cubierta Norte' },
    ],
  },
  {
    id: 'day2', label: 'DÍA 2', sub: 'Fiesta Majestic & Stage Joinn', date: 'SÁB 22 NOV',
    sets: [
      { time: '15:00', artist: 'LUNA NOX',             stage: 'Stage Joinn' },
      { time: '17:30', artist: 'REVLON DEEP',          stage: 'Stage Joinn' },
      { time: '20:00', artist: 'AXEL PRIME',           stage: 'Majestic Deck', headliner: true },
      { time: '22:30', artist: 'KAIROS',               stage: 'Majestic Deck' },
      { time: '00:30', artist: 'NOVA SORA · Closing',  stage: 'Majestic Deck' },
    ],
  },
  {
    id: 'day3', label: 'DÍA 3', sub: 'Open Deck', date: 'DOM 23 NOV',
    sets: [
      { time: '13:00', artist: 'ECLYPS',               stage: 'Open Deck' },
      { time: '15:30', artist: 'VELVETRA B2B AXIOM',   stage: 'Open Deck', headliner: true },
      { time: '18:00', artist: 'LUNA NOX · Sunset Set', stage: 'Open Deck' },
    ],
  },
];

function LineupPanel() {
  const [dayIdx, setDayIdx] = useState(0);
  const day = LINEUP_DAYS[dayIdx];

  return (
    <div className="lineup-panel">
      <div className="lineup-daytabs">
        {LINEUP_DAYS.map((d, i) => (
          <button
            key={d.id}
            className={`lineup-daytab ${i === dayIdx ? 'is-active' : ''}`}
            onClick={() => setDayIdx(i)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="lineup-day-header">
        <span className="lineup-day-sub">{day.sub}</span>
        <span className="lineup-day-date">{day.date}</span>
      </div>

      <div className="lineup-timeline">
        {day.sets.map((s, i) => (
          <div key={i} className={`lineup-set ${s.headliner ? 'is-headliner' : ''}`}>
            <span className="lineup-set-time">{s.time}</span>
            <div className="lineup-set-dot" />
            <div className="lineup-set-body">
              <span className="lineup-set-artist">{s.artist}</span>
              <span className="lineup-set-stage">{s.stage}</span>
            </div>
            {s.headliner && <span className="lineup-set-badge">HEADLINER</span>}
          </div>
        ))}
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

// ── VIP ──────────────────────────────────────────────────────────────────────
const VIP_PERKS = [
  'Acceso a zona VIP elevada frente al escenario principal',
  'Barra premium ilimitada — cócteles de autor',
  'Servicio de meseros dedicado',
  'Check-in prioritario, sin filas',
  'Lounge privado con vista al embalse',
  'Kit de bienvenida AIRA',
];

function VipPanel() {
  return (
    <div className="vip-panel">
      <div className="vip-hero">
        <Sparkles className="vip-hero-icon" size={22} />
        <span className="vip-hero-kicker">Tu paquete</span>
        <span className="vip-hero-title">VIP Deluxe</span>
      </div>

      <div className="vip-perks">
        {VIP_PERKS.map((p) => (
          <div key={p} className="vip-perk">
            <CheckCircle2 size={17} className="vip-perk-check" />
            <span>{p}</span>
          </div>
        ))}
      </div>

      <button className="vip-cta">
        Habla con tu concierge <ChevronRight size={16} />
      </button>
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
function PerfilPanel() {
  return (
    <div className="perfil-panel">
      <div className="perfil-avatar-row">
        <div className="perfil-avatar">AI</div>
        <div className="perfil-id">
          <span className="perfil-name">Invitado AIRA</span>
          <span className="perfil-ticket-badge">Pase 3 Días · 2ª Etapa</span>
        </div>
      </div>

      <div className="perfil-stats">
        <div className="perfil-stat">
          <MapPinned size={16} className="perfil-stat-icon" />
          <span className="perfil-stat-label">Cabaña asignada</span>
          <span className="perfil-stat-value">Cabaña 9</span>
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
        <button className="perfil-menu-item perfil-menu-item--danger">
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

export function renderSectionContent(section: CompassSection) {
  switch (section.id) {
    case 'pasaporte':  return <PasaportePanel />;
    case 'gastos':     return <GastosPanel />;
    case 'mapa':       return <Suspense fallback={<MapLoading />}><MyAppMap /></Suspense>;
    case 'lineup':     return <LineupPanel />;
    case 'galeria':    return <GaleriaPanel />;
    case 'vip':        return <VipPanel />;
    case 'transporte': return <TransportePanel />;
    case 'perfil':     return <PerfilPanel />;
    default:           return <ComingSoonPanel section={section} />;
  }
}
