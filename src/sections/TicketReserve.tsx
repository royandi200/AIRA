import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { X, Users, Zap, Crown, Star, ChevronRight, Minus, Plus, ShoppingCart } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// ─── Types ───────────────────────────────────────────────────────────────────
interface TicketType {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  perks: string[];
  color: string;
  accentColor: string;
  icon: React.ReactNode;
  available: number;
  zoneId: string;
}

interface Zone {
  id: string;
  label: string;
  x: number; // % from left
  y: number; // % from top
  w: number; // % width
  h: number; // % height
  ticketId: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const TICKETS: TicketType[] = [
  {
    id: 'general',
    name: 'General',
    price: 120000,
    currency: 'COP',
    description: 'Acceso completo al festival en área general.',
    perks: ['Acceso área general', 'Escenario principal', 'Zona de food trucks'],
    color: 'from-white/5 to-white/10',
    accentColor: '#ffffff',
    icon: <Users className="w-5 h-5" />,
    available: 800,
    zoneId: 'general',
  },
  {
    id: 'electric',
    name: 'Electric',
    price: 220000,
    currency: 'COP',
    description: 'Zona intermedia con mejor visibilidad y acceso prioritario.',
    perks: ['Zona Electric exclusiva', 'Acceso prioritario', 'Lockers gratis', 'Zona de descanso'],
    color: 'from-aira-blue/20 to-aira-blue/10',
    accentColor: '#004fff',
    icon: <Zap className="w-5 h-5" />,
    available: 300,
    zoneId: 'electric',
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 420000,
    currency: 'COP',
    description: 'Experiencia premium en primera línea con vista privilegiada.',
    perks: ['Zona VIP exclusiva', 'Open bar premium', 'Plataforma elevada', 'Meet & greet artistas', 'Merchandising oficial'],
    color: 'from-aira-lime/10 to-aira-lime/5',
    accentColor: '#e1fe52',
    icon: <Crown className="w-5 h-5" />,
    available: 80,
    zoneId: 'vip',
  },
  {
    id: 'ultrastar',
    name: 'Ultra Star',
    price: 980000,
    currency: 'COP',
    description: 'El máximo nivel. Plataforma privada con servicio personalizado.',
    perks: ['Palco privado', 'Butler personal', 'Cena gourmet incluida', 'Backstage access', 'Transfer privado', 'Hotel partner'],
    color: 'from-yellow-400/10 to-orange-400/5',
    accentColor: '#fbbf24',
    icon: <Star className="w-5 h-5" />,
    available: 12,
    zoneId: 'ultrastar',
  },
];

const ZONES: Zone[] = [
  { id: 'ultrastar', label: 'ULTRA STAR', x: 35, y: 10, w: 30, h: 14, ticketId: 'ultrastar' },
  { id: 'vip',       label: 'VIP',        x: 22, y: 27, w: 56, h: 14, ticketId: 'vip' },
  { id: 'electric',  label: 'ELECTRIC',   x: 10, y: 44, w: 80, h: 16, ticketId: 'electric' },
  { id: 'general',   label: 'GENERAL',    x: 5,  y: 65, w: 90, h: 28, ticketId: 'general' },
];

const ZONE_COLORS: Record<string, string> = {
  ultrastar: 'rgba(251,191,36,0.18)',
  vip:       'rgba(225,254,82,0.15)',
  electric:  'rgba(0,79,255,0.18)',
  general:   'rgba(255,255,255,0.07)',
};

const ZONE_BORDER: Record<string, string> = {
  ultrastar: 'rgba(251,191,36,0.7)',
  vip:       'rgba(225,254,82,0.6)',
  electric:  'rgba(0,79,255,0.7)',
  general:   'rgba(255,255,255,0.2)',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// ─── Component ───────────────────────────────────────────────────────────────
const TicketReserve = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Scroll reveal
  useEffect(() => {
    if (!sectionRef.current) return;
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top 75%',
      onEnter: () => setIsVisible(true),
    });
    return () => st.kill();
  }, []);

  useEffect(() => {
    if (!isVisible || !cardsRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardsRef.current!.querySelectorAll('.ticket-card'),
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.12, ease: 'power3.out' }
      );
      gsap.fromTo(
        mapRef.current,
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.2 }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, [isVisible]);

  // Pulse selected zone
  useEffect(() => {
    if (!selectedTicket) return;
    const el = document.getElementById(`zone-${selectedTicket.zoneId}`);
    if (!el) return;
    gsap.fromTo(el, { scale: 1 }, { scale: 1.03, duration: 0.3, yoyo: true, repeat: 1, ease: 'power2.inOut' });
  }, [selectedTicket]);

  const handleSelectTicket = (ticket: TicketType) => {
    setSelectedTicket(ticket);
    setQty(1);
    setShowCheckout(false);
    // Scroll to map on mobile
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleZoneClick = (zone: Zone) => {
    const ticket = TICKETS.find(t => t.id === zone.ticketId);
    if (ticket) handleSelectTicket(ticket);
  };

  return (
    <section
      id="tickets"
      ref={sectionRef}
      className="relative w-full min-h-screen bg-void-black py-24 overflow-hidden"
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#e1fe52 1px, transparent 1px), linear-gradient(90deg, #e1fe52 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Glow accent */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-aira-blue/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">

        {/* Header */}
        <div className="mb-16">
          <p className="font-mono-custom text-xs text-aira-lime/60 uppercase tracking-[0.3em] mb-3">
            — RESERVA TU LUGAR
          </p>
          <h2 className="font-display text-5xl md:text-7xl text-white leading-none">
            ELIGE TU<br />
            <span className="text-aira-lime">EXPERIENCIA</span>
          </h2>
          <p className="font-mono-custom text-sm text-white/40 mt-4 max-w-md">
            Selecciona tu zona en el plano del festival o elige directamente tu tipo de acceso.
          </p>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 items-start">

          {/* LEFT — Ticket cards */}
          <div ref={cardsRef} className="space-y-3">
            {TICKETS.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              return (
                <div
                  key={ticket.id}
                  className={`ticket-card group relative rounded-2xl border cursor-pointer transition-all duration-300 overflow-hidden
                    ${isSelected
                      ? 'border-aira-lime/60 bg-gradient-to-r from-aira-lime/5 to-transparent'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                  onClick={() => handleSelectTicket(ticket)}
                >
                  {/* Selected indicator bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl transition-all duration-300"
                    style={{ background: isSelected ? ticket.accentColor : 'transparent' }}
                  />

                  <div className="flex items-center gap-4 p-5 pl-6">
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${ticket.accentColor}18`, color: ticket.accentColor }}
                    >
                      {ticket.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-display text-lg text-white">{ticket.name}</span>
                        {ticket.available <= 20 && (
                          <span className="text-[10px] font-mono-custom uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                            Solo {ticket.available} left
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 font-mono-custom truncate">{ticket.description}</p>
                    </div>

                    {/* Price + chevron */}
                    <div className="shrink-0 text-right">
                      <p className="font-display text-lg" style={{ color: ticket.accentColor }}>
                        {fmt(ticket.price)}
                      </p>
                      <p className="text-[10px] font-mono-custom text-white/30">por persona</p>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-all duration-300 ${
                        isSelected ? 'text-aira-lime rotate-90' : 'text-white/20 group-hover:text-white/50'
                      }`}
                    />
                  </div>

                  {/* Expanded perks */}
                  <div
                    className="overflow-hidden transition-all duration-500"
                    style={{ maxHeight: isSelected ? '300px' : '0px' }}
                  >
                    <div className="px-6 pb-5 pt-1 border-t border-white/5">
                      <div className="flex flex-wrap gap-2 mb-5">
                        {ticket.perks.map((perk) => (
                          <span
                            key={perk}
                            className="text-xs font-mono-custom px-3 py-1 rounded-full border"
                            style={{
                              borderColor: `${ticket.accentColor}30`,
                              color: ticket.accentColor,
                              background: `${ticket.accentColor}0a`,
                            }}
                          >
                            {perk}
                          </span>
                        ))}
                      </div>

                      {/* Qty + CTA */}
                      <div className="flex items-center gap-4">
                        {/* Quantity */}
                        <div className="flex items-center gap-1 rounded-full border border-white/10 p-1">
                          <button
                            className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                            onClick={(e) => { e.stopPropagation(); setQty(q => Math.max(1, q - 1)); }}
                          >
                            <Minus className="w-3 h-3 text-white/60" />
                          </button>
                          <span className="w-8 text-center font-mono-custom text-sm text-white">{qty}</span>
                          <button
                            className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                            onClick={(e) => { e.stopPropagation(); setQty(q => Math.min(ticket.available, q + 1)); }}
                          >
                            <Plus className="w-3 h-3 text-white/60" />
                          </button>
                        </div>

                        {/* Total */}
                        <span className="font-mono-custom text-sm text-white/40">
                          Total: <span className="text-white">{fmt(ticket.price * qty)}</span>
                        </span>

                        {/* Reserve button */}
                        <button
                          className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-display uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95"
                          style={{
                            background: ticket.accentColor,
                            color: ticket.id === 'general' || ticket.id === 'ultrastar' ? '#0a0a0a' : '#0a0a0a',
                          }}
                          onClick={(e) => { e.stopPropagation(); setShowCheckout(true); }}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Reservar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT — Venue map */}
          <div ref={mapRef} className="lg:sticky lg:top-28">
            <p className="font-mono-custom text-xs text-white/40 uppercase tracking-wider mb-4">
              PLANO DEL FESTIVAL — GUATAPÉ 2026
            </p>

            {/* Map container */}
            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-[#0a0e1a]">

              {/* Stage illustration */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[28%] flex flex-col items-center" style={{ top: '2%' }}>
                <div className="w-full h-[5%] min-h-[18px] rounded-b-xl bg-aira-lime/90 flex items-center justify-center">
                  <span className="font-mono-custom text-[9px] text-void-black uppercase tracking-widest font-bold">ESCENARIO</span>
                </div>
              </div>

              {/* Zones */}
              {ZONES.map((zone) => {
                const isHovered = hoveredZone === zone.id;
                const isActive = selectedTicket?.zoneId === zone.id;
                return (
                  <div
                    key={zone.id}
                    id={`zone-${zone.id}`}
                    className="absolute rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-center"
                    style={{
                      left: `${zone.x}%`,
                      top: `${zone.y}%`,
                      width: `${zone.w}%`,
                      height: `${zone.h}%`,
                      background: isActive || isHovered
                        ? ZONE_COLORS[zone.id].replace(')', ', 2.5)').replace('rgba', 'rgba')
                        : ZONE_COLORS[zone.id],
                      border: `1.5px solid ${isActive || isHovered ? ZONE_BORDER[zone.id] : ZONE_BORDER[zone.id].replace('0.7', '0.25').replace('0.6', '0.22').replace('0.2', '0.08')}`,
                      transform: isActive ? 'scale(1.01)' : 'scale(1)',
                    }}
                    onClick={() => handleZoneClick(zone)}
                    onMouseEnter={() => setHoveredZone(zone.id)}
                    onMouseLeave={() => setHoveredZone(null)}
                  >
                    <span
                      className="font-mono-custom text-[10px] uppercase tracking-[0.2em] font-bold select-none"
                      style={{
                        color: isActive || isHovered
                          ? ZONE_BORDER[zone.id]
                          : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {zone.label}
                    </span>
                  </div>
                );
              })}

              {/* Compass */}
              <div className="absolute bottom-3 right-3 opacity-30">
                <div className="w-6 h-6 border border-white/30 rounded-full flex items-center justify-center">
                  <span className="font-mono-custom text-[8px] text-white">N</span>
                </div>
              </div>

              {/* Legend */}
              <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
                {TICKETS.map(t => (
                  <div key={t.id} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: t.accentColor, opacity: 0.8 }} />
                    <span className="font-mono-custom text-[9px] uppercase text-white/40">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected ticket summary below map */}
            {selectedTicket && (
              <div
                className="mt-4 p-4 rounded-xl border backdrop-blur-sm transition-all duration-300"
                style={{
                  borderColor: `${selectedTicket.accentColor}30`,
                  background: `${selectedTicket.accentColor}08`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono-custom text-xs text-white/40 uppercase tracking-wider">Zona seleccionada</p>
                    <p className="font-display text-lg mt-0.5" style={{ color: selectedTicket.accentColor }}>
                      {selectedTicket.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl text-white">{fmt(selectedTicket.price * qty)}</p>
                    <p className="font-mono-custom text-xs text-white/30">{qty} entrada{qty > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Checkout modal ──────────────────────────────────────────────────── */}
      {showCheckout && selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={() => setShowCheckout(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border p-8 bg-[#0d0d0d]"
            style={{ borderColor: `${selectedTicket.accentColor}30` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              onClick={() => setShowCheckout(false)}
            >
              <X className="w-4 h-4 text-white/60" />
            </button>

            {/* Header */}
            <p className="font-mono-custom text-xs text-white/40 uppercase tracking-wider mb-1">Resumen de reserva</p>
            <h3 className="font-display text-3xl text-white mb-6">
              Zona <span style={{ color: selectedTicket.accentColor }}>{selectedTicket.name}</span>
            </h3>

            {/* Details */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="font-mono-custom text-sm text-white/50">Evento</span>
                <span className="font-mono-custom text-sm text-white">AIRA Festival — Guatapé 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono-custom text-sm text-white/50">Fecha</span>
                <span className="font-mono-custom text-sm text-white">Agosto 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono-custom text-sm text-white/50">Tipo</span>
                <span className="font-mono-custom text-sm" style={{ color: selectedTicket.accentColor }}>
                  {selectedTicket.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono-custom text-sm text-white/50">Cantidad</span>
                <span className="font-mono-custom text-sm text-white">{qty} entrada{qty > 1 ? 's' : ''}</span>
              </div>
              <div className="h-px bg-white/5 my-2" />
              <div className="flex justify-between">
                <span className="font-mono-custom text-sm text-white/50">Subtotal</span>
                <span className="font-mono-custom text-sm text-white">{fmt(selectedTicket.price * qty)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono-custom text-sm text-white/50">Cargo por servicio</span>
                <span className="font-mono-custom text-sm text-white">{fmt(selectedTicket.price * qty * 0.05)}</span>
              </div>
              <div className="h-px bg-white/5 my-2" />
              <div className="flex justify-between">
                <span className="font-display text-lg text-white">Total</span>
                <span className="font-display text-xl" style={{ color: selectedTicket.accentColor }}>
                  {fmt(selectedTicket.price * qty * 1.05)}
                </span>
              </div>
            </div>

            {/* Perks reminder */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {selectedTicket.perks.slice(0, 3).map(p => (
                <span
                  key={p}
                  className="text-[10px] font-mono-custom px-2 py-0.5 rounded-full"
                  style={{ background: `${selectedTicket.accentColor}15`, color: selectedTicket.accentColor }}
                >
                  {p}
                </span>
              ))}
            </div>

            {/* CTA */}
            <button
              className="w-full py-4 rounded-2xl font-display text-sm uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: selectedTicket.accentColor, color: '#0a0a0a' }}
            >
              Confirmar Reserva
            </button>
            <p className="font-mono-custom text-[10px] text-white/20 text-center mt-3">
              Recibirás confirmación por email con tu QR de acceso
            </p>
          </div>
        </div>
      )}

      {/* Section bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-aira-lime/20 to-transparent" />
    </section>
  );
};

export default TicketReserve;
