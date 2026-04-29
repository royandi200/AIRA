import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Users, Zap, Crown, Star, Minus, Plus, Check, Bus, Ticket, Sparkles, Loader2, CreditCard, CalendarClock, AlertCircle, MessageCircle, RefreshCw, ShieldCheck } from 'lucide-react';

export interface ReservationEvent {
  id: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  image?: string;
  venueType: 'festival' | 'yacht' | 'club';
  initialAccessType?: 'day1' | 'day2' | 'day3' | 'package';
}

interface TicketReserveProps {
  isOpen: boolean;
  selectedEvent: ReservationEvent | null;
  onClose: () => void;
}

type AccessType = 'day1' | 'day2' | 'day3' | 'package';
type PaymentMode = 'full' | 'abono';

const ABONO_PLANS = [
  { id: 'a50', label: '2 cuotas', pct: 0.50, desc: '50% ahora · 50% antes del evento', badge: 'Popular' },
  { id: 'a33', label: '3 cuotas', pct: 0.33, desc: '33% ahora · 33% · 33% antes del evento', badge: null },
];

const PASS_VIP_PRICES: Record<AccessType, number> = {
  day1: 50_000,
  day2: 100_000,
  day3: 40_000,
  package: 450_000,
};

const DAYS = [
  { id: 'day1' as AccessType, label: 'DÍA 1', title: 'After Fiesta de Yates',        price: 80_000,  accentColor: '#004fff', icon: <Zap   className="w-5 h-5" /> },
  { id: 'day2' as AccessType, label: 'DÍA 2', title: 'Fiesta Majestic & Stage Joinn', price: 150_000, accentColor: '#e1fe52', icon: <Crown className="w-5 h-5" /> },
  { id: 'day3' as AccessType, label: 'DÍA 3', title: 'Open Deck',                     price: 50_000,  accentColor: '#ffffff', icon: <Star  className="w-5 h-5" /> },
];

// Fechas reales de cada etapa — ajustar según calendario del evento
const STAGE_DATES: Record<string, { start: Date; end: Date }> = {
  creyentes: { start: new Date('2026-04-15'), end: new Date('2026-05-05') },
  referidos:  { start: new Date('2026-04-15'), end: new Date('2026-05-05') },
  primera:    { start: new Date('2026-05-05'), end: new Date('2026-06-05') },
  segunda:    { start: new Date('2026-06-05'), end: new Date('2026-07-05') },
  tercera:    { start: new Date('2026-07-05'), end: new Date('2026-08-15') },
};

const now = new Date();

function isStagePast(id: string): boolean {
  const d = STAGE_DATES[id];
  if (!d) return false;
  return now > d.end;
}

const STAGES = [
  { id: 'creyentes', label: 'Creyentes', price: 590_000,   slots: 35, dates: '15 ABR – 5 MAY', locked: true  },
  { id: 'referidos', label: 'Referidos', price: 690_000,   slots: 35, dates: '15 ABR – 5 MAY', locked: false },
  { id: 'primera',   label: '1ª Etapa',  price: 790_000,   slots: 28, dates: '5 MAY – 5 JUN',  locked: false },
  { id: 'segunda',   label: '2ª Etapa',  price: 890_000,   slots: 28, dates: '5 JUN – 5 JUL',  locked: false },
  { id: 'tercera',   label: '3ª Etapa',  price: 1_000_000, slots: 7,  dates: '5 JUL – 15 AGO', locked: false, urgent: true },
];

// Solo mostrar etapas vigentes o próximas (no las pasadas)
const VISIBLE_STAGES = STAGES.filter(s => !isStagePast(s.id));

const TRANSPORT_PRICE = 180_000;

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function useLockBodyScroll(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.overflow  = 'hidden';
    body.style.position  = 'fixed';
    body.style.top       = `-${scrollY}px`;
    body.style.width     = '100%';
    return () => {
      body.style.overflow  = '';
      body.style.position  = '';
      body.style.top       = '';
      body.style.width     = '';
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
    };
  }, [isOpen]);
}

function PassVipBanner({ addPassVip, setAddPassVip, qty, passVipPrice, compact = false }: {
  addPassVip: boolean; setAddPassVip: (v: boolean) => void; qty: number; passVipPrice: number; compact?: boolean;
}) {
  return (
    <div className={`rounded-2xl border transition-all duration-200 ${
      addPassVip ? 'border-yellow-400/50 bg-yellow-400/10' : 'border-yellow-400/20 bg-yellow-400/5 hover:border-yellow-400/35'
    } ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`rounded-xl flex items-center justify-center shrink-0 ${compact ? 'w-8 h-8' : 'w-10 h-10'} bg-yellow-400/15`}>
            <Sparkles className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-yellow-300`} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className={`font-mono-custom uppercase tracking-[0.22em] text-yellow-300 ${compact ? 'text-[8px]' : 'text-[9px]'}`}>Add-on · Pass VIP</p>
              <span className="px-2 py-0.5 rounded-full text-[8px] font-mono-custom uppercase tracking-[0.15em] bg-yellow-400/15 text-yellow-300 border border-yellow-400/25">
                {fmt(passVipPrice)}{qty > 1 ? ` × ${qty}` : ''}
              </span>
            </div>
            <p className={`font-display text-white leading-snug ${compact ? 'text-sm' : 'text-base'} mb-1`}>Acceso VIP exclusivo</p>
            {!compact && <p className="text-xs text-white/45">Upgrade premium para tu experiencia en el evento</p>}
          </div>
        </div>
        <label className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 mt-0.5">
          <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${addPassVip ? 'bg-yellow-400' : 'bg-white/15'}`} onClick={() => setAddPassVip(!addPassVip)}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${addPassVip ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </div>
          <span className="font-mono-custom text-[8px] uppercase tracking-[0.18em] text-white/40">{addPassVip ? 'Activo' : 'Agregar'}</span>
        </label>
      </div>
    </div>
  );
}

function AbonoSelector({ paymentMode, setPaymentMode, abonoPlanId, setAbonoPlanId, total }: {
  paymentMode: PaymentMode;
  setPaymentMode: (m: PaymentMode) => void;
  abonoPlanId: string;
  setAbonoPlanId: (id: string) => void;
  total: number;
}) {
  const selectedPlan = ABONO_PLANS.find(p => p.id === abonoPlanId) ?? ABONO_PLANS[0];
  const primerPago = Math.ceil(total * selectedPlan.pct);

  return (
    <div className="space-y-3">
      <p className="font-mono-custom text-[9px] uppercase tracking-[0.28em] text-white/35 mb-1">Forma de pago</p>

      <button
        onClick={() => setPaymentMode('full')}
        className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 flex items-center gap-4 ${
          paymentMode === 'full' ? 'border-aira-lime/50 bg-aira-lime/8' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${paymentMode === 'full' ? 'bg-aira-lime/20' : 'bg-white/5'}`}>
          <CreditCard className={`w-5 h-5 ${paymentMode === 'full' ? 'text-aira-lime' : 'text-white/40'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display text-base text-white">Pago completo</p>
            {paymentMode === 'full' && <Check className="w-4 h-4 text-aira-lime" />}
          </div>
          <p className="text-xs text-white/45">Paga el total ahora y asegura tu cupo</p>
        </div>
        <p className="font-display text-lg text-aira-lime shrink-0">{fmt(total)}</p>
      </button>

      <button
        onClick={() => setPaymentMode('abono')}
        className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
          paymentMode === 'abono' ? 'border-aira-lime/50 bg-aira-lime/8' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${paymentMode === 'abono' ? 'bg-aira-lime/20' : 'bg-white/5'}`}>
            <CalendarClock className={`w-5 h-5 ${paymentMode === 'abono' ? 'text-aira-lime' : 'text-white/40'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display text-base text-white">Pagar en cuotas</p>
              <span className="px-2 py-0.5 rounded-full text-[8px] font-mono-custom uppercase tracking-[0.15em] bg-aira-lime/15 text-aira-lime border border-aira-lime/25">Nuevo</span>
              {paymentMode === 'abono' && <Check className="w-4 h-4 text-aira-lime" />}
            </div>
            <p className="text-xs text-white/45">Abona un porcentaje ahora y el resto antes del evento</p>
          </div>
          <p className="font-display text-lg text-aira-lime shrink-0">Desde {fmt(Math.ceil(total * 0.25))}</p>
        </div>

        {paymentMode === 'abono' && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2" onClick={e => e.stopPropagation()}>
            {ABONO_PLANS.map(plan => (
              <button
                key={plan.id}
                onClick={() => setAbonoPlanId(plan.id)}
                className={`w-full text-left rounded-xl border px-4 py-3 transition-all duration-150 flex items-center justify-between gap-3 ${
                  abonoPlanId === plan.id ? 'border-aira-lime/40 bg-aira-lime/10' : 'border-white/8 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {abonoPlanId === plan.id
                    ? <div className="w-5 h-5 rounded-full bg-aira-lime flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-aira-darkBlue" /></div>
                    : <div className="w-5 h-5 rounded-full border border-white/20 shrink-0" />
                  }
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm text-white">{plan.label}</span>
                      {plan.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[7px] font-mono-custom uppercase tracking-[0.15em] bg-aira-lime/15 text-aira-lime border border-aira-lime/20">{plan.badge}</span>
                      )}
                    </div>
                    <p className="font-mono-custom text-[9px] text-white/40 mt-0.5">{plan.desc}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-base text-aira-lime">{fmt(Math.ceil(total * plan.pct))}</p>
                  <p className="font-mono-custom text-[9px] text-white/35">primer pago</p>
                </div>
              </button>
            ))}
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2.5 mt-1">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="font-mono-custom text-[9px] text-amber-300/70 leading-relaxed">
                El cupo queda reservado al realizar el primer abono. Las cuotas restantes se cobran automáticamente según el plan. Si no se completa el pago total 7 días antes del evento, el cupo se libera sin reembolso del abono.
              </p>
            </div>
          </div>
        )}
      </button>

      {paymentMode === 'abono' && (
        <div className="rounded-xl border border-aira-lime/20 bg-aira-lime/5 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-aira-lime/70">Pagas hoy</p>
            <p className="font-display text-2xl text-aira-lime mt-0.5">{fmt(primerPago)}</p>
          </div>
          <div className="text-right">
            <p className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/35">Saldo pendiente</p>
            <p className="font-display text-lg text-white/60 mt-0.5">{fmt(total - primerPago)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BuyerForm({ name, email, phone, onChange }: {
  name: string; email: string; phone: string;
  onChange: (field: 'name' | 'email' | 'phone', value: string) => void;
}) {
  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-aira-lime/50 focus:bg-white/[0.06] transition-all";
  return (
    <div className="space-y-3">
      <p className="font-mono-custom text-[9px] uppercase tracking-[0.28em] text-white/35 mb-3">Datos del comprador</p>
      <div>
        <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Nombre completo *</label>
        <input type="text" value={name} onChange={e => onChange('name', e.target.value)} placeholder="Tu nombre" className={inputClass} required />
      </div>
      <div>
        <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Correo electrónico *</label>
        <input type="email" value={email} onChange={e => onChange('email', e.target.value)} placeholder="tu@email.com" className={inputClass} required />
      </div>
      <div>
        <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Celular (WhatsApp) *</label>
        <input type="tel" value={phone} onChange={e => onChange('phone', e.target.value)} placeholder="+57 300 000 0000" className={inputClass} required />
      </div>
    </div>
  );
}

// truncated intentionally?