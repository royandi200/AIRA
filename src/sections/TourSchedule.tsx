import { useState } from 'react';
import { MapPin, Clock, Ticket, ChevronRight, Bus, Star, Calendar, Package } from 'lucide-react';
import { tourScheduleConfig, type TourDate } from '../config';
import type { ReservationEvent } from './TicketReserve';

interface TourScheduleProps {
  onOpenReservation: (event: ReservationEvent) => void;
  onOpenSuite: () => void;
  onOpenCabana?: () => void;
  onOpenMisReservas?: () => void;
  onOpenAddOn?: (type: 'vip' | 'transport') => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getVenueType = (venue: string): ReservationEvent['venueType'] => {
  const v = venue.toLowerCase();
  if (v.includes('yacht') || v.includes('yate') || v.includes('embalse')) return 'yacht';
  if (v.includes('suite'))                                                  return 'club';
  if (v.includes('vip'))                                                   return 'club';
  return 'festival';
};

const getAccessType = (tour: TourDate): 'day1'|'day2'|'day3'|'package'|undefined => {
  const v = tour.venue.toLowerCase();
  if (tour.category === 'premium') return 'package';
  // Daily tickets — detect by day number in venue name
  if (v.includes('día 1') || v.includes('dia 1')) return 'day1';
  if (v.includes('día 2') || v.includes('dia 2')) return 'day2';
  if (v.includes('día 3') || v.includes('dia 3')) return 'day3';
  return undefined;
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  '3 DÍAS':     <Calendar className="w-4 h-4"/>,
  'VIP':        <Star className="w-4 h-4"/>,
  'TRANSPORTE': <Bus className="w-4 h-4"/>,
  'SUITE':      <Package className="w-4 h-4"/>,
};

function getCategoryIcon(venue: string): React.ReactNode {
  const v = venue.toUpperCase();
  if (v.includes('3 D') || v.includes('PAQUETE')) return CATEGORY_ICON['3 DÍAS'];
  if (v.includes('VIP'))        return CATEGORY_ICON['VIP'];
  if (v.includes('TRANSPORT'))  return CATEGORY_ICON['TRANSPORTE'];
  if (v.includes('SUITE'))      return CATEGORY_ICON['SUITE'];
  return <Ticket className="w-4 h-4"/>;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TourDate['status'] }) {
  const map = {
    'on-sale':     { text: tourScheduleConfig.statusLabels.onSale,     cls: 'bg-aira-lime/20 text-aira-lime border border-aira-lime/30' },
    'sold-out':    { text: tourScheduleConfig.statusLabels.soldOut,     cls: 'bg-red-500/15 text-red-400 border border-red-500/20' },
    'coming-soon': { text: tourScheduleConfig.statusLabels.comingSoon,  cls: 'bg-white/8 text-white/50 border border-white/10' },
  };
  const { text, cls } = map[status] || { text: status, cls: '' };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 ${cls}`}>
      {text}
    </span>
  );
}

// ─── Premium Card (grande, destacada) ────────────────────────────────────────
function PremiumCard({
  tour, onClick, onHover,
}: {
  tour: TourDate;
  onClick: () => void;
  onHover?: (img: string) => void;
}) {
  const [hov, setHov] = useState(false);
  const clickable = tour.status === 'on-sale';

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={e => { if (clickable && (e.key === 'Enter' || e.key === ' ')) onClick(); }}
      onMouseEnter={() => { setHov(true); onHover?.(tour.image); }}
      onMouseLeave={() => setHov(false)}
      className={`relative rounded-2xl border overflow-hidden transition-all duration-300 ${
        clickable ? 'cursor-pointer' : 'cursor-default'
      } ${
        hov && clickable
          ? 'border-aira-lime/60 shadow-[0_0_40px_rgba(225,254,82,0.12)]'
          : 'border-white/10'
      }`}
      style={{
        background: hov && clickable
          ? 'linear-gradient(135deg,rgba(225,254,82,0.06),rgba(0,79,255,0.08))'
          : 'rgba(255,255,255,0.03)',
      }}>

      {/* Background image */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <img src={tour.image} alt={tour.venue}
          className="w-full h-full object-cover opacity-10 transition-opacity duration-500"
          style={{ opacity: hov && clickable ? 0.18 : 0.08 }}/>
        <div className="absolute inset-0 bg-gradient-to-r from-[#08101f] via-[#08101f]/90 to-transparent"/>
      </div>

      {/* Content */}
      <div className="relative z-10 px-5 py-4 md:px-6 md:py-5">
        {/* Mobile: stack vertical | Desktop: row */}
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
            hov && clickable ? 'bg-aira-lime/20 text-aira-lime' : 'bg-white/8 text-white/50'
          }`}>
            {getCategoryIcon(tour.venue)}
          </div>

          {/* Info block */}
          <div className="flex-1 min-w-0">
            {/* Name + badge */}
            <div className="flex items-start gap-2 mb-1 flex-wrap">
              <h3 className="font-display text-base md:text-lg text-white leading-snug">{tour.venue}</h3>
              <StatusBadge status={tour.status}/>
            </div>
            {tour.description && (
              <p className="text-white/45 text-xs leading-relaxed mb-2">{tour.description}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono-custom text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3"/>{tour.city}
              </span>
              <span className="font-mono-custom text-[10px] text-white/30 flex items-center gap-1">
                <Clock className="w-3 h-3"/>{tour.time}
              </span>
            </div>
          </div>
        </div>

        {/* Price + CTA — always below on mobile, inline on desktop */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06] md:border-0 md:mt-0 md:pt-0 md:absolute md:right-6 md:top-1/2 md:-translate-y-1/2 md:text-right md:flex-col md:items-end md:gap-2">
          {tour.price && (
            <p className={`font-display text-xl md:text-xl leading-none transition-colors duration-300 ${
              hov && clickable ? 'text-aira-lime' : 'text-white/80'
            }`}>{tour.price}</p>
          )}
          {tour.status === 'on-sale' ? (
            <div className={`flex items-center gap-1.5 font-mono-custom text-xs transition-all duration-300 ${
              hov ? 'text-aira-lime' : 'text-white/40'
            }`}>
              {tourScheduleConfig.buyButtonText}
              <ChevronRight className="w-3.5 h-3.5"/>
            </div>
          ) : tour.status === 'coming-soon' ? (
            <span className="font-mono-custom text-[10px] text-white/30 uppercase tracking-wider">Próximamente</span>
          ) : (
            <span className="font-mono-custom text-[10px] text-red-400/70 uppercase tracking-wider">Agotado</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Daily Card (delgada, menos prominente) ────────────────────────────────
function DailyCard({
  tour, dayIndex, onClick, onHover,
}: {
  tour: TourDate;
  dayIndex: number;
  onClick: () => void;
  onHover?: (img: string) => void;
}) {
  const [hov, setHov] = useState(false);
  const clickable = tour.status === 'on-sale';
  const dayLabel = ['DÍA 1', 'DÍA 2', 'DÍA 3'][dayIndex] || `DÍA ${dayIndex + 1}`;
  const dateShort = tour.date.split('.').slice(1).join('/');

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={e => { if (clickable && (e.key === 'Enter' || e.key === ' ')) onClick(); }}
      onMouseEnter={() => { setHov(true); onHover?.(tour.image); }}
      onMouseLeave={() => setHov(false)}
      className={`relative flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5 rounded-xl border transition-all duration-200 ${
        clickable ? 'cursor-pointer' : 'cursor-default'
      } ${
        hov && clickable ? 'border-white/20 bg-white/[0.05]' : 'border-white/[0.07] bg-white/[0.02]'
      }`}>

      {/* Left accent bar */}
      <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-all duration-300 ${
        hov && clickable ? 'bg-white/40' : 'bg-white/15'
      }`}/>

      {/* Day label */}
      <div className="shrink-0 w-12 md:w-16 text-center">
        <p className={`font-mono-custom text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-colors duration-200 ${
          hov && clickable ? 'text-white/70' : 'text-white/30'
        }`}>{dayLabel}</p>
        <p className="font-mono-custom text-[10px] text-white/20 mt-0.5">{dateShort}</p>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-white/10 shrink-0"/>

      {/* Venue + time */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug transition-colors duration-200 ${
          hov && clickable ? 'text-white/80' : 'text-white/45'
        }`}>{tour.venue.replace(/DÍA \d+ — /, '')}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock className="w-3 h-3 text-white/20"/>
          <span className="font-mono-custom text-[10px] text-white/20">{tour.time}</span>
        </div>
      </div>

      {/* Status + Price + Arrow — right side */}
      <div className="shrink-0 flex flex-col items-end gap-1.5 md:flex-row md:items-center md:gap-3">
        <StatusBadge status={tour.status}/>
        {tour.price && (
          <span className={`font-display text-sm md:text-base transition-colors duration-200 ${
            hov && clickable ? 'text-white/70' : 'text-white/40'
          }`}>{tour.price}</span>
        )}
        {clickable && (
          <ChevronRight className={`hidden md:block w-4 h-4 transition-all duration-200 ${
            hov ? 'text-white/50 translate-x-0' : 'text-white/15 -translate-x-1'
          }`}/>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const TourSchedule = ({ onOpenReservation, onOpenSuite, onOpenCabana, onOpenMisReservas, onOpenAddOn }: TourScheduleProps) => {
  if (tourScheduleConfig.tourDates.length === 0 && !tourScheduleConfig.sectionTitle) return null;

  const [activeImage, setActiveImage] = useState<string | null>(null);
  const allDates = tourScheduleConfig.tourDates;
  const premiumDates = allDates.filter(t => t.category === 'premium');
  const dailyDates   = allDates.filter(t => t.category === 'daily');
  const defaultImage = premiumDates[0]?.image || allDates[0]?.image || '/main-stage.jpg';

  const buildEvent = (tour: TourDate): ReservationEvent => ({
    id:               String(tour.id),
    city:             tour.city,
    venue:            tour.venue,
    date:             tour.date,
    time:             tour.time,
    image:            tour.image,
    venueType:        getVenueType(tour.venue),
    initialAccessType: getAccessType(tour),
  });

  const handleClick = (tour: TourDate) => {
    const v = tour.venue.toLowerCase();
    if (v.includes('caba'))                             { if (onOpenCabana) { onOpenCabana(); } else { onOpenSuite?.(); } return; }
    if (v.includes('suite'))                            { onOpenSuite?.(); return; }
    if (v.includes('vip') && !v.includes('paquete'))   { onOpenAddOn?.('vip'); return; }
    if (v.includes('transporte') || v.includes('bus')) { onOpenAddOn?.('transport'); return; }
    onOpenReservation(buildEvent(tour));
  };

  return (
    <section id="booking" className="relative py-16 md:py-32 bg-aira-darkBlue">

      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage:'radial-gradient(circle,#e1fe52 1px,transparent 1px)', backgroundSize:'32px 32px' }}/>

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6">

        {/* Header */}
        <div className="mb-10 md:mb-14">
          <p className="font-mono-custom text-[10px] uppercase tracking-[0.35em] text-aira-lime/60 mb-3">
            {tourScheduleConfig.sectionLabel}
          </p>
          <h2 className="font-display text-4xl md:text-6xl text-white leading-none mb-4">
            {tourScheduleConfig.sectionTitle}
          </h2>
          <p className="font-mono-custom text-sm text-white/40 max-w-md">
            {'Guatapé · Agosto 2025'}
          </p>
        </div>

        {/* ── Mis Reservas banner ── */}
        {onOpenMisReservas && (
          <div className="mb-10">
            <button onClick={onOpenMisReservas}
              className="w-full group relative flex items-center justify-between gap-4 px-6 py-4 rounded-2xl border border-aira-lime/30 bg-aira-lime/5 hover:bg-aira-lime/10 hover:border-aira-lime/60 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background:'radial-gradient(ellipse at left center,rgba(225,254,82,0.08),transparent 60%)' }}/>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-aira-lime/15 border border-aira-lime/30 flex items-center justify-center shrink-0 group-hover:bg-aira-lime/25 transition-colors">
                  <span className="text-lg">🎫</span>
                </div>
                <div className="text-left">
                  <p className="font-display text-base text-aira-lime leading-none mb-0.5">¿Ya tienes una reserva?</p>
                  <p className="font-mono-custom text-[11px] text-white/50 uppercase tracking-[0.2em]">
                    Ver estado · Pagar cuotas · Descargar QR
                  </p>
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-2 shrink-0">
                <span className="font-mono-custom text-xs text-aira-lime/70 uppercase tracking-widest hidden sm:block">Mis reservas</span>
                <div className="w-8 h-8 rounded-full border border-aira-lime/30 flex items-center justify-center group-hover:border-aira-lime/60 group-hover:bg-aira-lime/10 transition-all">
                  <ChevronRight className="w-4 h-4 text-aira-lime"/>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ── Grid: imagen izquierda + listas derecha ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

          {/* Imagen preview — solo desktop */}
          <div className="hidden lg:block lg:col-span-2 sticky top-8">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden">
              <img
                src={activeImage || defaultImage}
                alt="preview"
                className="w-full h-full object-cover transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-aira-darkBlue/80 via-transparent to-transparent"/>
              {/* Decorative corner */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-aira-lime/40 rounded-tl-lg"/>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-aira-lime/40 rounded-br-lg"/>
            </div>
          </div>

          {/* Lists — right col */}
          <div className="lg:col-span-3 space-y-10">

        {/* ── PREMIUM SECTION ── */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-white/10"/>
            <p className="font-mono-custom text-[9px] uppercase tracking-[0.4em] text-white/30">Experiencias destacadas</p>
            <div className="h-px flex-1 bg-white/10"/>
          </div>

          <div className="space-y-3">
            {premiumDates.map(tour => (
              <PremiumCard
                key={tour.id}
                tour={tour}
                onClick={() => handleClick(tour)}
                onHover={img => setActiveImage(img)}
              />
            ))}
          </div>
        </div>

        {/* ── DAILY SECTION ── */}
        {dailyDates.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-white/6"/>
              <p className="font-mono-custom text-[9px] uppercase tracking-[0.4em] text-white/20">Pases por día</p>
              <div className="h-px flex-1 bg-white/6"/>
            </div>

            <div className="space-y-2">
              {dailyDates.map((tour, i) => (
                <DailyCard
                  key={tour.id}
                  tour={tour}
                  dayIndex={i}
                  onClick={() => handleClick(tour)}
                  onHover={img => setActiveImage(img)}
                />
              ))}
            </div>
          </div>
        )}

          </div>{/* end right col */}
        </div>{/* end grid */}

        {/* ── Bottom CTA ── */}
        <div className="mt-16 text-center">
          <p className="font-mono-custom text-sm text-white/30 mb-5">{tourScheduleConfig.bottomNote}</p>
          <button
            className="px-8 py-4 bg-aira-lime text-aira-darkBlue font-display text-sm uppercase tracking-[0.2em] rounded-full hover:bg-white active:scale-[0.97] transition-all">
            {tourScheduleConfig.bottomCtaText}
          </button>
        </div>
      </div>
    </section>
  );
};

export default TourSchedule;
