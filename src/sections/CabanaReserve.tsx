import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X, Check, Home, Users, Waves, Eye, Star, Bus,
  Minus, Plus, Loader2, CreditCard, CalendarClock,
  AlertCircle, MessageCircle, RefreshCw, ShieldCheck,
  Lock,
} from 'lucide-react';

interface CabanaReserveProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Etapas de precio (misma lógica que TicketReserve) ──────────────────────
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
  return d ? now > d.end : false;
}

const CABANA_STAGES = [
  { id: 'creyentes', label: 'Creyentes',  price: 4_200_000, slots: 2,  dates: '15 ABR – 5 MAY', locked: true  },
  { id: 'referidos', label: 'Referidos',  price: 4_600_000, slots: 2,  dates: '15 ABR – 5 MAY', locked: false },
  { id: 'primera',   label: '1ª Etapa',   price: 4_900_000, slots: 3,  dates: '5 MAY – 5 JUN',  locked: false },
  { id: 'segunda',   label: '2ª Etapa',   price: 5_200_000, slots: 3,  dates: '5 JUN – 5 JUL',  locked: false },
  { id: 'tercera',   label: '3ª Etapa',   price: 5_500_000, slots: 2,  dates: '5 JUL – 15 AGO', locked: false, urgent: true },
];

const VISIBLE_STAGES = CABANA_STAGES.filter(s => !isStagePast(s.id));

const TRANSPORT_PRICE = 150_000;

const ABONO_PLANS = [
  { id: 'a50', label: '2 cuotas', pct: 0.50, desc: '50% ahora · 50% antes del evento',          badge: 'Popular' },
  { id: 'a33', label: '3 cuotas', pct: 0.33, desc: '33% ahora · 33% · 33% antes del evento',   badge: null },
  { id: 'a25', label: '4 cuotas', pct: 0.25, desc: '25% ahora · resto en 3 cuotas',             badge: null },
];

type PaymentMode = 'full' | 'abono';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// ── Country codes ──────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '57',  flag: '🇨🇴', name: 'Colombia',     digits: 10 },
  { code: '1',   flag: '🇺🇸', name: 'USA / Canadá', digits: 10 },
  { code: '34',  flag: '🇪🇸', name: 'España',       digits: 9  },
  { code: '52',  flag: '🇲🇽', name: 'México',       digits: 10 },
  { code: '54',  flag: '🇦🇷', name: 'Argentina',    digits: 10 },
  { code: '56',  flag: '🇨🇱', name: 'Chile',        digits: 9  },
  { code: '51',  flag: '🇵🇪', name: 'Perú',         digits: 9  },
  { code: '593', flag: '🇪🇨', name: 'Ecuador',      digits: 9  },
  { code: '58',  flag: '🇻🇪', name: 'Venezuela',    digits: 10 },
  { code: '55',  flag: '🇧🇷', name: 'Brasil',       digits: 11 },
  { code: '44',  flag: '🇬🇧', name: 'Reino Unido',  digits: 10 },
];

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

// ── Creyentes OTP inline (igual que TicketReserve) ─────────────────────────
interface CreyentesOtpStepProps {
  onVerified: () => void;
  onCancel: () => void;
}

function CreyentesOtpStep({ onVerified, onCancel }: CreyentesOtpStepProps) {
  const [subStep,     setSubStep]     = useState<'phone' | 'otp'>('phone');
  const [countryCode, setCountryCode] = useState('57');
  const [localPhone,  setLocalPhone]  = useState('');
  const [digits,      setDigits]      = useState(['', '', '', '', '', '']);
  const [sending,     setSending]     = useState(false);
  const [verifying,   setVerifying]   = useState(false);
  const [resending,   setResending]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState(false);
  const [countdown,   setCountdown]   = useState(60);
  const [canResend,   setCanResend]   = useState(false);
  const inputRefs = Array.from({ length: 6 }, () => null as HTMLInputElement | null);

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) ?? COUNTRY_CODES[0];
  const digitsOnly = localPhone.replace(/\D/g, '');
  const fullPhone  = `${countryCode}${digitsOnly}`;
  const isPhoneValid = digitsOnly.length === selectedCountry.digits;

  useEffect(() => {
    if (subStep !== 'otp') return;
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [subStep, countdown]);

  const handleSendOtp = async () => {
    if (!isPhoneValid) { setError(`Ingresa exactamente ${selectedCountry.digits} dígitos.`); return; }
    setSending(true); setError(null);
    try {
      const res = await fetch('/api/otp-creyentes-enviar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo enviar el código.'); return; }
      setSubStep('otp'); setCountdown(60); setCanResend(false); setDigits(['', '', '', '', '', '']);
    } catch { setError('Error de conexión.'); } finally { setSending(false); }
  };

  const handleDigit = (idx: number, val: string) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits]; next[idx] = v; setDigits(next); setError(null);
    if (v && idx < 5) { const ref = inputRefs[idx + 1]; if (ref) ref.focus(); }
  };
  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) { const ref = inputRefs[idx - 1]; if (ref) ref.focus(); }
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    const next = [...digits]; pasted.forEach((d, i) => { if (i < 6) next[i] = d; }); setDigits(next);
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < 6) { setError('Ingresa los 6 dígitos.'); return; }
    setVerifying(true); setError(null);
    try {
      const res = await fetch('/api/otp-creyentes-verificar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Código incorrecto.'); return; }
      setSuccess(true); setTimeout(() => onVerified(), 700);
    } catch { setError('Error de conexión.'); } finally { setVerifying(false); }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResending(true); setError(null);
    try {
      const res = await fetch('/api/otp-creyentes-enviar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo reenviar.'); return; }
      setDigits(['', '', '', '', '', '']); setCountdown(60); setCanResend(false);
    } catch { setError('Error al reenviar.'); } finally { setResending(false); }
  };

  const inputCls = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 focus:bg-white/[0.06] transition-all';

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
          {success ? <ShieldCheck className="w-5 h-5 text-amber-400" /> : <MessageCircle className="w-5 h-5 text-amber-400" />}
        </div>
        <div>
          <p className="font-mono-custom text-[9px] uppercase tracking-[0.28em] text-amber-400/80">Etapa Creyentes · Verificación</p>
          <p className="font-display text-base text-white leading-tight">
            {subStep === 'phone' ? 'Ingresa tu WhatsApp' : 'Código de verificación'}
          </p>
        </div>
      </div>

      {success ? (
        <div className="flex flex-col items-center gap-2 py-3">
          <ShieldCheck className="w-8 h-8 text-amber-400" />
          <p className="font-display text-lg text-white">¡Verificado! ✅</p>
          <p className="text-xs text-white/50">Desbloqueando etapa Creyentes…</p>
        </div>
      ) : subStep === 'phone' ? (
        <>
          <p className="text-xs text-white/50 leading-relaxed">
            La etapa <span className="text-amber-400">Creyentes</span> está reservada para asistentes verificados de Melomania.
          </p>
          <div>
            <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Celular WhatsApp *</label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={e => { setCountryCode(e.target.value); setLocalPhone(''); setError(null); }}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white focus:outline-none focus:border-amber-400/50 transition-all cursor-pointer shrink-0"
                style={{ minWidth: '90px' }}
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code} style={{ background: '#06090f' }}>{c.flag} +{c.code}</option>
                ))}
              </select>
              <div className="relative flex-1">
                <input
                  type="tel" value={localPhone}
                  onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, selectedCountry.digits); setLocalPhone(v); setError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  placeholder={`${'0'.repeat(selectedCountry.digits)}`}
                  maxLength={selectedCountry.digits}
                  className={`${inputCls} pr-12`}
                  autoFocus inputMode="tel"
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono-custom text-[10px] ${digitsOnly.length === selectedCountry.digits ? 'text-amber-400' : 'text-white/25'}`}>
                  {digitsOnly.length}/{selectedCountry.digits}
                </span>
              </div>
            </div>
          </div>
          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5"><p className="text-sm text-red-400">{error}</p></div>}
          <div className="flex gap-2 pt-1">
            <button className="px-4 py-2.5 rounded-full border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors" onClick={onCancel} disabled={sending}>Cancelar</button>
            <button
              className="flex-1 px-5 py-2.5 rounded-full bg-amber-400 text-[#06090f] font-display text-sm uppercase tracking-[0.2em] hover:bg-amber-300 active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSendOtp} disabled={sending || !isPhoneValid}
            >
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : <><MessageCircle className="w-4 h-4" /> Enviar código</>}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-white/50">
            Código enviado a <span className="text-white/70 font-mono-custom">+{countryCode} {localPhone.slice(0,-4).replace(/./g,'*')}{localPhone.slice(-4)}</span>
          </p>
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input key={i} ref={el => { inputRefs[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={e => handleDigit(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
                className={`w-10 rounded-xl border text-center text-lg font-mono-custom text-white bg-white/[0.05] focus:outline-none transition-all ${
                  error ? 'border-red-500/50 bg-red-500/5' : d ? 'border-amber-400/50 bg-amber-400/5' : 'border-white/15 focus:border-amber-400/40 focus:bg-white/[0.07]'
                }`} style={{ height: '3.25rem' }} aria-label={`Dígito ${i + 1}`}
              />
            ))}
          </div>
          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5"><p className="text-sm text-red-400">{error}</p></div>}
          <button
            className="w-full px-5 py-3 rounded-full bg-amber-400 text-[#06090f] font-display text-sm uppercase tracking-[0.2em] hover:bg-amber-300 active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleVerify} disabled={verifying || digits.join('').length < 6}
          >
            {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando…</> : <><ShieldCheck className="w-4 h-4" /> Verificar acceso</>}
          </button>
          <div className="flex justify-between items-center">
            <button className="text-xs text-white/40 hover:text-white/60 transition-colors" onClick={() => { setSubStep('phone'); setError(null); setDigits(['', '', '', '', '', '']); setLocalPhone(''); }}>← Cambiar número</button>
            {canResend
              ? <button className="flex items-center gap-1 text-xs text-amber-400/80 hover:text-amber-400 transition-colors disabled:opacity-50" onClick={handleResend} disabled={resending}>
                  {resending ? <><Loader2 className="w-3 h-3 animate-spin" /> Reenviando…</> : <><RefreshCw className="w-3 h-3" /> Reenviar</>}
                </button>
              : <p className="font-mono-custom text-[9px] text-white/30">Reenviar en <span className="text-white/50">{countdown}s</span></p>
            }
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

const CabanaReserve = ({ isOpen, onClose }: CabanaReserveProps) => {
  const [step,              setStep]             = useState<1 | 2>(1); // 1=elegir etapa, 2=confirmar
  const [selectedStageId,   setSelectedStageId]  = useState<string | null>(null);
  const [creyentesOtpOpen,  setCreyentesOtpOpen] = useState(false);
  const [creyentesVerified, setCreyentesVerified]= useState(false);

  const [addTransport,  setAddTransport]  = useState(false);
  const [codigoRef,     setCodigoRef]      = useState('');
  const [codigoError,   setCodigoError]    = useState('');
  const [codigoValid,   setCodigoValid]    = useState(false);
  const [codigoChecking,setCodigoChecking] = useState(false);
  const [qty,           setQty]           = useState(7);
  const [paymentMode,   setPaymentMode]   = useState<PaymentMode>('full');
  const [abonoPlanId,   setAbonoPlanId]   = useState(ABONO_PLANS[0].id);
  const [buyerName,     setBuyerName]     = useState('');
  const [buyerEmail,    setBuyerEmail]    = useState('');
  const [buyerPhone,    setBuyerPhone]    = useState('');
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [paymentError,  setPaymentError]  = useState<string | null>(null);

  useLockBodyScroll(isOpen);

  const scrollRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop    = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      if (atTop    && e.deltaY < 0) { e.stopPropagation(); return; }
      if (atBottom && e.deltaY > 0) { e.stopPropagation(); return; }
      e.stopPropagation(); e.preventDefault(); el.scrollTop += e.deltaY;
    };
    el.addEventListener('wheel', handler, { passive: false });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1); setSelectedStageId(null);
    setCreyentesOtpOpen(false); setCreyentesVerified(false);
    setAddTransport(false); setQty(7);
    setPaymentMode('full'); setAbonoPlanId(ABONO_PLANS[0].id);
    setBuyerName(''); setBuyerEmail(''); setBuyerPhone('');
    setPaymentError(null);
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const selectedStage = useMemo(() => CABANA_STAGES.find(s => s.id === selectedStageId) ?? null, [selectedStageId]);
  const isReferidos = selectedStageId === 'referidos';

  const validateCodigo = async (cod: string) => {
    if (!cod.trim()) { setCodigoValid(false); return; }
    setCodigoChecking(true); setCodigoError(''); setCodigoValid(false);
    try {
      const r = await fetch('/api/referidos-validar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: cod, tipo: 'referidos' }),
      });
      const d = await r.json();
      if (d.valid) { setCodigoValid(true); setCodigoError(''); }
      else { setCodigoValid(false); setCodigoError(d.error || 'Código inválido'); }
    } catch { setCodigoError('Error validando código'); }
    finally { setCodigoChecking(false); }
  };

  const cabanaPrice  = selectedStage?.price ?? 0;
  const serviceFee   = Math.round(cabanaPrice * 0.05);
  const transTotal   = addTransport ? TRANSPORT_PRICE * qty : 0;
  const total        = cabanaPrice + serviceFee + transTotal;
  const selectedPlan = ABONO_PLANS.find(p => p.id === abonoPlanId) ?? ABONO_PLANS[0];
  const primerPago   = paymentMode === 'full' ? total : Math.ceil(total * selectedPlan.pct);

  const handleCheckout = async () => {
    if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()) {
      setPaymentError('Por favor completa nombre, correo y celular.');
      return;
    }
    setIsSubmitting(true); setPaymentError(null);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: buyerName.trim(), email: buyerEmail.trim(), phone: buyerPhone.trim(),
          eventId: 'cabana-aira', accessType: 'cabana',
          ticketLabel: `Cabaña Completa AIRA — ${selectedStage?.label ?? ''} · 3 noches Guatapé`,
          stageLabel: selectedStage?.label ?? null,
          codigoReferido: isReferidos ? codigoRef : undefined,
          qty: 1, basePrice: cabanaPrice,
          addPassVip: false, passVipPrice: 0,
          addTransport, total,
          paymentMode, abonoPlan: paymentMode === 'abono' ? abonoPlanId : null,
          primerPago, amountToCharge: primerPago,
          items: [{ ticketTypeId: 0, quantity: 1, _unitPrice: cabanaPrice, _label: `Cabaña AIRA · ${selectedStage?.label}` }],
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
        role="dialog" aria-modal="true" aria-label="Reserva Cabaña AIRA"
        className="relative w-full sm:max-w-xl rounded-t-[2rem] sm:rounded-[2rem] border border-amber-400/20 bg-[#06090f] shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 opacity-15 pointer-events-none rounded-[inherit]" style={{
          background: 'radial-gradient(circle at top right,rgba(251,191,36,0.3),transparent 50%)',
        }} />

        {/* ── Header ── */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/20 flex items-center justify-center">
              <Home className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-lg text-white leading-none">Cabaña Completa AIRA</h2>
              <p className="font-mono-custom text-[9px] uppercase tracking-[0.25em] text-white/35 mt-0.5">Guatapé · 3 noches · Hasta 7 personas</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:border-white/25 hover:bg-white/5 transition-all" aria-label="Cerrar">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* ── Step pills ── */}
        <div className="relative z-10 flex-none px-6 pt-3 pb-3 flex gap-2 border-b border-white/[0.06]">
          {([{ n: 1, label: 'Etapa' }, { n: 2, label: 'Confirmar' }] as { n: 1 | 2; label: string }[]).map((item, idx) => {
            const active    = step === item.n;
            const completed = step > item.n;
            return (
              <div key={item.n} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${active ? 'border-amber-400/40 bg-amber-400/10' : 'border-white/10 bg-white/[0.03]'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono-custom ${completed ? 'bg-amber-400 text-[#06090f]' : active ? 'bg-amber-400/30 text-amber-300' : 'bg-white/10 text-white/50'}`}>
                  {completed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span className={`font-mono-custom text-[10px] uppercase tracking-[0.22em] ${active ? 'text-white' : 'text-white/45'}`}>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* ── Scroll body ── */}
        <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-6" style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* ──────── STEP 1: Elegir etapa ──────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/35 mb-1">Paso 1</p>
                <h4 className="font-display text-2xl text-white mb-1">Elige tu etapa</h4>
                <p className="text-sm text-white/50 mb-4">El precio varía según la etapa de compra. La cabaña es para hasta 7 personas.</p>
              </div>

              {/* Resumen cabaña */}
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
                <p className="font-mono-custom text-[9px] uppercase tracking-[0.28em] text-white/35">Detalle</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: <Users className="w-4 h-4" />,  label: 'Capacidad', value: 'Hasta 7 personas' },
                    { icon: <Waves className="w-4 h-4" />,  label: 'Ubicación', value: 'Frente al embalse' },
                    { icon: <Eye   className="w-4 h-4" />,  label: 'Vista',     value: 'Vista panorámica' },
                    { icon: <Star  className="w-4 h-4" />,  label: 'Duración',  value: '3 noches' },
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

              {/* Etapas */}
              <div className="space-y-2">
                {VISIBLE_STAGES.map(stage => {
                  const isCreyentes  = stage.id === 'creyentes';
                  const stageDates   = STAGE_DATES[stage.id];
                  const nowTs        = new Date();
                  const isDateActive = stageDates ? nowTs >= stageDates.start && nowTs <= stageDates.end : false;
                  const isUpcoming   = stageDates ? nowTs < stageDates.start : false;
                  const isUnlocked   = isCreyentes
                    ? creyentesVerified && isDateActive
                    : !stage.locked && isDateActive;

                  if (isCreyentes && creyentesOtpOpen) {
                    return (
                      <div key={stage.id}>
                        <CreyentesOtpStep
                          onVerified={() => {
                            setCreyentesVerified(true);
                            setCreyentesOtpOpen(false);
                            setSelectedStageId('creyentes');
                          }}
                          onCancel={() => setCreyentesOtpOpen(false)}
                        />
                      </div>
                    );
                  }

                  return (
                    <button
                      key={stage.id}
                      disabled={!isUnlocked && !isCreyentes}
                      className={'w-full text-left rounded-2xl border p-4 transition-all duration-200 ' + (
                        isUpcoming
                          ? 'border-white/5 bg-white/[0.02] opacity-35 cursor-not-allowed'
                          : isCreyentes && !creyentesVerified
                            ? 'border-amber-400/20 bg-amber-400/5 hover:border-amber-400/40 cursor-pointer opacity-90'
                            : !isUnlocked
                              ? 'border-white/5 bg-white/[0.02] opacity-35 cursor-not-allowed'
                              : selectedStageId === stage.id
                                ? 'border-amber-400/50 bg-amber-400/10 active:scale-[0.99]'
                                : 'border-white/10 bg-white/[0.03] hover:border-white/25 active:scale-[0.99]'
                      )}
                      onClick={() => {
                        if (isUpcoming) return;
                        if (isCreyentes && !creyentesVerified) { setCreyentesOtpOpen(true); }
                        else if (isUnlocked) { setSelectedStageId(stage.id); }
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          {selectedStageId === stage.id && isUnlocked
                            ? <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-[#06090f]" /></div>
                            : isCreyentes && !creyentesVerified
                              ? <Lock className="w-4 h-4 text-amber-400/60 shrink-0" />
                              : null
                          }
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display text-base text-white">{stage.label}</span>
                              {isCreyentes && !creyentesVerified && (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-mono-custom uppercase tracking-[0.15em] bg-amber-400/15 text-amber-400 border border-amber-400/20">🔒 Verificar acceso</span>
                              )}
                              {isCreyentes && creyentesVerified && (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-mono-custom uppercase tracking-[0.15em] bg-amber-400/15 text-amber-400 border border-amber-400/20">✓ Verificado</span>
                              )}
                              {!isCreyentes && stage.locked && (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-mono-custom uppercase tracking-[0.15em] bg-amber-400/15 text-amber-400 border border-amber-400/20">🔒 Solo Melomania</span>
                              )}
                              {(stage as any).urgent && (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-mono-custom uppercase tracking-[0.15em] bg-red-500/15 text-red-400 border border-red-500/20">Últimas {stage.slots}</span>
                              )}
                            </div>
                            <p className="font-mono-custom text-[9px] text-white/40 mt-0.5">{stage.dates} · {stage.slots} cabañas</p>
                          </div>
                        </div>
                        <p className="font-display text-xl text-amber-400 shrink-0">
                          {fmt(stage.price)}<span className="font-mono-custom text-[10px] text-white/40 ml-1">/cabaña</span>
                        </p>
                      </div>
                      {isCreyentes && !creyentesVerified && (
                        <p className="text-[10px] text-amber-400/70 mt-2 flex items-center gap-1.5">
                          <MessageCircle className="w-3 h-3 shrink-0" />
                          Toca para verificar tu acceso vía WhatsApp
                        </p>
                      )}
                      {!isCreyentes && stage.locked && (
                        <p className="text-[10px] text-amber-400/60 mt-2">Disponible para asistentes verificados de Melomania</p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Código referido */}
              {isReferidos && (
                <div className="mt-2">
                  <label className="block font-mono-custom text-[9px] uppercase tracking-[0.28em] text-white/35 mb-2">Código de Referido *</label>
                  <input
                    type="text"
                    value={codigoRef}
                    onChange={e => { setCodigoRef(e.target.value.toUpperCase()); setCodigoError(''); setCodigoValid(false); }}
                    onBlur={e => validateCodigo(e.target.value)}
                    placeholder="EJ: AIRA-XYZ123"
                    className={`w-full rounded-xl border px-4 py-3 bg-white/5 text-white font-mono-custom text-sm tracking-widest uppercase placeholder:text-white/20 outline-none transition-all ${
                      codigoError ? 'border-red-400/50 bg-red-400/5' : codigoValid ? 'border-amber-400/60 bg-amber-400/8' : codigoChecking ? 'border-white/20' : 'border-white/15 focus:border-white/30'
                    }`}
                  />
                  {codigoError && <p className="text-xs text-red-400 mt-1">{codigoError}</p>}
                  {codigoChecking && <p className="text-xs text-white/40 mt-1">Verificando código...</p>}
                  {codigoValid && <p className="text-xs text-amber-400 mt-1">✓ Código válido</p>}
                  <p className="text-[10px] text-white/30 mt-1">Código compartido por tu referido para acceder a esta etapa.</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  disabled={!selectedStageId || (isReferidos && !codigoValid)}
                  className="px-7 py-3 rounded-full bg-amber-400 text-[#06090f] font-display text-sm uppercase tracking-[0.2em] hover:bg-amber-300 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => {
                    if (!selectedStageId) return;
                    if (isReferidos && !codigoValid) { setCodigoError('Ingresa un código válido'); return; }
                    setCodigoError(''); setStep(2);
                  }}
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ──────── STEP 2: Confirmar y pagar ──────── */}
          {step === 2 && selectedStage && (
            <div className="space-y-5">
              <div>
                <p className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/35 mb-1">Paso 2</p>
                <h4 className="font-display text-2xl text-white mb-1">Confirmar y pagar</h4>
                <p className="text-sm text-white/50">Revisa tu pedido y completa tus datos.</p>
              </div>

              {/* Etapa seleccionada */}
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/8 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono-custom text-[9px] uppercase tracking-[0.22em] text-amber-400/70 mb-0.5">Etapa seleccionada</p>
                  <p className="font-display text-lg text-white">{selectedStage.label}</p>
                  <p className="font-mono-custom text-[9px] text-white/40 mt-0.5">{selectedStage.dates}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-2xl text-amber-400">{fmt(selectedStage.price)}</p>
                  <p className="font-mono-custom text-[9px] text-white/40">cabaña completa</p>
                </div>
              </div>

              {/* Transporte */}
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
                      <p className="font-display text-sm text-white">Bus Bogotá → Guatapé</p>
                      {addTransport && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <p className="text-xs text-white/45">{fmt(TRANSPORT_PRICE)} por persona · ida y vuelta</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center hover:border-white/30 transition-all">
                      <Minus className="w-3 h-3 text-white/50" />
                    </button>
                    <span className="font-display text-sm text-white w-4 text-center">{qty}</span>
                    <button onClick={() => setQty(q => Math.min(7, q + 1))} className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center hover:border-white/30 transition-all">
                      <Plus className="w-3 h-3 text-white/50" />
                    </button>
                  </div>
                </button>
              </div>

              {/* Forma de pago */}
              <div className="space-y-3">
                <p className="font-mono-custom text-[9px] uppercase tracking-[0.28em] text-white/35">Forma de pago</p>

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
                      <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2.5 mt-1">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="font-mono-custom text-[9px] text-amber-300/70 leading-relaxed">
                          El cupo queda reservado al realizar el primer abono. Si no se completa el pago total 7 días antes del evento, el cupo se libera sin reembolso del abono.
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

              {/* Resumen total */}
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="font-mono-custom text-[9px] uppercase tracking-[0.28em] text-white/35 mb-3">Resumen</p>
                <div className="space-y-2">
                  {[
                    [`Cabaña AIRA · ${selectedStage.label}`, fmt(cabanaPrice)],
                    ['Fee de servicio (5%)', fmt(serviceFee)],
                    ...(addTransport ? [['Transporte ×' + qty, fmt(TRANSPORT_PRICE * qty)]] : []),
                  ].map(([k, v]) => (
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

              {/* Datos del comprador */}
              <div className="space-y-3">
                <p className="font-mono-custom text-[9px] uppercase tracking-[0.28em] text-white/35 mb-1">Datos del comprador</p>
                <div>
                  <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Nombre completo *</label>
                  <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Tu nombre" className={inputClass} />
                </div>
                <div>
                  <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Correo electrónico *</label>
                  <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="tu@email.com" className={inputClass} />
                </div>
                <div>
                  <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Celular (WhatsApp) *</label>
                  <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="+57 300 000 0000" className={inputClass} />
                </div>
              </div>

              {/* Error pago */}
              {paymentError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{paymentError}</p>
                </div>
              )}

              {/* Botones footer */}
              <div className="flex gap-3 pb-2">
                <button
                  className="px-5 py-3 rounded-full border border-white/10 text-white/70 text-sm hover:bg-white/5 transition-colors"
                  onClick={() => setStep(1)}
                >
                  ← Volver
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={isSubmitting || !buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()}
                  className="flex-1 py-3.5 rounded-2xl bg-amber-400 text-[#06090f] font-display text-base uppercase tracking-[0.15em] hover:bg-amber-300 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Procesando…</> : <><CreditCard className="w-5 h-5" /> Pagar {fmt(primerPago)}</>}
                </button>
              </div>
              <p className="text-center font-mono-custom text-[9px] text-white/25 pb-2">Serás redirigido a Bold para el pago seguro</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CabanaReserve;
