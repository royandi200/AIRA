import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Users, Zap, Crown, Star, Minus, Plus, Check, Bus, Ticket, Sparkles, Loader2, CreditCard, CalendarClock, AlertCircle } from 'lucide-react';

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
  { id: 'a25', label: '4 cuotas', pct: 0.25, desc: '25% ahora · resto en 3 cuotas', badge: null },
];

const PASS_VIP_PRICES: Record<AccessType, number> = {
  day1: 50_000,
  day2: 100_000,
  day3: 40_000,
  package: 500_000,
};

const DAYS = [
  { id: 'day1' as AccessType, label: 'DÍA 1', title: 'After Fiesta de Yates',        price: 80_000,  accentColor: '#004fff', icon: <Zap   className="w-5 h-5" /> },
  { id: 'day2' as AccessType, label: 'DÍA 2', title: 'Fiesta Majestic & Stage Joinn', price: 150_000, accentColor: '#e1fe52', icon: <Crown className="w-5 h-5" /> },
  { id: 'day3' as AccessType, label: 'DÍA 3', title: 'Open Deck',                     price: 50_000,  accentColor: '#ffffff', icon: <Star  className="w-5 h-5" /> },
];

const STAGES = [
  { id: 'creyentes', label: 'Creyentes', price: 590_000,   slots: 35, dates: '15 ABR – 5 MAY', locked: true  },
  { id: 'referidos', label: 'Referidos', price: 690_000,   slots: 35, dates: '15 ABR – 5 MAY', locked: false },
  { id: 'primera',   label: '1ª Etapa',  price: 790_000,   slots: 28, dates: '5 MAY – 5 JUN',  locked: false },
  { id: 'segunda',   label: '2ª Etapa',  price: 890_000,   slots: 28, dates: '5 JUN – 5 JUL',  locked: false },
  { id: 'tercera',   label: '3ª Etapa',  price: 1_000_000, slots: 7,  dates: '5 JUL – 15 AGO', locked: false, urgent: true },
];

const TRANSPORT_PRICE = 150_000;

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

const TicketReserve = ({ isOpen, selectedEvent, onClose }: TicketReserveProps) => {
  const initAccess = selectedEvent?.initialAccessType ?? null;
  const initStep   = initAccess === 'package' ? 2 : initAccess ? 3 : 1;

  const [step,            setStep]           = useState(initStep);
  const [accessType,      setAccessType]     = useState<AccessType | null>(initAccess);
  const [selectedStageId, setSelectedStageId]= useState<string | null>(null);
  const [addPassVip,      setAddPassVip]     = useState(false);
  const [addTransport,    setAddTransport]   = useState(false);
  const [qty,             setQty]            = useState(1);
  const [paymentMode,     setPaymentMode]    = useState<PaymentMode>('full');
  const [abonoPlanId,     setAbonoPlanId]    = useState(ABONO_PLANS[0].id);
  const [buyerName,       setBuyerName]      = useState('');
  const [buyerEmail,      setBuyerEmail]     = useState('');
  const [buyerPhone,      setBuyerPhone]     = useState('');
  const [isSubmitting,    setIsSubmitting]   = useState(false);
  const [paymentError,    setPaymentError]   = useState<string | null>(null);

  useLockBodyScroll(isOpen);

  const isDayTicket = accessType === 'day1' || accessType === 'day2' || accessType === 'day3';

  const scrollRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop    = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      if (atTop    && e.deltaY < 0) { e.stopPropagation(); return; }
      if (atBottom && e.deltaY > 0) { e.stopPropagation(); return; }
      e.stopPropagation();
      e.preventDefault();
      el.scrollTop += e.deltaY;
    };
    el.addEventListener('wheel', handler, { passive: false });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const ia = selectedEvent?.initialAccessType ?? null;
    const is = ia === 'package' ? 2 : ia ? 3 : 1;
    setStep(is);
    setAccessType(ia);
    setSelectedStageId(null);
    setAddPassVip(false);
    setAddTransport(false);
    setQty(1);
    setPaymentMode('full');
    setAbonoPlanId(ABONO_PLANS[0].id);
    setBuyerName('');
    setBuyerEmail('');
    setBuyerPhone('');
    setPaymentError(null);
  }, [isOpen, selectedEvent?.id, selectedEvent?.initialAccessType]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const selectedStage = useMemo(() => STAGES.find(s => s.id === selectedStageId) ?? null, [selectedStageId]);
  const selectedDay   = useMemo(() => DAYS.find(d => d.id === accessType) ?? null, [accessType]);
  const passVipPrice  = accessType ? PASS_VIP_PRICES[accessType] : 500_000;

  const basePrice = useMemo(() => {
    if (accessType === 'day1') return 80_000  * qty;
    if (accessType === 'day2') return 150_000 * qty;
    if (accessType === 'day3') return 50_000  * qty;
    if (accessType === 'package' && selectedStage) return selectedStage.price * qty;
    return 0;
  }, [accessType, selectedStage, qty]);

  const serviceFee = Math.round(basePrice * 0.05);
  const passTotal  = addPassVip   ? passVipPrice    * qty : 0;
  const transTotal = (!isDayTicket && addTransport) ? TRANSPORT_PRICE * qty : 0;
  const total      = basePrice + serviceFee + passTotal + transTotal;

  const selectedPlan = ABONO_PLANS.find(p => p.id === abonoPlanId) ?? ABONO_PLANS[0];
  const effectivePaymentMode: PaymentMode = isDayTicket ? 'full' : paymentMode;
  // ✅ FIX: primerPago es lo que realmente se cobra a Bold
  const primerPago = effectivePaymentMode === 'full' ? total : Math.ceil(total * selectedPlan.pct);

  const ticketLabel = selectedDay ? `${selectedDay.label} · ${selectedDay.title}` : null;
  const stageLabel  = accessType === 'package' && selectedStage ? selectedStage.label : null;

  const handleSelectDay = (type: AccessType) => {
    setAccessType(type);
    setSelectedStageId(null);
    setStep(3);
  };

  const handleSelectPackage = () => {
    setAccessType('package');
    setSelectedStageId(null);
    setStep(2);
  };

  const handleCheckout = async () => {
    if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()) {
      setPaymentError('Por favor completa nombre, correo y celular.');
      return;
    }
    setIsSubmitting(true);
    setPaymentError(null);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: buyerName.trim(), email: buyerEmail.trim(), phone: buyerPhone.trim(),
          eventId: selectedEvent?.id, accessType, ticketLabel, stageLabel,
          qty, basePrice, addPassVip, passVipPrice,
          addTransport: isDayTicket ? false : addTransport,
          total,
          paymentMode: effectivePaymentMode,
          abonoPlan: effectivePaymentMode === 'abono' ? abonoPlanId : null,
          primerPago,
          // ✅ FIX: se envía primerPago como amountToCharge para que Bold cobre la cuota correcta
          amountToCharge: primerPago,
          items: [{
            ticketTypeId: 0, quantity: qty,
            _unitPrice: basePrice > 0 ? Math.round(basePrice / qty) : Math.round(total / qty),
            _label: ticketLabel ?? stageLabel ?? accessType ?? 'Entrada',
          }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la orden');
      if (!data.paymentUrl) {
        throw new Error(data.boldError
          ? `Error Bold: ${data.boldError.substring(0, 120)}`
          : 'No se pudo generar el link de pago. Intenta de nuevo.');
      }
      window.location.href = data.paymentUrl;
    } catch (err: any) {
      setPaymentError(err.message || 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !selectedEvent) return null;

  const visibleSteps = step === 1
    ? [{ n: 1, label: 'Acceso' }, { n: 2, label: 'Zona' }, { n: 3, label: 'Confirmar' }]
    : accessType === 'package'
      ? [{ n: 1, label: 'Acceso' }, { n: 2, label: 'Etapa' }, { n: 3, label: 'Confirmar' }]
      : [{ n: 3, label: 'Confirmar' }];

  const modalTitle = accessType === 'day1' ? 'DÍA 1 · After Fiesta de Yates'
    : accessType === 'day2' ? 'DÍA 2 · Fiesta Majestic & Stage Joinn'
    : accessType === 'day3' ? 'DÍA 3 · Open Deck'
    : accessType === 'package' ? 'Paquete 3D / 2N · Cabaña AIRA'
    : selectedEvent.venue;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4 md:p-6"
      style={{ background: 'rgba(3,6,18,0.85)', backdropFilter: 'blur(20px)' }}
      onClick={onClose}
    >
      <div
        role="dialog" aria-modal="true" aria-label="Reserva de tickets"
        className="relative w-full sm:max-w-6xl rounded-t-[2rem] sm:rounded-[2rem] border border-white/10 bg-[#08101f] shadow-2xl flex flex-col max-h-[96dvh] sm:max-h-[92dvh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none rounded-[inherit]" style={{
          background:
            'radial-gradient(circle at top right,rgba(225,254,82,0.24),transparent 30%),' +
            'radial-gradient(circle at left center,rgba(0,79,255,0.2),transparent 35%)',
        }} />

        {/* HEADER */}
        <div className="relative z-10 flex-none border-b border-white/10 px-5 py-4 md:px-8 md:py-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono-custom text-[10px] uppercase tracking-[0.35em] text-aira-lime/70 mb-1">Guatapé · AIRA</p>
            <h3 className="font-display text-2xl md:text-4xl text-white leading-none truncate">{modalTitle}</h3>
            <p className="font-mono-custom text-xs md:text-sm text-white/45 mt-1.5">{selectedEvent.city} · {selectedEvent.date} · {selectedEvent.time}</p>
          </div>
          <button
            className="flex-none w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 active:bg-white/20 transition-colors"
            onClick={onClose} aria-label="Cerrar"
          ><X className="w-5 h-5" /></button>
        </div>

        {/* STEP PILLS */}
        {visibleSteps.length > 1 && (
          <div className="relative z-10 flex-none px-5 md:px-8 pt-4 pb-3 flex flex-wrap gap-2 border-b border-white/[0.06]">
            {visibleSteps.map((item, idx) => {
              const visualN   = idx + 1;
              const active    = step === item.n;
              const completed = step > item.n;
              return (
                <div key={item.n} className={'flex items-center gap-2 px-3 py-1.5 rounded-full border ' + (active ? 'border-aira-lime/40 bg-aira-lime/10' : 'border-white/10 bg-white/[0.03]')}>
                  <div className={'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono-custom ' + (completed ? 'bg-aira-lime text-aira-darkBlue' : active ? 'bg-aira-blue text-white' : 'bg-white/10 text-white/50')}>
                    {completed ? <Check className="w-3.5 h-3.5" /> : visualN}
                  </div>
                  <span className={'font-mono-custom text-[10px] uppercase tracking-[0.22em] ' + (active ? 'text-white' : 'text-white/45')}>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* SCROLLABLE BODY */}
        <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">

            {/* MAIN PANEL */}
            <div className="p-5 md:p-8 lg:border-r border-white/10">

              {/* ── STEP 1 ── */}
              {step === 1 && (
                <div>
                  <p className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/35 mb-2">Paso 1</p>
                  <h4 className="font-display text-3xl md:text-4xl text-white mb-1">¿Cómo quieres vivir AIRA?</h4>
                  <p className="text-sm text-white/50 mb-6">Elige entre boletería por día o el paquete completo con alojamiento.</p>

                  <p className="font-mono-custom text-[9px] uppercase tracking-[0.3em] text-aira-lime/60 mb-3">🎟 Boletería por día</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {DAYS.map(day => (
                      <button key={day.id}
                        className="text-left rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/30 active:scale-[0.98] transition-all duration-200"
                        onClick={() => handleSelectDay(day.id)}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${day.accentColor}20`, color: day.accentColor }}>{day.icon}</div>
                        <p className="font-mono-custom text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: day.accentColor }}>{day.label}</p>
                        <h5 className="font-display text-base text-white leading-snug mb-2">{day.title}</h5>
                        <p className="font-display text-lg" style={{ color: day.accentColor }}>{fmt(day.price)}</p>
                      </button>
                    ))}
                  </div>

                  <p className="font-mono-custom text-[9px] uppercase tracking-[0.3em] text-aira-lime/60 mb-3">🏠 Paquete completo · 3D / 2N</p>
                  <button
                    className="w-full text-left rounded-2xl border border-aira-lime/20 bg-aira-lime/5 p-5 hover:border-aira-lime/50 hover:bg-aira-lime/10 active:scale-[0.99] transition-all duration-200"
                    onClick={handleSelectPackage}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-aira-lime" /><h5 className="font-display text-xl text-white">Cabaña AIRA</h5></div>
                        <p className="text-sm text-white/50 mb-3 max-w-sm">2 habitaciones · 2 baños · terraza · cocina · jacuzzi · capacidad 7 personas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['Recorrido Peñol','Yacht party','Yate Majestic','Noches de música','Open decks','Meditación'].map(p => (
                            <span key={p} className="px-2.5 py-1 rounded-full text-[8px] font-mono-custom uppercase tracking-[0.15em] border border-aira-lime/20 text-aira-lime/60 bg-aira-lime/5">{p}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/35 mb-1">Desde</p>
                        <p className="font-display text-2xl text-aira-lime">{fmt(590_000)}</p>
                        <p className="font-mono-custom text-[9px] text-white/35">por persona</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* ── STEP 2: Etapas (paquete) ── */}
              {step === 2 && accessType === 'package' && (
                <div>
                  <p className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/35 mb-2">Paso 2</p>
                  <h4 className="font-display text-3xl md:text-4xl text-white mb-1">Selecciona tu etapa</h4>
                  <p className="text-sm text-white/50 mb-6">El precio varía según la etapa de compra. Cabaña para 7 personas.</p>
                  <div className="space-y-2">
                    {STAGES.map(stage => (
                      <button key={stage.id} disabled={stage.locked}
                        className={'w-full text-left rounded-2xl border p-4 transition-all duration-200 ' + (stage.locked ? 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed' : selectedStageId === stage.id ? 'border-aira-lime/50 bg-aira-lime/10 active:scale-[0.99]' : 'border-white/10 bg-white/[0.03] hover:border-white/25 active:scale-[0.99]')}
                        onClick={() => !stage.locked && setSelectedStageId(stage.id)}
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            {selectedStageId === stage.id && !stage.locked && <div className="w-5 h-5 rounded-full bg-aira-lime flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-aira-darkBlue" /></div>}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-display text-base text-white">{stage.label}</span>
                                {stage.locked && <span className="px-2 py-0.5 rounded-full text-[8px] font-mono-custom uppercase tracking-[0.15em] bg-amber-400/15 text-amber-400 border border-amber-400/20">🔒 Solo Melomania</span>}
                                {(stage as any).urgent && <span className="px-2 py-0.5 rounded-full text-[8px] font-mono-custom uppercase tracking-[0.15em] bg-red-500/15 text-red-400 border border-red-500/20">Últimas {stage.slots}</span>}
                              </div>
                              <p className="font-mono-custom text-[9px] text-white/40 mt-0.5">{stage.dates} · {stage.slots} plazas</p>
                            </div>
                          </div>
                          <p className="font-display text-xl text-aira-lime shrink-0">{fmt(stage.price)}<span className="font-mono-custom text-[10px] text-white/40 ml-1">/persona</span></p>
                        </div>
                        {stage.locked && <p className="text-[10px] text-amber-400/60 mt-2">Disponible para asistentes verificados de Melomania</p>}
                      </button>
                    ))}
                  </div>
                  <div className="mt-5">
                    <PassVipBanner addPassVip={addPassVip} setAddPassVip={setAddPassVip} qty={qty} passVipPrice={passVipPrice} />
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <button className="px-5 py-2.5 rounded-full border border-white/10 text-white/70 text-sm hover:bg-white/5 transition-colors" onClick={() => { setAccessType(null); setStep(1); }}>Volver</button>
                    <button disabled={!selectedStageId} className="px-6 py-2.5 rounded-full bg-aira-lime text-aira-darkBlue font-display text-sm uppercase tracking-[0.2em] hover:bg-white active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed" onClick={() => selectedStageId && setStep(3)}>Continuar</button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Confirmar ── */}
              {step === 3 && (
                <div>
                  <p className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/35 mb-2">
                    {accessType === 'package' ? 'Paso 3' : 'Confirmar'}
                  </p>
                  <h4 className="font-display text-3xl md:text-4xl text-white mb-1">Confirmar y pagar</h4>
                  <p className="text-sm text-white/50 mb-5">Revisa tu pedido y completa tus datos.</p>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-5">

                    {/* Info evento */}
                    <div className="grid grid-cols-2 gap-3">
                      {(([['Evento', selectedEvent.venue], ['Ciudad', selectedEvent.city], ['Fecha', selectedEvent.date], ['Hora', selectedEvent.time]]) as [string,string][]).map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="font-mono-custom text-[9px] uppercase tracking-[0.22em] text-white/35 mb-1">{label}</p>
                          <p className="font-display text-base text-white truncate">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Selección */}
                    <div className="border-t border-white/10 pt-4">
                      <p className="font-mono-custom text-[9px] uppercase tracking-[0.22em] text-white/35 mb-2">Tu selección</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDay && (
                          <span className="px-3 py-1.5 rounded-full border border-white/20 text-white/80 bg-white/[0.04] text-sm">
                            {selectedDay.label} · {selectedDay.title} · {fmt(selectedDay.price)}
                          </span>
                        )}
                        {accessType === 'package' && selectedStage && (
                          <span className="px-3 py-1.5 rounded-full border border-aira-lime/30 text-aira-lime bg-aira-lime/8 text-sm">
                            Cabaña AIRA · {selectedStage.label} · {fmt(selectedStage.price)}/persona
                          </span>
                        )}
                        {addPassVip && (
                          <span className="px-3 py-1.5 rounded-full border border-yellow-400/40 text-yellow-300 bg-yellow-400/10 text-sm flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Pass VIP · {fmt(passVipPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cantidad */}
                    <div className="flex items-center justify-between border-t border-white/10 pt-4">
                      <p className="font-mono-custom text-[9px] uppercase tracking-[0.22em] text-white/35">{accessType === 'package' ? 'Personas' : 'Boletas'}</p>
                      <div className="flex items-center gap-1 rounded-full border border-white/10 p-1">
                        <button className="w-8 h-8 rounded-full hover:bg-white/10 active:bg-white/20 flex items-center justify-center transition-colors" onClick={() => setQty(v => Math.max(1, v - 1))} aria-label="Reducir"><Minus className="w-3.5 h-3.5 text-white/60" /></button>
                        <span className="w-8 text-center font-mono-custom text-sm text-white">{qty}</span>
                        <button className="w-8 h-8 rounded-full hover:bg-white/10 active:bg-white/20 flex items-center justify-center transition-colors" onClick={() => setQty(v => Math.min(accessType === 'package' ? 7 : 8, v + 1))} aria-label="Aumentar"><Plus className="w-3.5 h-3.5 text-white/60" /></button>
                      </div>
                    </div>

                    {/* Pass VIP */}
                    <div className="border-t border-white/10 pt-4">
                      <PassVipBanner addPassVip={addPassVip} setAddPassVip={setAddPassVip} qty={qty} passVipPrice={passVipPrice} compact />
                    </div>

                    {/* Transporte — solo para paquete */}
                    {!isDayTicket && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Bus className="w-4 h-4 text-white/40" />
                          <div>
                            <p className="text-sm text-white">Transporte Bogotá – Guatapé</p>
                            <p className="font-mono-custom text-[9px] text-white/40">Ida y regreso · {fmt(TRANSPORT_PRICE)}/persona</p>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer shrink-0">
                          <span className="font-display text-sm text-white/70">{fmt(TRANSPORT_PRICE)}</span>
                          <input type="checkbox" checked={addTransport} onChange={e => setAddTransport(e.target.checked)} className="w-4 h-4 accent-white" />
                        </label>
                      </div>
                    )}

                    {/* Totales */}
                    <div className="space-y-2 border-t border-white/10 pt-4">
                      <div className="flex justify-between font-mono-custom text-sm text-white/55"><span>Subtotal</span><span className="text-white">{fmt(basePrice)}</span></div>
                      <div className="flex justify-between font-mono-custom text-sm text-white/55"><span>Cargo de servicio (5%)</span><span className="text-white">{fmt(serviceFee)}</span></div>
                      {addPassVip && <div className="flex justify-between font-mono-custom text-sm text-white/55"><span>Pass VIP ×{qty}</span><span className="text-yellow-300">{fmt(passTotal)}</span></div>}
                      {!isDayTicket && addTransport && <div className="flex justify-between font-mono-custom text-sm text-white/55"><span>Transporte ×{qty}</span><span className="text-white/70">{fmt(transTotal)}</span></div>}
                      <div className="flex justify-between pt-2 border-t border-white/10">
                        <span className="font-display text-xl text-white">Total</span>
                        <span className="font-display text-2xl text-aira-lime">{fmt(total)}</span>
                      </div>
                    </div>

                    {/* Pago — cuotas solo para paquete */}
                    {!isDayTicket && (
                      <div className="border-t border-white/10 pt-5">
                        <AbonoSelector paymentMode={paymentMode} setPaymentMode={setPaymentMode} abonoPlanId={abonoPlanId} setAbonoPlanId={setAbonoPlanId} total={total} />
                      </div>
                    )}

                    {/* Datos comprador */}
                    <div className="border-t border-white/10 pt-5">
                      <BuyerForm
                        name={buyerName} email={buyerEmail} phone={buyerPhone}
                        onChange={(field, value) => {
                          if (field === 'name')  setBuyerName(value);
                          if (field === 'email') setBuyerEmail(value);
                          if (field === 'phone') setBuyerPhone(value);
                        }}
                      />
                    </div>

                    {paymentError && (
                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                        <p className="text-sm text-red-400">{paymentError}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-1 items-center">
                      {!selectedEvent.initialAccessType || accessType === 'package' ? (
                        <button
                          className="px-5 py-2.5 rounded-full border border-white/10 text-white/70 text-sm hover:bg-white/5 transition-colors"
                          onClick={() => accessType === 'package' ? setStep(2) : (setAccessType(null), setStep(1))}
                          disabled={isSubmitting}
                        >Volver</button>
                      ) : null}
                      {/* ✅ FIX: botón muestra primerPago (cuota) no total completo */}
                      <button
                        className="flex-1 min-w-[160px] px-6 py-3 rounded-full bg-aira-lime text-aira-darkBlue font-display text-sm uppercase tracking-[0.2em] hover:bg-white active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleCheckout}
                        disabled={isSubmitting}
                      >
                        {isSubmitting
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                          : <><Ticket className="w-4 h-4" /> Pagar {fmt(primerPago)}{effectivePaymentMode === 'abono' ? ' · 1ª cuota' : ''}</>
                        }
                      </button>
                    </div>
                    <p className="text-center font-mono-custom text-[8px] uppercase tracking-[0.2em] text-white/20 pt-1">
                      Pago seguro · PSE · Tarjeta · Nequi · Daviplata
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* SIDEBAR */}
            <aside className="p-5 md:p-8 bg-white/[0.02] border-t lg:border-t-0 border-white/10">
              <p className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/35 mb-3">Evento</p>
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04]">
                {selectedEvent.image
                  ? <img src={selectedEvent.image} alt={selectedEvent.venue} className="w-full aspect-video object-cover" loading="lazy" />
                  : <div className="w-full aspect-video bg-gradient-to-br from-aira-blue/20 to-aira-lime/10" />}
                <div className="p-4 border-t border-white/10">
                  <h5 className="font-display text-xl text-white mb-1">{selectedEvent.venue}</h5>
                  <p className="text-xs text-white/45 mb-3">{selectedEvent.city} · {selectedEvent.date} · {selectedEvent.time}</p>
                </div>
              </div>

              {selectedDay && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-mono-custom text-[9px] uppercase tracking-[0.24em] text-white/35 mb-2">{selectedDay.label} · Precio</p>
                  <p className="font-display text-3xl" style={{ color: selectedDay.accentColor }}>{fmt(selectedDay.price)}</p>
                  <p className="font-mono-custom text-[9px] text-white/35 mt-1">por persona · cargo de servicio incluido</p>
                </div>
              )}

              {/* Cuotas en sidebar solo si es paquete */}
              {!isDayTicket && (
                <div className="mt-4 rounded-2xl border border-aira-lime/15 bg-aira-lime/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarClock className="w-4 h-4 text-aira-lime" />
                    <p className="font-mono-custom text-[9px] uppercase tracking-[0.24em] text-aira-lime">Paga en cuotas</p>
                  </div>
                  <div className="space-y-2">
                    {ABONO_PLANS.map(plan => (
                      <div key={plan.id} className="flex items-center justify-between rounded-xl bg-aira-lime/5 border border-aira-lime/10 px-3 py-2">
                        <p className="font-mono-custom text-[9px] uppercase tracking-[0.15em] text-white/50">{plan.label}</p>
                        <p className="font-mono-custom text-[9px] text-aira-lime">{Math.round(plan.pct * 100)}% ahora</p>
                      </div>
                    ))}
                  </div>
                  <p className="font-mono-custom text-[8px] text-white/30 mt-3 leading-relaxed">Tu cupo queda reservado desde el primer abono.</p>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">
                <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-yellow-300" /><p className="font-mono-custom text-[9px] uppercase tracking-[0.24em] text-yellow-300">Pass VIP</p></div>
                <div className="space-y-2">
                  {[
                    { icon: '🛥', label: 'Yate VIP',            desc: 'Acceso exclusivo al yate' },
                    { icon: '👑', label: 'Zona VIP Majestic',   desc: 'Área premium en el yate Majestic' },
                    { icon: '🎵', label: 'Zona VIP Stage Joinn',desc: 'Acceso VIP al Stage Joinn' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-2.5 rounded-xl bg-yellow-400/8 border border-yellow-400/15 p-2.5">
                      <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                      <div>
                        <p className="font-mono-custom text-[9px] uppercase tracking-[0.15em] text-yellow-300">{item.label}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {accessType && (
                  <p className="font-mono-custom text-[9px] text-yellow-300/60 mt-3">
                    {accessType === 'day1' && `Día 1 · ${fmt(PASS_VIP_PRICES.day1)}/persona`}
                    {accessType === 'day2' && `Día 2 · ${fmt(PASS_VIP_PRICES.day2)}/persona`}
                    {accessType === 'day3' && `Día 3 · ${fmt(PASS_VIP_PRICES.day3)}/persona`}
                    {accessType === 'package' && `Paquete · ${fmt(PASS_VIP_PRICES.package)}/persona`}
                  </p>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-mono-custom text-[9px] uppercase tracking-[0.24em] text-white/35 mb-3">Programa</p>
                <div className="space-y-3">
                  {[
                    { day: 'Día 1', items: ['After Fiesta de Yates', 'Noche de fiesta', 'Wellness'] },
                    { day: 'Día 2', items: ['Yacht party', 'Yate Majestic · Stage Joinn', 'Noche de fiesta'] },
                    { day: 'Día 3', items: ['Yacht party open deck', 'Wellness'] },
                  ].map(({ day, items }) => (
                    <div key={day}>
                      <p className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-aira-lime/70 mb-1">{day}</p>
                      <ul className="space-y-0.5">{items.map(i => <li key={i} className="text-xs text-white/45 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />{i}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketReserve;
