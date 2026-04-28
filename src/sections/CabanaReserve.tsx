import { useCallback, useEffect, useState } from 'react';
import { X, Check, Home, Users, Waves, Eye, Star, Bus, Minus, Plus, Loader2, CreditCard, CalendarClock, AlertCircle, MessageCircle } from 'lucide-react';

interface CabanaReserveProps {
  isOpen: boolean;
  onClose: () => void;
}

const CABANA_PRICE   = 5_500_000;
const TRANSPORT_PRICE = 150_000;

const ABONO_PLANS = [
  { id: 'a50', label: '2 cuotas', pct: 0.50, desc: '50% ahora · 50% antes del evento', badge: 'Popular' },
  { id: 'a33', label: '3 cuotas', pct: 0.33, desc: '33% ahora · 33% · 33% antes del evento', badge: null },
  { id: 'a25', label: '4 cuotas', pct: 0.25, desc: '25% ahora · resto en 3 cuotas', badge: null },
];

type PaymentMode = 'full' | 'abono';
type OtpStep = 'form' | 'otp' | 'verified';

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

const CabanaReserve = ({ isOpen, onClose }: CabanaReserveProps) => {
  // ── Estado principal ──
  const [step, setStep]                 = useState(1);
  const [addTransport, setAddTransport] = useState(false);
  const [qty, setQty]                   = useState(7);
  const [paymentMode, setPaymentMode]   = useState<PaymentMode>('full');
  const [abonoPlanId, setAbonoPlanId]   = useState(ABONO_PLANS[0].id);
  const [buyerName,  setBuyerName]      = useState('');
  const [buyerEmail, setBuyerEmail]     = useState('');
  const [buyerPhone, setBuyerPhone]     = useState('');

  // ── OTP WhatsApp ──
  const [otpStep,    setOtpStep]        = useState<OtpStep>('form');
  const [otpCode,    setOtpCode]        = useState('');
  const [otpError,   setOtpError]       = useState<string | null>(null);
  const [otpSending, setOtpSending]     = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [countdown,  setCountdown]      = useState(0);

  // ── Pago ──
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

  // Reset on close
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setAddTransport(false);
    setQty(7);
    setPaymentMode('full');
    setAbonoPlanId(ABONO_PLANS[0].id);
    setBuyerName(''); setBuyerEmail(''); setBuyerPhone('');
    setOtpStep('form'); setOtpCode(''); setOtpError(null);
    setPaymentError(null); setCountdown(0);
  }, [isOpen]);

  // Countdown resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // ── Cálculos ──
  const serviceFee = Math.round(CABANA_PRICE * 0.05);
  const transTotal = addTransport ? TRANSPORT_PRICE * qty : 0;
  const total      = CABANA_PRICE + serviceFee + transTotal;
  const selectedPlan = ABONO_PLANS.find(p => p.id === abonoPlanId) ?? ABONO_PLANS[0];
  const primerPago   = paymentMode === 'full' ? total : Math.ceil(total * selectedPlan.pct);

  // ── OTP: enviar ──
  const handleSendOtp = async () => {
    if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()) {
      setOtpError('Por favor completa nombre, correo y celular.');
      return;
    }
    setOtpSending(true);
    setOtpError(null);
    try {
      const res = await fetch('/api/otp-enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: buyerPhone.trim(), name: buyerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el código');
      setOtpStep('otp');
      setCountdown(60);
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setOtpSending(false);
    }
  };

  // ── OTP: reenviar ──
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setOtpSending(true);
    setOtpError(null);
    try {
      const res = await fetch('/api/otp-reenviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: buyerPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reenviar');
      setCountdown(60);
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setOtpSending(false);
    }
  };

  // ── OTP: verificar ──
  const handleVerifyOtp = async () => {
    if (otpCode.length < 4) { setOtpError('Ingresa el código de 6 dígitos.'); return; }
    setOtpVerifying(true);
    setOtpError(null);
    try {
      const res = await fetch('/api/otp-verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: buyerPhone.trim(), code: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código incorrecto');
      setOtpStep('verified');
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setOtpVerifying(false);
    }
  };

  // ── Checkout final ──
  const handleCheckout = async () => {
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
          eventId:     'cabana-aira',
          accessType:  'cabana',
          ticketLabel: 'Cabaña Completa AIRA x7 — 3 noches Guatapé',
          stageLabel:  null,
          qty:         1,
          basePrice:   CABANA_PRICE,
          addPassVip:  false,
          passVipPrice: 0,
          addTransport,
          total,
          paymentMode,
          abonoPlan:   paymentMode === 'abono' ? abonoPlanId : null,
          primerPago,
          items: [{
            ticketTypeId: 0,
            quantity: 1,
            _unitPrice: CABANA_PRICE,
            _label: 'Cabaña Completa AIRA x7',
          }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la orden');
      if (!data.paymentUrl) throw new Error('No se pudo generar el link de pago. Intenta de nuevo.');
      window.location.href = data.paymentUrl;
    } catch (err: any) {
      setPaymentError(err.message || 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 focus:bg-white/[0.06] transition-all';

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center sm:p-4 md:p-6"
      style={{ background: 'rgba(2,4,12,0.90)', backdropFilter: 'blur(24px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reserva Cabaña AIRA x7"
        className="relative w-full sm:max-w-xl rounded-t-[2rem] sm:rounded-[2rem] border border-amber-400/20 bg-[#06090f] shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/20 flex items-center justify-center">
              <Home className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-lg text-white leading-none">Cabaña Completa x7</h2>
              <p className="font-mono-custom text-[9px] uppercase tracking-[0.25em] text-white/35 mt-0.5">Guatapé · 3 noches · Hasta 7 personas</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:border-white/25 hover:bg-white/5 transition-all" aria-label="Cerrar">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* ── Scroll body ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-6">

          {/* ── Resumen cabaña ── */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
            <p className="font-mono-custom text-[9px] uppercase tracking-[0.28em] text-white/35">Detalle de la cabaña</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <Users className="w-4 h-4" />, label: 'Capacidad', value: 'Hasta 7 personas' },
                { icon: <Waves className="w-4 h-4" />, label: 'Ubicación', value: 'Frente al embalse' },
                { icon: <Eye className="w-4 h-4" />, label: 'Vista', value: 'Vista panorámica' },
                { icon: <Star className="w-4 h-4" />, label: 'Duración', value: '3 noches' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
                  <span className="text-amber-400/70 mt-0.5 shrink-0">{icon}</span>
                  <div>
                    <p className="font-mono-custom text-[8px] uppercase tracking-wider text-white/30">{label}</p>
                    <p className="text-xs text-white/70 mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Transporte ── */}
          <div>
            <p className="font-mono-custom text-[9px] uppercase tracking-[0.28em] text-white/35 mb-3">Transporte opcional</p>
            <button
              onClick={() => setAddTransport(v => !v)}
              className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 flex items-center gap-4 ${
                addTransport ? 'border-amber-400/50 bg-amber-400/8' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${addTransport ? 'bg-amber-400/20' : 'bg-white/5'}`}>
                <Bus className={`w-5 h-5 ${addTransport ? 'text-amber-400' : 'text-white/40'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm text-white">Bus Medellín → Guatapé</p>
                  {addTransport && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-xs text-white/45">{fmt(TRANSPORT_PRICE)} por persona · ida y vuelta</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={e => { e.stopPropagation(); setQty(q => Math.max(1, q - 1)); }} className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center hover:border-white/30 transition-all">
                  <Minus className="w-3 h-3 text-white/50" />
                </button>
                <span className="font-display text-sm text-white w-4 text-center">{qty}</span>
                <button onClick={e => { e.stopPropagation(); setQty(q => Math.min(7, q + 1)); }} className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center hover:border-white/30 transition-all">
                  <Plus className="w-3 h-3 text-white/50" />
                </button>
              </div>
            </button>
          </div>

          {/* ── Forma de pago ── */}
          <div className="space-y-3">
            <p className="font-mono-custom text-[9px] uppercase tracking-[0.28em] text-white/35 mb-1">Forma de pago</p>

            <button onClick={() => setPaymentMode('full')}
              className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 flex items-center gap-4 ${
                paymentMode === 'full' ? 'border-amber-400/50 bg-amber-400/8' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${paymentMode === 'full' ? 'bg-amber-400/20' : 'bg-white/5'}`}>
                <CreditCard className={`w-5 h-5 ${paymentMode === 'full' ? 'text-amber-400' : 'text-white/40'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2"><p className="font-display text-base text-white">Pago completo</p>{paymentMode === 'full' && <Check className="w-4 h-4 text-amber-400" />}</div>
                <p className="text-xs text-white/45">Paga el total ahora y asegura la cabaña</p>
              </div>
              <p className="font-display text-lg text-amber-400 shrink-0">{fmt(total)}</p>
            </button>

            <button onClick={() => setPaymentMode('abono')}
              className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                paymentMode === 'abono' ? 'border-amber-400/50 bg-amber-400/8' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              }`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${paymentMode === 'abono' ? 'bg-amber-400/20' : 'bg-white/5'}`}>
                  <CalendarClock className={`w-5 h-5 ${paymentMode === 'abono' ? 'text-amber-400' : 'text-white/40'}`} />
                </div>
                <div className="flex-1">
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
                    <button key={plan.id} onClick={() => setAbonoPlanId(plan.id)}
                      className={`w-full text-left rounded-xl border px-4 py-3 transition-all duration-150 flex items-center justify-between gap-3 ${
                        abonoPlanId === plan.id ? 'border-amber-400/40 bg-amber-400/10' : 'border-white/8 bg-white/[0.02] hover:border-white/20'
                      }`}>
                      <div className="flex items-center gap-3">
                        {abonoPlanId === plan.id
                          ? <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-[#06090f]" /></div>
                          : <div className="w-5 h-5 rounded-full border border-white/20 shrink-0" />}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sm text-white">{plan.label}</span>
                            {plan.badge && <span className="px-2 py-0.5 rounded-full text-[7px] font-mono-custom uppercase tracking-[0.15em] bg-amber-400/15 text-amber-400 border border-amber-400/20">{plan.badge}</span>}
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

          {/* ── Datos del comprador ── */}
          <div className="space-y-3">
            <p className="font-mono-custom text-[9px] uppercase tracking-[0.28em] text-white/35 mb-3">Datos del comprador</p>
            <div>
              <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Nombre completo *</label>
              <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Tu nombre" className={inputClass} disabled={otpStep !== 'form'} />
            </div>
            <div>
              <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Correo electrónico *</label>
              <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="tu@email.com" className={inputClass} disabled={otpStep !== 'form'} />
            </div>
            <div>
              <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Celular (WhatsApp) *</label>
              <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="+57 300 000 0000" className={inputClass} disabled={otpStep !== 'form'} />
            </div>
          </div>

          {/* ── Resumen total ── */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="font-mono-custom text-[9px] uppercase tracking-[0.28em] text-white/35 mb-3">Resumen</p>
            <div className="space-y-2">
              {[['Cabaña AIRA x7', fmt(CABANA_PRICE)], ['Fee de servicio (5%)', fmt(Math.round(CABANA_PRICE * 0.05))],
                ...(addTransport ? [['Transporte ×' + qty, fmt(TRANSPORT_PRICE * qty)]] : [])].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-xs text-white/40">{k}</span>
                  <span className="font-mono-custom text-xs text-white/60">{v}</span>
                </div>
              ))}
              <div className="h-px bg-white/8 my-2" />
              <div className="flex justify-between items-center">
                <span className="font-display text-base text-white">Total</span>
                <span className="font-display text-xl text-amber-400">{fmt(total)}</span>
              </div>
              {paymentMode === 'abono' && (
                <div className="flex justify-between items-center pt-1">
                  <span className="font-mono-custom text-[10px] text-amber-400/70 uppercase tracking-wider">Pagas hoy</span>
                  <span className="font-display text-lg text-amber-400">{fmt(primerPago)}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── OTP WhatsApp ── */}
          {otpStep === 'form' && (
            <div>
              {otpError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 mb-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{otpError}</p>
                </div>
              )}
              <button
                onClick={handleSendOtp}
                disabled={otpSending}
                className="w-full py-4 rounded-2xl bg-amber-400 text-[#06090f] font-display text-base uppercase tracking-[0.15em] hover:bg-amber-300 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {otpSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
                {otpSending ? 'Enviando...' : 'Verificar por WhatsApp'}
              </button>
              <p className="text-center font-mono-custom text-[9px] text-white/25 mt-2">Te enviaremos un código de confirmación</p>
            </div>
          )}

          {/* ── Ingresa código OTP ── */}
          {otpStep === 'otp' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-display text-sm text-white">Código enviado por WhatsApp</p>
                  <p className="text-xs text-white/45 mt-0.5">Revisa tu WhatsApp en <span className="text-white/70">{buyerPhone}</span></p>
                </div>
              </div>
              <div>
                <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Código de verificación *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className={`${inputClass} text-center text-2xl tracking-[0.5em] font-display`}
                  autoFocus
                />
              </div>
              {otpError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{otpError}</p>
                </div>
              )}
              <button
                onClick={handleVerifyOtp}
                disabled={otpVerifying || otpCode.length < 4}
                className="w-full py-4 rounded-2xl bg-amber-400 text-[#06090f] font-display text-base uppercase tracking-[0.15em] hover:bg-amber-300 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {otpVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {otpVerifying ? 'Verificando...' : 'Confirmar código'}
              </button>
              <button
                onClick={handleResendOtp}
                disabled={countdown > 0 || otpSending}
                className="w-full py-2 text-xs text-white/40 hover:text-white/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {countdown > 0 ? `Reenviar en ${countdown}s` : 'Reenviar código'}
              </button>
            </div>
          )}

          {/* ── Verificado → Pagar ── */}
          {otpStep === 'verified' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-green-500/25 bg-green-500/8 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="font-display text-sm text-white">WhatsApp verificado</p>
                  <p className="text-xs text-white/45">{buyerPhone}</p>
                </div>
              </div>
              {paymentError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{paymentError}</p>
                </div>
              )}
              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-amber-400 text-[#06090f] font-display text-base uppercase tracking-[0.15em] hover:bg-amber-300 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                {isSubmitting ? 'Procesando...' : `Pagar ${fmt(primerPago)}`}
              </button>
              <p className="text-center font-mono-custom text-[9px] text-white/25">Serás redirigido a Bold para el pago seguro</p>
            </div>
          )}

        </div>{/* end scroll body */}
      </div>
    </div>
  );
};

export default CabanaReserve;
