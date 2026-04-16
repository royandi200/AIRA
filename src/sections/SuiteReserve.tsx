import { useCallback, useEffect, useState } from 'react';
import { X, Check, Bath, Waves, Eye, Star, Bus, Minus, Plus, Ticket, Loader2, CreditCard, CalendarClock, AlertCircle } from 'lucide-react';

interface SuiteReserveProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUITES = [
  { id: 1, label: 'Suite N\u00ba 1', view: 'Vista represa norte', available: true },
  { id: 2, label: 'Suite N\u00ba 2', view: 'Vista represa sur',   available: true },
  { id: 3, label: 'Suite N\u00ba 3', view: 'Vista jardines',      available: true },
  { id: 4, label: 'Suite N\u00ba 4', view: 'Vista represa norte', available: true },
  { id: 5, label: 'Suite N\u00ba 5', view: 'Vista jardines',      available: false },
  { id: 6, label: 'Suite N\u00ba 6', view: 'Vista represa sur',   available: true },
];

const SUITE_PRICE    = 2_200_000;
const TRANSPORT_PRICE = 150_000;

const ABONO_PLANS = [
  { id: 'a50', label: '2 cuotas', pct: 0.50, desc: '50% ahora \u00b7 50% antes del evento', badge: 'Popular' },
  { id: 'a33', label: '3 cuotas', pct: 0.33, desc: '33% ahora \u00b7 33% \u00b7 33% antes del evento', badge: null },
  { id: 'a25', label: '4 cuotas', pct: 0.25, desc: '25% ahora \u00b7 resto en 3 cuotas', badge: null },
];

type PaymentMode = 'full' | 'abono';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function useLockBodyScroll(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    return () => {
      body.style.overflow = '';
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
    };
  }, [isOpen]);
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
          paymentMode === 'full' ? 'border-amber-400/50 bg-amber-400/8' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${paymentMode === 'full' ? 'bg-amber-400/20' : 'bg-white/5'}`}>
          <CreditCard className={`w-5 h-5 ${paymentMode === 'full' ? 'text-amber-400' : 'text-white/40'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display text-base text-white">Pago completo</p>
            {paymentMode === 'full' && <Check className="w-4 h-4 text-amber-400" />}
          </div>
          <p className="text-xs text-white/45">Paga el total ahora y asegura tu suite</p>
        </div>
        <p className="font-display text-lg text-amber-400 shrink-0">{fmt(total)}</p>
      </button>

      <button
        onClick={() => setPaymentMode('abono')}
        className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
          paymentMode === 'abono' ? 'border-amber-400/50 bg-amber-400/8' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${paymentMode === 'abono' ? 'bg-amber-400/20' : 'bg-white/5'}`}>
            <CalendarClock className={`w-5 h-5 ${paymentMode === 'abono' ? 'text-amber-400' : 'text-white/40'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display text-base text-white">Pagar en cuotas</p>
              <span className="px-2 py-0.5 rounded-full text-[8px] font-mono-custom uppercase tracking-[0.15em] bg-amber-400/15 text-amber-400 border border-amber-400/25">Nuevo</span>
              {paymentMode === 'abono' && <Check className="w-4 h-4 text-amber-400" />}
            </div>
            <p className="text-xs text-white/45">Abona un porcentaje ahora y el resto antes del evento</p>
          </div>
          <p className="font-display text-lg text-amber-400 shrink-0">Desde {fmt(Math.ceil(total * 0.25))}</p>
        </div>

        {paymentMode === 'abono' && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2" onClick={e => e.stopPropagation()}>
            {ABONO_PLANS.map(plan => (
              <button
                key={plan.id}
                onClick={() => setAbonoPlanId(plan.id)}
                className={`w-full text-left rounded-xl border px-4 py-3 transition-all duration-150 flex items-center justify-between gap-3 ${
                  abonoPlanId === plan.id ? 'border-amber-400/40 bg-amber-400/10' : 'border-white/8 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {abonoPlanId === plan.id
                    ? <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-[#06090f]" /></div>
                    : <div className="w-5 h-5 rounded-full border border-white/20 shrink-0" />
                  }
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm text-white">{plan.label}</span>
                      {plan.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[7px] font-mono-custom uppercase tracking-[0.15em] bg-amber-400/15 text-amber-400 border border-amber-400/20">{plan.badge}</span>
                      )}
                    </div>
                    <p className="font-mono-custom text-[9px] text-white/40 mt-0.5">{plan.desc}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-base text-amber-400">{fmt(Math.ceil(total * plan.pct))}</p>
                  <p className="font-mono-custom text-[9px] text-white/35">primer pago</p>
                </div>
              </button>
            ))}
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2.5 mt-1">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="font-mono-custom text-[9px] text-amber-300/70 leading-relaxed">
                El cupo queda reservado al realizar el primer abono. Las cuotas restantes se cobran autom\u00e1ticamente seg\u00fan el plan.
              </p>
            </div>
          </div>
        )}
      </button>

      {paymentMode === 'abono' && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-amber-400/70">Pagas hoy</p>
            <p className="font-display text-2xl text-amber-400 mt-0.5">{fmt(primerPago)}</p>
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
  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 focus:bg-white/[0.06] transition-all";
  return (
    <div className="space-y-3">
      <p className="font-mono-custom text-[9px] uppercase tracking-[0.28em] text-white/35 mb-3">Datos del comprador</p>
      <div>
        <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Nombre completo *</label>
        <input type="text" value={name} onChange={e => onChange('name', e.target.value)} placeholder="Tu nombre" className={inputClass} required />
      </div>
      <div>
        <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Correo electr\u00f3nico *</label>
        <input type="email" value={email} onChange={e => onChange('email', e.target.value)} placeholder="tu@email.com" className={inputClass} required />
      </div>
      <div>
        <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Celular (WhatsApp) *</label>
        <input type="tel" value={phone} onChange={e => onChange('phone', e.target.value)} placeholder="+57 300 000 0000" className={inputClass} required />
      </div>
    </div>
  );
}

const SuiteReserve = ({ isOpen, onClose }: SuiteReserveProps) => {
  const [step, setStep]               = useState(1);
  const [selectedSuiteId, setSuiteId] = useState<number | null>(null);
  const [addTransport, setAddTransport] = useState(false);
  const [qty, setQty]                 = useState(2);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('full');
  const [abonoPlanId, setAbonoPlanId] = useState(ABONO_PLANS[0].id);
  const [buyerName,  setBuyerName]    = useState('');
  const [buyerEmail, setBuyerEmail]   = useState('');
  const [buyerPhone, setBuyerPhone]   = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useLockBodyScroll(isOpen);

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
    setStep(1);
    setSuiteId(null);
    setAddTransport(false);
    setQty(2);
    setPaymentMode('full');
    setAbonoPlanId(ABONO_PLANS[0].id);
    setBuyerName('');
    setBuyerEmail('');
    setBuyerPhone('');
    setPaymentError(null);
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const selectedSuite = SUITES.find(s => s.id === selectedSuiteId) ?? null;
  const serviceFee    = Math.round(SUITE_PRICE * 0.05);
  const transTotal    = addTransport ? TRANSPORT_PRICE * qty : 0;
  const total         = SUITE_PRICE + serviceFee + transTotal;

  const selectedPlan = ABONO_PLANS.find(p => p.id === abonoPlanId) ?? ABONO_PLANS[0];
  const primerPago   = paymentMode === 'full' ? total : Math.ceil(total * selectedPlan.pct);

  const available = SUITES.filter(s => s.available).length;

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
          name:        buyerName.trim(),
          email:       buyerEmail.trim(),
          phone:       buyerPhone.trim(),
          eventId:     'suite-aira',
          accessType:  'suite',
          ticketLabel: `Suite AIRA N\u00ba ${selectedSuiteId} \u2014 ${selectedSuite?.view}`,
          stageLabel:  null,
          qty:         1,
          basePrice:   SUITE_PRICE,
          addPassVip:  false,
          passVipPrice: 0,
          addTransport,
          total,
          paymentMode,
          abonoPlan: paymentMode === 'abono' ? abonoPlanId : null,
          primerPago,
          items: [{
            ticketTypeId: 0,
            quantity: 1,
            _unitPrice: SUITE_PRICE,
            _label: `Suite AIRA N\u00ba ${selectedSuiteId}`,
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
      setPaymentError(err.message || 'Ocurri\u00f3 un error. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const stepLabels = [
    { n: 1, label: 'Suite' },
    { n: 2, label: 'Confirmar' },
  ];

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center sm:p-4 md:p-6"
      style={{ background: 'rgba(2,4,12,0.90)', backdropFilter: 'blur(24px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reserva Suite AIRA"
        className="relative w-full sm:max-w-4xl rounded-t-[2rem] sm:rounded-[2rem] border border-amber-400/20 bg-[#06090f] shadow-2xl flex flex-col max-h-[96dvh] sm:max-h-[92dvh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Gold ambient glow */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none rounded-[inherit]"
          style={{
            background:
              'radial-gradient(circle at top right, rgba(251,191,36,0.18), transparent 40%),' +
              'radial-gradient(circle at bottom left, rgba(251,191,36,0.10), transparent 45%)',
          }}
        />

        {/* \u2500\u2500 HEADER \u2500\u2500 */}
        <div className="relative z-10 flex-none border-b border-amber-400/15 px-5 py-4 md:px-8 md:py-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
              <p className="font-mono-custom text-[10px] uppercase tracking-[0.35em] text-amber-400/80">Experiencia Premium \u00b7 Solo 6 suites</p>
            </div>
            <h3 className="font-display text-2xl md:text-4xl text-white leading-none">Suite AIRA</h3>
            <p className="font-mono-custom text-xs md:text-sm text-white/40 mt-1.5">
              Guatap\u00e9 \u00b7 3 d\u00edas, 2 noches \u00b7 Paquete completo
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-400/20 bg-amber-400/8">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-amber-400">{available} disponibles</span>
            </div>
            <button
              className="flex-none w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 active:bg-white/20 transition-colors"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* \u2500\u2500 STEP PILLS \u2500\u2500 */}
        <div className="relative z-10 flex-none px-5 md:px-8 pt-4 pb-3 flex flex-wrap gap-2 border-b border-white/[0.05]">
          {stepLabels.map(item => {
            const active    = step === item.n;
            const completed = step > item.n;
            return (
              <div
                key={item.n}
                className={
                  'flex items-center gap-2 px-3 py-1.5 rounded-full border ' +
                  (active ? 'border-amber-400/40 bg-amber-400/10' : 'border-white/10 bg-white/[0.03]')
                }
              >
                <div
                  className={
                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono-custom ' +
                    (completed ? 'bg-amber-400 text-[#06090f]' : active ? 'bg-amber-400/80 text-[#06090f]' : 'bg-white/10 text-white/50')
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

        {/* \u2500\u2500 SCROLLABLE BODY \u2500\u2500 */}
        <div
          ref={scrollRef}
          className="relative z-10 flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.85fr]">

            {/* \u2550\u2550\u2550\u2550 MAIN PANEL \u2550\u2550\u2550\u2550 */}
            <div className="p-5 md:p-8 lg:border-r border-white/[0.06]">

              {/* \u2500\u2500 STEP 1: Selecci\u00f3n de suite \u2500\u2500 */}
              {step === 1 && (
                <div>
                  <p className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/35 mb-2">Paso 1</p>
                  <h4 className="font-display text-3xl md:text-4xl text-white mb-1">Elige tu suite</h4>
                  <p className="text-sm text-white/50 mb-6">
                    1 habitaci\u00f3n \u00b7 1 ba\u00f1o \u00b7 terraza privada \u00b7 jacuzzi \u00b7 capacidad 2 personas.
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {[
                      { icon: <Bath className="w-3 h-3" />, label: 'Jacuzzi privado' },
                      { icon: <Waves className="w-3 h-3" />, label: 'Terraza' },
                      { icon: <Eye className="w-3 h-3" />, label: 'Vista represa' },
                      { icon: <Star className="w-3 h-3" fill="currentColor" />, label: 'Servicio premium' },
                    ].map(({ icon, label }) => (
                      <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-400/20 bg-amber-400/8">
                        <span className="text-amber-400">{icon}</span>
                        <span className="font-mono-custom text-[9px] uppercase tracking-[0.18em] text-amber-400/80">{label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SUITES.map(suite => (
                      <button
                        key={suite.id}
                        disabled={!suite.available}
                        className={
                          'relative rounded-2xl border p-4 text-left transition-all duration-200 ' +
                          (!suite.available
                            ? 'border-white/5 bg-white/[0.01] opacity-40 cursor-not-allowed'
                            : selectedSuiteId === suite.id
                            ? 'border-amber-400/60 bg-amber-400/10 active:scale-[0.98]'
                            : 'border-white/10 bg-white/[0.03] hover:border-amber-400/30 hover:bg-amber-400/5 active:scale-[0.98]')
                        }
                        onClick={() => suite.available && setSuiteId(suite.id)}
                      >
                        {!suite.available && (
                          <div className="absolute top-2 right-2">
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-mono-custom uppercase tracking-[0.15em] bg-red-500/20 text-red-400 border border-red-500/20">Reservada</span>
                          </div>
                        )}
                        {selectedSuiteId === suite.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                            <Check className="w-3 h-3 text-[#06090f]" />
                          </div>
                        )}
                        <div className="w-8 h-8 rounded-xl bg-amber-400/15 flex items-center justify-center mb-3">
                          <span className="font-display text-sm text-amber-400">{suite.id}</span>
                        </div>
                        <p className="font-display text-base text-white mb-0.5">{suite.label}</p>
                        <p className="font-mono-custom text-[9px] text-white/40">{suite.view}</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-end">
                    <button
                      disabled={!selectedSuiteId}
                      className="px-6 py-2.5 rounded-full bg-amber-400 text-[#06090f] font-display text-sm uppercase tracking-[0.2em] hover:bg-amber-300 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => selectedSuiteId && setStep(2)}
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {/* \u2500\u2500 STEP 2: Confirmar \u2500\u2500 */}
              {step === 2 && selectedSuite && (
                <div>
                  <p className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/35 mb-2">Paso 2</p>
                  <h4 className="font-display text-3xl md:text-4xl text-white mb-1">Confirmar reserva</h4>
                  <p className="text-sm text-white/50 mb-5">Revisa el resumen antes de proceder al pago.</p>

                  <div className="rounded-2xl border border-amber-400/15 bg-white/[0.02] p-5 space-y-4">

                    {/* Suite info */}
                    <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                      <div className="w-12 h-12 rounded-2xl bg-amber-400/15 flex items-center justify-center shrink-0">
                        <span className="font-display text-xl text-amber-400">{selectedSuite.id}</span>
                      </div>
                      <div>
                        <h5 className="font-display text-xl text-white">{selectedSuite.label}</h5>
                        <p className="font-mono-custom text-[10px] text-white/40">{selectedSuite.view} \u00b7 Guatap\u00e9 \u00b7 3D/2N</p>
                      </div>
                    </div>

                    {/* Event grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        ['Evento', 'AIRA Guatap\u00e9'],
                        ['Capacidad', '2 personas (pareja)'],
                        ['Duraci\u00f3n', '3 d\u00edas \u00b7 2 noches'],
                        ['Check-in', 'D\u00eda 1 del evento'],
                      ] as [string,string][]).map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="font-mono-custom text-[9px] uppercase tracking-[0.22em] text-white/35 mb-1">{label}</p>
                          <p className="font-display text-sm text-white">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Includes */}
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="font-mono-custom text-[9px] uppercase tracking-[0.22em] text-white/35 mb-3">Incluye</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {[
                          'Hospedaje 2 noches',
                          'Jacuzzi privado',
                          'Terraza con vista',
                          'Recorrido Pe\u00f1ol & Guatap\u00e9',
                          'Yacht parties (3 d\u00edas)',
                          'Yate Majestic',
                          'Noches de m\u00fasica',
                          'Open decks',
                          'Sesiones wellness',
                        ].map(item => (
                          <div key={item} className="flex items-center gap-2">
                            <Check className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="text-xs text-white/60">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Transport */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Bus className="w-4 h-4 text-white/40" />
                        <div>
                          <p className="text-sm text-white">Transporte Bogot\u00e1 \u2013 Guatap\u00e9</p>
                          <p className="font-mono-custom text-[9px] text-white/40">Ida y regreso \u00b7 por persona</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <span className="font-display text-sm text-white/70">{fmt(TRANSPORT_PRICE)}</span>
                        <input
                          type="checkbox"
                          checked={addTransport}
                          onChange={e => setAddTransport(e.target.checked)}
                          className="w-4 h-4"
                        />
                      </label>
                    </div>

                    {addTransport && (
                      <div className="flex items-center justify-between">
                        <p className="font-mono-custom text-[9px] uppercase tracking-[0.22em] text-white/35">Personas para transporte</p>
                        <div className="flex items-center gap-1 rounded-full border border-white/10 p-1">
                          <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors" onClick={() => setQty(v => Math.max(1, v - 1))}>
                            <Minus className="w-3.5 h-3.5 text-white/60" />
                          </button>
                          <span className="w-8 text-center font-mono-custom text-sm text-white">{qty}</span>
                          <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors" onClick={() => setQty(v => Math.min(2, v + 1))}>
                            <Plus className="w-3.5 h-3.5 text-white/60" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Totals */}
                    <div className="space-y-2 border-t border-white/10 pt-4">
                      <div className="flex justify-between font-mono-custom text-sm text-white/55">
                        <span>Suite AIRA \u00b7 pareja</span><span className="text-white">{fmt(SUITE_PRICE)}</span>
                      </div>
                      <div className="flex justify-between font-mono-custom text-sm text-white/55">
                        <span>Cargo de servicio (5%)</span><span className="text-white">{fmt(serviceFee)}</span>
                      </div>
                      {addTransport && (
                        <div className="flex justify-between font-mono-custom text-sm text-white/55">
                          <span>Transporte \u00d7{qty}</span><span className="text-white/70">{fmt(transTotal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-white/10">
                        <span className="font-display text-xl text-white">Total</span>
                        <span className="font-display text-2xl text-amber-400">{fmt(total)}</span>
                      </div>
                    </div>

                    {/* Forma de pago */}
                    <div className="border-t border-white/10 pt-5">
                      <AbonoSelector
                        paymentMode={paymentMode}
                        setPaymentMode={setPaymentMode}
                        abonoPlanId={abonoPlanId}
                        setAbonoPlanId={setAbonoPlanId}
                        total={total}
                      />
                    </div>

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

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        className="px-5 py-2.5 rounded-full border border-white/10 text-white/70 text-sm hover:bg-white/5 transition-colors"
                        onClick={() => setStep(1)}
                        disabled={isSubmitting}
                      >
                        Volver
                      </button>
                      <button
                        className="flex-1 min-w-[160px] px-6 py-2.5 rounded-full bg-amber-400 text-[#06090f] font-display text-sm uppercase tracking-[0.2em] hover:bg-amber-300 active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleCheckout}
                        disabled={isSubmitting}
                      >
                        {isSubmitting
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                          : <><Ticket className="w-4 h-4" /> {paymentMode === 'abono' ? `Abonar ${fmt(primerPago)}` : `Pagar ${fmt(total)}`}</>
                        }
                      </button>
                    </div>

                    <p className="text-center font-mono-custom text-[8px] uppercase tracking-[0.2em] text-white/20 pt-1">
                      Pago seguro \u00b7 PSE \u00b7 Tarjeta \u00b7 Nequi \u00b7 Daviplata
                    </p>
                  </div>
                </div>
              )}

            </div>{/* end main panel */}

            {/* \u2550\u2550\u2550\u2550 SIDEBAR \u2550\u2550\u2550\u2550 */}
            <aside className="p-5 md:p-8 bg-white/[0.015] border-t lg:border-t-0 border-white/[0.05]">

              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-400" fill="currentColor" />
                  <span className="font-mono-custom text-[9px] uppercase tracking-[0.25em] text-amber-400">Experiencia exclusiva</span>
                </div>
                <p className="font-display text-2xl text-white mb-1">{fmt(SUITE_PRICE)}</p>
                <p className="font-mono-custom text-[10px] text-white/40 mb-4">por pareja \u00b7 todo incluido</p>
                <div className="space-y-2">
                  {[
                    { icon: <Bath className="w-3.5 h-3.5" />, text: '1 habitaci\u00f3n \u00b7 1 ba\u00f1o completo' },
                    { icon: <Waves className="w-3.5 h-3.5" />, text: 'Jacuzzi + terraza privada' },
                    { icon: <Eye className="w-3.5 h-3.5" />, text: 'Vista a la represa' },
                    { icon: <Star className="w-3.5 h-3.5" fill="currentColor" />, text: 'Servicio y hospitalidad premium' },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-2">
                      <span className="text-amber-400/60">{icon}</span>
                      <span className="text-xs text-white/55">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="font-mono-custom text-[9px] uppercase tracking-[0.24em] text-white/35 mb-3">Disponibilidad</p>
                <div className="grid grid-cols-3 gap-2">
                  {SUITES.map(s => (
                    <div
                      key={s.id}
                      className={
                        'aspect-square rounded-xl flex flex-col items-center justify-center border ' +
                        (s.available
                          ? selectedSuiteId === s.id
                            ? 'border-amber-400/60 bg-amber-400/15'
                            : 'border-white/10 bg-white/[0.03]'
                          : 'border-white/5 bg-white/[0.01] opacity-40')
                      }
                    >
                      <span className={'font-display text-lg ' + (s.available ? (selectedSuiteId === s.id ? 'text-amber-400' : 'text-white/60') : 'text-white/20')}>
                        {s.id}
                      </span>
                      <span className={'font-mono-custom text-[8px] ' + (s.available ? 'text-white/30' : 'text-white/15')}>
                        {s.available ? 'libre' : 'reserv.'}
                      </span>
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

export default SuiteReserve;
