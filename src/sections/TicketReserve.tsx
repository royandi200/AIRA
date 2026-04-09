import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Users, Zap, Crown, Star, Minus, Plus, Check } from 'lucide-react';

export interface ReservationEvent {
  id: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  image?: string;
  venueType: 'festival' | 'yacht' | 'club';
}

interface TicketReserveProps {
  isOpen: boolean;
  selectedEvent: ReservationEvent | null;
  onClose: () => void;
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  description: string;
  perks: string[];
  accentColor: string;
  icon: React.ReactNode;
}

interface Zone {
  id: string;
  label: string;
  ticketId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const TICKETS: TicketType[] = [
  {
    id: 'general',
    name: 'General',
    price: 120000,
    description: 'Acceso base para vivir la fecha completa desde la energía del público.',
    perks: ['Ingreso general', 'Acceso a barras', 'Vista principal'],
    accentColor: '#ffffff',
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 'electric',
    name: 'Electric',
    price: 220000,
    description: 'Zona intermedia con mejor visual y acceso más rápido.',
    perks: ['Fila preferencial', 'Vista mejorada', 'Zona chill'],
    accentColor: '#004fff',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 420000,
    description: 'Experiencia premium con comodidad, visibilidad y servicio especial.',
    perks: ['Ingreso VIP', 'Open bar', 'Área exclusiva'],
    accentColor: '#e1fe52',
    icon: <Crown className="w-5 h-5" />,
  },
  {
    id: 'ultrastar',
    name: 'Ultra Star',
    price: 980000,
    description: 'Máximo nivel: privacidad, servicio dedicado y ubicación dominante.',
    perks: ['Host dedicado', 'Zona premium', 'Hospitality'],
    accentColor: '#fbbf24',
    icon: <Star className="w-5 h-5" />,
  },
];

const VENUE_ZONES: Record<ReservationEvent['venueType'], Zone[]> = {
  festival: [
    { id: 'ultrastar', label: 'ULTRA STAR', ticketId: 'ultrastar', x: 35, y: 10, w: 30, h: 14 },
    { id: 'vip',       label: 'VIP',        ticketId: 'vip',       x: 22, y: 28, w: 56, h: 14 },
    { id: 'electric',  label: 'ELECTRIC',   ticketId: 'electric',  x: 10, y: 47, w: 80, h: 15 },
    { id: 'general',   label: 'GENERAL',    ticketId: 'general',   x: 5,  y: 66, w: 90, h: 24 },
  ],
  yacht: [
    { id: 'ultrastar', label: 'CABINA ULTRA',  ticketId: 'ultrastar', x: 60, y: 8,  w: 28, h: 18 },
    { id: 'vip',       label: 'PROA VIP',      ticketId: 'vip',       x: 18, y: 8,  w: 34, h: 18 },
    { id: 'electric',  label: 'CUBIERTA ALTA', ticketId: 'electric',  x: 18, y: 34, w: 70, h: 18 },
    { id: 'general',   label: 'CUBIERTA MAIN', ticketId: 'general',   x: 12, y: 58, w: 76, h: 20 },
  ],
  club: [
    { id: 'ultrastar', label: 'BOX PRIVADO', ticketId: 'ultrastar', x: 66, y: 12, w: 22, h: 18 },
    { id: 'vip',       label: 'ÁREA VIP',    ticketId: 'vip',       x: 18, y: 12, w: 40, h: 18 },
    { id: 'electric',  label: 'MEZANINE',    ticketId: 'electric',  x: 20, y: 38, w: 60, h: 16 },
    { id: 'general',   label: 'PISTA',       ticketId: 'general',   x: 10, y: 60, w: 80, h: 22 },
  ],
};

const ZONE_COLORS: Record<string, string> = {
  ultrastar: 'rgba(251,191,36,0.18)',
  vip:       'rgba(225,254,82,0.16)',
  electric:  'rgba(0,79,255,0.18)',
  general:   'rgba(255,255,255,0.08)',
};

const ZONE_BORDERS: Record<string, string> = {
  ultrastar: 'rgba(251,191,36,0.75)',
  vip:       'rgba(225,254,82,0.7)',
  electric:  'rgba(0,79,255,0.75)',
  general:   'rgba(255,255,255,0.25)',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// ─── Body scroll lock — iOS-safe ───────────────────────────────────────
function useLockBodyScroll(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const body    = document.body;
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top      = `-${scrollY}px`;
    body.style.width    = '100%';
    return () => {
      body.style.overflow = '';
      body.style.position = '';
      body.style.top      = '';
      body.style.width    = '';
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
    };
  }, [isOpen]);
}

// ─── Wheel handler: desktop-only scroll containment ───────────────────────
function useWheelLock(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const canScrollUp   = scrollTop > 0;
      const canScrollDown = scrollTop + clientHeight < scrollHeight - 1;
      if ((e.deltaY < 0 && canScrollUp) || (e.deltaY > 0 && canScrollDown)) {
        e.stopPropagation();
        el.scrollTop += e.deltaY;
        e.preventDefault();
      } else {
        e.stopPropagation();
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

const TicketReserve = ({ isOpen, selectedEvent, onClose }: TicketReserveProps) => {
  const [step, setStep]                         = useState(1);
  const [qty, setQty]                           = useState(1);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId]     = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useLockBodyScroll(isOpen);
  useWheelLock(scrollRef);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setQty(1);
    setSelectedTicketId(null);
    setSelectedZoneId(null);
  }, [isOpen, selectedEvent?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const zones          = useMemo(() => (selectedEvent ? VENUE_ZONES[selectedEvent.venueType] : []), [selectedEvent]);
  const selectedTicket = useMemo(() => TICKETS.find(t => t.id === selectedTicketId) ?? null, [selectedTicketId]);
  const selectedZone   = useMemo(() => zones.find(z => z.id === selectedZoneId) ?? null, [zones, selectedZoneId]);

  const serviceFee = selectedTicket ? Math.round(selectedTicket.price * qty * 0.05) : 0;
  const total      = selectedTicket ? selectedTicket.price * qty + serviceFee : 0;

  if (!isOpen || !selectedEvent) return null;

  const steps = [
    { n: 1, label: 'Experiencia' },
    { n: 2, label: 'Zona' },
    { n: 3, label: 'Confirmar' },
  ];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4 md:p-6"
      style={{ background: 'rgba(3,6,18,0.82)', backdropFilter: 'blur(18px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reserva de tickets"
        className={
          'relative w-full sm:max-w-6xl '
          + 'rounded-t-[2rem] sm:rounded-[2rem] '
          + 'border border-white/10 bg-[#08101f] shadow-2xl '
          + 'flex flex-col '
          + 'max-h-[96dvh] sm:max-h-[92dvh]'
        }
        onClick={e => e.stopPropagation()}
      >
        <div
          className="absolute inset-0 opacity-20 pointer-events-none rounded-[inherit]"
          style={{
            background:
              'radial-gradient(circle at top right,rgba(225,254,82,0.24),transparent 30%),' +
              'radial-gradient(circle at left center,rgba(0,79,255,0.2),transparent 35%)',
          }}
        />

        {/* HEADER */}
        <div className="relative z-10 flex-none border-b border-white/10 px-5 py-4 md:px-8 md:py-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono-custom text-[10px] uppercase tracking-[0.35em] text-aira-lime/70 mb-1">Reserva en 3 pasos</p>
            <h3 className="font-display text-2xl md:text-4xl text-white leading-none truncate">{selectedEvent.venue}</h3>
            <p className="font-mono-custom text-xs md:text-sm text-white/45 mt-1.5">
              {selectedEvent.city} · {selectedEvent.date} · {selectedEvent.time}
            </p>
          </div>
          <button
            className="flex-none w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 active:bg-white/20 transition-colors"
            onClick={onClose}
            aria-label="Cerrar modal de reserva"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP PILLS */}
        <div className="relative z-10 flex-none px-5 md:px-8 pt-4 pb-3 flex flex-wrap gap-2 border-b border-white/[0.06]">
          {steps.map(item => {
            const active    = step === item.n;
            const completed = step > item.n;
            return (
              <div
                key={item.n}
                className={
                  'flex items-center gap-2 px-3 py-1.5 rounded-full border ' +
                  (active ? 'border-aira-lime/40 bg-aira-lime/10' : 'border-white/10 bg-white/[0.03]')
                }
              >
                <div
                  className={
                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono-custom ' +
                    (completed ? 'bg-aira-lime text-aira-darkBlue' : active ? 'bg-aira-blue text-white' : 'bg-white/10 text-white/50')
                  }
                >
                  {completed ? <Check className="w-3.5 h-3.5" /> : item.n}
                </div>
                <span className={'font-mono-custom text-[10px] uppercase tracking-[0.22em] ' + (active ? 'text-white' : 'text-white/45')}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* SCROLLABLE BODY */}
        <div
          ref={scrollRef}
          className="relative z-10 flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">

            {/* MAIN PANEL */}
            <div className="p-5 md:p-8 lg:border-r border-white/10">

              {/* STEP 1 */}
              {step === 1 && (
                <div>
                  <p className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/35 mb-3">Paso 1</p>
                  <h4 className="font-display text-3xl md:text-4xl text-white mb-2">Elige tu experiencia</h4>
                  <p className="text-sm text-white/50 mb-6">Selecciona el acceso y pasamos al plano del venue.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TICKETS.map(ticket => (
                      <button
                        key={ticket.id}
                        className="text-left rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/30 active:scale-[0.98] transition-all duration-200"
                        onClick={() => { setSelectedTicketId(ticket.id); setSelectedZoneId(ticket.id); setStep(2); }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${ticket.accentColor}20`, color: ticket.accentColor }}>
                          {ticket.icon}
                        </div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h5 className="font-display text-xl text-white">{ticket.name}</h5>
                          <span className="font-display text-base shrink-0" style={{ color: ticket.accentColor }}>{fmt(ticket.price)}</span>
                        </div>
                        <p className="text-xs text-white/50 mb-3 leading-relaxed">{ticket.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ticket.perks.map(perk => (
                            <span
                              key={perk}
                              className="px-2.5 py-1 rounded-full text-[9px] font-mono-custom uppercase tracking-[0.18em] border"
                              style={{ borderColor: `${ticket.accentColor}35`, color: ticket.accentColor, background: `${ticket.accentColor}10` }}
                            >
                              {perk}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && selectedTicket && (
                <div>
                  <p className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/35 mb-3">Paso 2</p>
                  <h4 className="font-display text-3xl md:text-4xl text-white mb-2">Selecciona tu zona</h4>
                  <p className="text-sm text-white/50 mb-5">
                    Plano específico para este venue. Zona precargada: <strong className="text-white">{selectedTicket.name}</strong>
                  </p>
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-[#07111f]">
                    <div className="absolute inset-x-[10%] top-[5%] h-[8%] rounded-b-[1rem] bg-aira-lime/90 flex items-center justify-center">
                      <span className="font-mono-custom text-[9px] uppercase tracking-[0.3em] text-aira-darkBlue font-bold">
                        {selectedEvent.venueType === 'festival' ? 'ESCENARIO' : selectedEvent.venueType === 'yacht' ? 'DJ BOOTH' : 'CABINA'}
                      </span>
                    </div>
                    {zones.map(zone => {
                      const active = selectedZoneId === zone.id;
                      return (
                        <button
                          key={zone.id}
                          className="absolute rounded-xl flex items-center justify-center transition-all duration-250"
                          style={{
                            left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%`,
                            background: ZONE_COLORS[zone.id],
                            border: `1.5px solid ${active ? ZONE_BORDERS[zone.id] : 'rgba(255,255,255,0.12)'}`,
                            transform: active ? 'scale(1.02)' : 'scale(1)',
                            boxShadow: active ? `0 0 0 1px ${ZONE_BORDERS[zone.id]},0 12px 28px rgba(0,0,0,0.2)` : 'none',
                          }}
                          onClick={() => setSelectedZoneId(zone.id)}
                        >
                          <span
                            className="font-mono-custom text-[9px] sm:text-[10px] uppercase tracking-[0.22em] font-bold"
                            style={{ color: active ? ZONE_BORDERS[zone.id] : 'rgba(255,255,255,0.42)' }}
                          >
                            {zone.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <button
                      className="px-5 py-2.5 rounded-full border border-white/10 text-white/70 text-sm hover:bg-white/5 active:bg-white/10 transition-colors"
                      onClick={() => setStep(1)}
                    >
                      Volver
                    </button>
                    <button
                      className="px-6 py-2.5 rounded-full bg-aira-lime text-aira-darkBlue font-display text-sm uppercase tracking-[0.2em] hover:bg-white active:scale-[0.97] transition-all"
                      onClick={() => setStep(3)}
                    >
                      Confirmar zona
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && selectedTicket && selectedZone && (
                <div>
                  <p className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/35 mb-3">Paso 3</p>
                  <h4 className="font-display text-3xl md:text-4xl text-white mb-2">Confirmar reserva</h4>
                  <p className="text-sm text-white/50 mb-5">Revisa el resumen antes de proceder al pago.</p>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">

                    {/* Event details grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        ['Evento', selectedEvent.venue],
                        ['Ciudad', selectedEvent.city],
                        ['Fecha',  selectedEvent.date],
                        ['Hora',   selectedEvent.time],
                      ] as [string, string][]).map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="font-mono-custom text-[9px] uppercase tracking-[0.22em] text-white/35 mb-1">{label}</p>
                          <p className="font-display text-base text-white truncate">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-4">
                      <div>
                        <p className="font-mono-custom text-[9px] uppercase tracking-[0.22em] text-white/35 mb-2">Tu selección</p>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className="px-3 py-1.5 rounded-full border text-sm"
                            style={{ borderColor: `${selectedTicket.accentColor}35`, color: selectedTicket.accentColor, background: `${selectedTicket.accentColor}10` }}
                          >
                            {selectedTicket.name}
                          </span>
                          <span className="px-3 py-1.5 rounded-full border border-white/10 text-white/70 bg-white/[0.03] text-sm">
                            {selectedZone.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 rounded-full border border-white/10 p-1">
                        <button
                          className="w-8 h-8 rounded-full hover:bg-white/10 active:bg-white/20 flex items-center justify-center transition-colors"
                          onClick={() => setQty(v => Math.max(1, v - 1))}
                          aria-label="Reducir cantidad"
                        >
                          <Minus className="w-3.5 h-3.5 text-white/60" />
                        </button>
                        <span className="w-8 text-center font-mono-custom text-sm text-white">{qty}</span>
                        <button
                          className="w-8 h-8 rounded-full hover:bg-white/10 active:bg-white/20 flex items-center justify-center transition-colors"
                          onClick={() => setQty(v => Math.min(8, v + 1))}
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="w-3.5 h-3.5 text-white/60" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-white/10 pt-4">
                      <div className="flex justify-between font-mono-custom text-sm text-white/55">
                        <span>Subtotal</span>
                        <span className="text-white">{fmt(selectedTicket.price * qty)}</span>
                      </div>
                      <div className="flex justify-between font-mono-custom text-sm text-white/55">
                        <span>Cargo de servicio</span>
                        <span className="text-white">{fmt(serviceFee)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-white/10">
                        <span className="font-display text-xl text-white">Total</span>
                        <span className="font-display text-2xl" style={{ color: selectedTicket.accentColor }}>{fmt(total)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        className="px-5 py-2.5 rounded-full border border-white/10 text-white/70 text-sm hover:bg-white/5 active:bg-white/10 transition-colors"
                        onClick={() => setStep(2)}
                      >
                        Volver al plano
                      </button>
                      <button className="flex-1 min-w-[160px] px-6 py-2.5 rounded-full bg-aira-lime text-aira-darkBlue font-display text-sm uppercase tracking-[0.2em] hover:bg-white active:scale-[0.97] transition-all">
                        Confirmar reserva
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SIDEBAR */}
            <aside className="p-5 md:p-8 bg-white/[0.02] border-t lg:border-t-0 border-white/10">
              <p className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/35 mb-3">Venue activo</p>
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04]">
                {selectedEvent.image
                  ? <img src={selectedEvent.image} alt={selectedEvent.venue} className="w-full aspect-video object-cover" loading="lazy" />
                  : <div className="w-full aspect-video bg-gradient-to-br from-aira-blue/20 to-aira-lime/10" />}
                <div className="p-4 border-t border-white/10">
                  <h5 className="font-display text-xl text-white mb-1">{selectedEvent.venue}</h5>
                  <p className="text-xs text-white/45 mb-3">{selectedEvent.city} · {selectedEvent.date} · {selectedEvent.time}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-aira-blue/20 text-aira-lime text-[9px] font-mono-custom uppercase tracking-[0.18em]">
                      {selectedEvent.venueType}
                    </span>
                    {selectedTicket && (
                      <span
                        className="px-2.5 py-1 rounded-full text-[9px] font-mono-custom uppercase tracking-[0.18em]"
                        style={{ background: `${selectedTicket.accentColor}15`, color: selectedTicket.accentColor }}
                      >
                        {selectedTicket.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-mono-custom text-[9px] uppercase tracking-[0.24em] text-white/35 mb-3">Qué cambia por venue</p>
                <ul className="space-y-2 text-xs text-white/55 leading-relaxed">
                  <li>🎪 Festival: escenario principal, campo abierto, zonas por profundidad.</li>
                  <li>⛵ Yacht: cubierta main, cubierta alta, proa VIP, cabina Ultra.</li>
                  <li>🎧 Club: pista, mezanine, área VIP, box privado.</li>
                </ul>
              </div>
            </aside>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketReserve;
