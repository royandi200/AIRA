import { useEffect, useMemo, useState } from 'react';
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
    { id: 'vip', label: 'VIP', ticketId: 'vip', x: 22, y: 28, w: 56, h: 14 },
    { id: 'electric', label: 'ELECTRIC', ticketId: 'electric', x: 10, y: 47, w: 80, h: 15 },
    { id: 'general', label: 'GENERAL', ticketId: 'general', x: 5, y: 66, w: 90, h: 24 },
  ],
  yacht: [
    { id: 'ultrastar', label: 'CABINA ULTRA', ticketId: 'ultrastar', x: 60, y: 8, w: 28, h: 18 },
    { id: 'vip', label: 'PROA VIP', ticketId: 'vip', x: 18, y: 8, w: 34, h: 18 },
    { id: 'electric', label: 'CUBIERTA ALTA', ticketId: 'electric', x: 18, y: 34, w: 70, h: 18 },
    { id: 'general', label: 'CUBIERTA MAIN', ticketId: 'general', x: 12, y: 58, w: 76, h: 20 },
  ],
  club: [
    { id: 'ultrastar', label: 'BOX PRIVADO', ticketId: 'ultrastar', x: 66, y: 12, w: 22, h: 18 },
    { id: 'vip', label: 'ÁREA VIP', ticketId: 'vip', x: 18, y: 12, w: 40, h: 18 },
    { id: 'electric', label: 'MEZANINE', ticketId: 'electric', x: 20, y: 38, w: 60, h: 16 },
    { id: 'general', label: 'PISTA', ticketId: 'general', x: 10, y: 60, w: 80, h: 22 },
  ],
};

const ZONE_COLORS: Record<string, string> = {
  ultrastar: 'rgba(251,191,36,0.18)',
  vip: 'rgba(225,254,82,0.16)',
  electric: 'rgba(0,79,255,0.18)',
  general: 'rgba(255,255,255,0.08)',
};

const ZONE_BORDERS: Record<string, string> = {
  ultrastar: 'rgba(251,191,36,0.75)',
  vip: 'rgba(225,254,82,0.7)',
  electric: 'rgba(0,79,255,0.75)',
  general: 'rgba(255,255,255,0.25)',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const TicketReserve = ({ isOpen, selectedEvent, onClose }: TicketReserveProps) => {
  const [step, setStep] = useState(1);
  const [qty, setQty] = useState(1);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setQty(1);
    setSelectedTicketId(null);
    setSelectedZoneId(null);
  }, [isOpen, selectedEvent?.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const zones = useMemo(() => {
    if (!selectedEvent) return [];
    return VENUE_ZONES[selectedEvent.venueType];
  }, [selectedEvent]);

  const selectedTicket = useMemo(
    () => TICKETS.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [selectedTicketId]
  );

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [zones, selectedZoneId]
  );

  const serviceFee = selectedTicket ? Math.round(selectedTicket.price * qty * 0.05) : 0;
  const total = selectedTicket ? selectedTicket.price * qty + serviceFee : 0;

  if (!isOpen || !selectedEvent) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-8"
      style={{ background: 'rgba(3, 6, 18, 0.82)', backdropFilter: 'blur(18px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl rounded-[2rem] border border-white/10 bg-[#08101f] shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(225,254,82,0.24), transparent 30%), radial-gradient(circle at left center, rgba(0,79,255,0.2), transparent 35%)' }} />

        <div className="relative z-10 border-b border-white/10 px-6 py-5 md:px-8 flex items-start justify-between gap-6">
          <div>
            <p className="font-mono-custom text-[11px] uppercase tracking-[0.35em] text-aira-lime/70 mb-2">
              Reserva en 3 pasos
            </p>
            <h3 className="font-display text-3xl md:text-4xl text-white leading-none">
              {selectedEvent.venue}
            </h3>
            <p className="font-mono-custom text-sm text-white/45 mt-3">
              {selectedEvent.city} · {selectedEvent.date} · {selectedEvent.time}
            </p>
          </div>

          <button
            className="w-11 h-11 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
            onClick={onClose}
            aria-label="Cerrar modal de reserva"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 px-6 md:px-8 pt-5 pb-3 flex flex-wrap gap-3">
          {[
            { n: 1, label: 'Experiencia' },
            { n: 2, label: 'Zona' },
            { n: 3, label: 'Confirmar' },
          ].map((item) => {
            const active = step === item.n;
            const completed = step > item.n;
            return (
              <div
                key={item.n}
                className={`flex items-center gap-3 px-4 py-2 rounded-full border ${active ? 'border-aira-lime/40 bg-aira-lime/10' : 'border-white/10 bg-white/[0.03]'}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono-custom ${completed ? 'bg-aira-lime text-aira-darkBlue' : active ? 'bg-aira-blue text-white' : 'bg-white/10 text-white/50'}`}>
                  {completed ? <Check className="w-4 h-4" /> : item.n}
                </div>
                <span className={`font-mono-custom text-xs uppercase tracking-[0.22em] ${active ? 'text-white' : 'text-white/45'}`}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-0 min-h-[68vh]">
          <div className="p-6 md:p-8 border-r border-white/10">
            {step === 1 && (
              <div>
                <p className="font-mono-custom text-xs uppercase tracking-[0.3em] text-white/35 mb-4">Paso 1</p>
                <h4 className="font-display text-4xl text-white mb-3">Elige tu experiencia</h4>
                <p className="text-white/50 max-w-2xl mb-8">Selecciona el tipo de acceso y avanzamos al plano del venue específico para esta fecha.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TICKETS.map((ticket) => (
                    <button
                      key={ticket.id}
                      className="text-left rounded-3xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/30 transition-all duration-300 hover:-translate-y-1"
                      onClick={() => {
                        setSelectedTicketId(ticket.id);
                        setSelectedZoneId(ticket.id);
                        setStep(2);
                      }}
                    >
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${ticket.accentColor}20`, color: ticket.accentColor }}>
                        {ticket.icon}
                      </div>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h5 className="font-display text-2xl text-white">{ticket.name}</h5>
                        <span className="font-display text-lg" style={{ color: ticket.accentColor }}>{fmt(ticket.price)}</span>
                      </div>
                      <p className="text-sm text-white/50 mb-4">{ticket.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {ticket.perks.map((perk) => (
                          <span key={perk} className="px-3 py-1 rounded-full text-[10px] font-mono-custom uppercase tracking-[0.18em] border" style={{ borderColor: `${ticket.accentColor}35`, color: ticket.accentColor, background: `${ticket.accentColor}10` }}>
                            {perk}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && selectedTicket && (
              <div>
                <p className="font-mono-custom text-xs uppercase tracking-[0.3em] text-white/35 mb-4">Paso 2</p>
                <h4 className="font-display text-4xl text-white mb-3">Selecciona tu zona</h4>
                <p className="text-white/50 max-w-2xl mb-8">El plano cambia según el venue. Ya precargamos la zona ideal para {selectedTicket.name}, pero puedes tocar otra antes de continuar.</p>
                <div className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/10 bg-[#07111f] p-4">
                  <div className="absolute inset-x-[10%] top-[5%] h-[8%] rounded-b-[1.5rem] bg-aira-lime/90 flex items-center justify-center">
                    <span className="font-mono-custom text-[10px] uppercase tracking-[0.35em] text-aira-darkBlue font-bold">
                      {selectedEvent.venueType === 'festival' ? 'ESCENARIO' : selectedEvent.venueType === 'yacht' ? 'DJ BOOTH' : 'CABINA'}
                    </span>
                  </div>
                  {zones.map((zone) => {
                    const isActive = selectedZoneId === zone.id;
                    return (
                      <button
                        key={zone.id}
                        className="absolute rounded-2xl flex items-center justify-center transition-all duration-300"
                        style={{
                          left: `${zone.x}%`,
                          top: `${zone.y}%`,
                          width: `${zone.w}%`,
                          height: `${zone.h}%`,
                          background: ZONE_COLORS[zone.id],
                          border: `1.5px solid ${isActive ? ZONE_BORDERS[zone.id] : 'rgba(255,255,255,0.12)'}`,
                          transform: isActive ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: isActive ? `0 0 0 1px ${ZONE_BORDERS[zone.id]}, 0 20px 40px rgba(0,0,0,0.18)` : 'none',
                        }}
                        onClick={() => setSelectedZoneId(zone.id)}
                      >
                        <span className="font-mono-custom text-[10px] md:text-xs uppercase tracking-[0.22em] font-bold" style={{ color: isActive ? ZONE_BORDERS[zone.id] : 'rgba(255,255,255,0.42)' }}>
                          {zone.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <button className="px-5 py-3 rounded-full border border-white/10 text-white/70 hover:bg-white/5 transition-colors" onClick={() => setStep(1)}>
                    Volver
                  </button>
                  <button
                    className="px-7 py-3 rounded-full bg-aira-lime text-aira-darkBlue font-display text-sm uppercase tracking-[0.22em] hover:bg-white transition-colors"
                    onClick={() => setStep(3)}
                  >
                    Confirmar zona
                  </button>
                </div>
              </div>
            )}

            {step === 3 && selectedTicket && selectedZone && (
              <div>
                <p className="font-mono-custom text-xs uppercase tracking-[0.3em] text-white/35 mb-4">Paso 3</p>
                <h4 className="font-display text-4xl text-white mb-3">Confirmar reserva</h4>
                <p className="text-white/50 max-w-2xl mb-8">Revisa tu combinación de evento, zona y cantidad antes de conectar la pasarela de pago.</p>
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-7 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      ['Evento', selectedEvent.venue],
                      ['Ciudad', selectedEvent.city],
                      ['Fecha', selectedEvent.date],
                      ['Hora', selectedEvent.time],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                        <p className="font-mono-custom text-[10px] uppercase tracking-[0.24em] text-white/35 mb-2">{label}</p>
                        <p className="font-display text-lg text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-end border-t border-white/10 pt-5">
                    <div>
                      <p className="font-mono-custom text-[10px] uppercase tracking-[0.24em] text-white/35 mb-2">Tu selección</p>
                      <div className="flex flex-wrap gap-3">
                        <span className="px-4 py-2 rounded-full border" style={{ borderColor: `${selectedTicket.accentColor}35`, color: selectedTicket.accentColor, background: `${selectedTicket.accentColor}10` }}>
                          {selectedTicket.name}
                        </span>
                        <span className="px-4 py-2 rounded-full border border-white/10 text-white/70 bg-white/[0.03]">
                          {selectedZone.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-full border border-white/10 p-1 w-fit">
                      <button className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center" onClick={() => setQty((value) => Math.max(1, value - 1))}>
                        <Minus className="w-4 h-4 text-white/60" />
                      </button>
                      <span className="w-10 text-center font-mono-custom text-sm text-white">{qty}</span>
                      <button className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center" onClick={() => setQty((value) => Math.min(8, value + 1))}>
                        <Plus className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-white/10 pt-5">
                    <div className="flex items-center justify-between text-white/55 font-mono-custom text-sm">
                      <span>Subtotal</span>
                      <span className="text-white">{fmt(selectedTicket.price * qty)}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/55 font-mono-custom text-sm">
                      <span>Cargo de servicio</span>
                      <span className="text-white">{fmt(serviceFee)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="font-display text-xl text-white">Total</span>
                      <span className="font-display text-2xl" style={{ color: selectedTicket.accentColor }}>{fmt(total)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-2">
                    <button className="px-5 py-3 rounded-full border border-white/10 text-white/70 hover:bg-white/5 transition-colors" onClick={() => setStep(2)}>
                      Volver al plano
                    </button>
                    <button className="px-7 py-3 rounded-full bg-aira-lime text-aira-darkBlue font-display text-sm uppercase tracking-[0.22em] hover:bg-white transition-colors">
                      Confirmar reserva
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="p-6 md:p-8 bg-white/[0.02]">
            <p className="font-mono-custom text-xs uppercase tracking-[0.3em] text-white/35 mb-4">Venue activo</p>
            <div className="rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.04]">
              {selectedEvent.image ? (
                <img src={selectedEvent.image} alt={selectedEvent.venue} className="w-full aspect-[5/4] object-cover" />
              ) : (
                <div className="w-full aspect-[5/4] bg-gradient-to-br from-aira-blue/20 to-aira-lime/10" />
              )}
              <div className="p-5 border-t border-white/10">
                <h5 className="font-display text-2xl text-white mb-2">{selectedEvent.venue}</h5>
                <p className="text-sm text-white/45 mb-4">{selectedEvent.city} · {selectedEvent.date} · {selectedEvent.time}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-aira-blue/20 text-aira-lime text-[10px] font-mono-custom uppercase tracking-[0.18em]">
                    {selectedEvent.venueType}
                  </span>
                  {selectedTicket && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-mono-custom uppercase tracking-[0.18em]" style={{ background: `${selectedTicket.accentColor}15`, color: selectedTicket.accentColor }}>
                      {selectedTicket.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
              <p className="font-mono-custom text-[10px] uppercase tracking-[0.24em] text-white/35 mb-4">Qué cambia por venue</p>
              <ul className="space-y-3 text-sm text-white/55">
                <li>Festival: escenario principal, campo abierto y zonas por profundidad.</li>
                <li>Yacht: cubierta principal, cubierta alta, proa VIP y cabina Ultra.</li>
                <li>Club: pista, mezanine, área VIP y box privado.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default TicketReserve;
