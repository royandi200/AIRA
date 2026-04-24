import { useState, useEffect } from 'react';
import { X, Star, Bus, Plus, Minus, Loader2, CreditCard, ChevronRight, AlertCircle } from 'lucide-react';

interface AddOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'vip' | 'transport' | null;
}

const CONFIG = {
  vip: {
    icon:        <Star className="w-6 h-6"/>,
    title:       'Pass VIP',
    subtitle:    'Acceso exclusivo VIP en todos los escenarios AIRA',
    price:       450_000,
    color:       '#f59e0b',
    colorLight:  'rgba(245,158,11,0.12)',
    colorBorder: 'rgba(245,158,11,0.25)',
    features: [
      'Zona VIP Yate · After Fiesta',
      'Zona VIP Majestic · Día 2',
      'Zona VIP Stage Joinn · Día 2',
      'Open Deck VIP · Día 3',
      'Acceso prioritario sin fila',
    ],
  },
  transport: {
    icon:        <Bus className="w-6 h-6"/>,
    title:       'Transporte',
    subtitle:    'Bus directo ida y vuelta Medellín → Guatapé',
    price:       180_000,
    color:       '#60a5fa',
    colorLight:  'rgba(96,165,250,0.10)',
    colorBorder: 'rgba(96,165,250,0.22)',
    features: [
      'Salida Medellín 7:00am · Retorno 2:00am',
      'Bus cómodo aire acondicionado',
      'Punto de encuentro confirmado por WhatsApp',
      'Cupo limitado',
    ],
  },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const ABONO_PLANS = [
  { id: 'full',  label: 'Pago completo', desc: '100% ahora',                pct: 1.00, badge: null },
  { id: 'a50',   label: '2 cuotas',      desc: '50% ahora · 50% antes del evento', pct: 0.50, badge: 'Popular' },
];

export default function AddOnModal({ isOpen, onClose, type }: AddOnModalProps) {
  const [qty,      setQty]      = useState(1);
  const [nombre,   setNombre]   = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [planId,   setPlanId]   = useState('full');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [step,     setStep]     = useState<'detail' | 'form'>('detail');

  // Reset on open
  useEffect(() => {
    if (isOpen) { setStep('detail'); setError(null); setQty(1); }
  }, [isOpen, type]);

  // Lenis stop + interceptar wheel para scroll interno
  useEffect(() => {
    const lenis = (window as any).__lenis;
    if (!isOpen) { lenis?.start(); return; }
    lenis?.stop();

    const onWheel = (e: WheelEvent) => {
      const modal = document.getElementById('addon-modal-body');
      if (modal) { modal.scrollTop += e.deltaY; e.preventDefault(); }
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      lenis?.start();
      window.removeEventListener('wheel', onWheel);
    };
  }, [isOpen]);

  if (!isOpen || !type) return null;

  const cfg     = CONFIG[type];
  const plan    = ABONO_PLANS.find(p => p.id === planId) ?? ABONO_PLANS[0];
  const total   = cfg.price * qty;
  const primer  = Math.ceil(total * plan.pct);

  const handlePay = async () => {
    if (!nombre.trim() || !email.trim() || !phone.trim()) {
      setError('Por favor completa todos los campos.'); return;
    }
    setLoading(true); setError(null);
    try {
      const totalAmt   = cfg.price * qty;
      const isAbono    = planId !== 'full';
      const planObj    = ABONO_PLANS.find(p => p.id === planId) ?? ABONO_PLANS[0];
      const primerPago = Math.ceil(totalAmt * planObj.pct);

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Datos del comprador — mismo formato que TicketReserve
          name:  nombre.trim(),
          email: email.trim(),
          phone: phone.trim(),
          docType:   'CC',
          docNumber: null,
          // Evento y ticket
          eventId:     1,
          accessType:  'package',
          ticketLabel: cfg.title,
          qty,
          basePrice:   cfg.price,
          total:       totalAmt,
          // Add-ons no aplican
          addPassVip:       false,
          addTransport:     false,
          transportPassengers: 0,
          // Pago
          paymentMode:        isAbono ? 'abono' : 'full',
          abonoPlan:          isAbono ? planId  : null,
          amountToCharge:     isAbono ? primerPago : totalAmt,
          primerPago:         primerPago,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar');
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setError('No se pudo generar el link de pago. Intenta de nuevo.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(3,6,18,0.88)', backdropFilter: 'blur(20px)' }}
      onClick={onClose}>
      <div
        className="relative w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] border overflow-hidden flex flex-col max-h-[92dvh]"
        style={{ background: '#08101f', borderColor: cfg.colorBorder }}
        onClick={e => e.stopPropagation()}>

        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top,${cfg.colorLight},transparent 60%)` }}/>

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: cfg.colorLight, color: cfg.color }}>
              {cfg.icon}
            </div>
            <div>
              <p className="font-mono-custom text-[9px] uppercase tracking-[0.3em] text-white/40 mb-0.5">AIRA · Guatapé</p>
              <h3 className="font-display text-xl text-white leading-none">{cfg.title}</h3>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/8 transition-colors">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Body */}
        <div id="addon-modal-body" className="relative flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {step === 'detail' ? (
            <>
              {/* Subtitle */}
              <p className="text-white/55 text-sm leading-relaxed">{cfg.subtitle}</p>

              {/* Features */}
              <div className="space-y-2">
                {cfg.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }}/>
                    <span className="text-sm text-white/65">{f}</span>
                  </div>
                ))}
              </div>

              {/* Qty selector */}
              <div>
                <p className="font-mono-custom text-[9px] uppercase tracking-[0.25em] text-white/35 mb-2">Cantidad</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => setQty(q => Math.max(1, q-1))}
                    className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/8 transition-colors">
                    <Minus className="w-4 h-4"/>
                  </button>
                  <span className="font-display text-2xl text-white w-8 text-center">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(10, q+1))}
                    className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/8 transition-colors">
                    <Plus className="w-4 h-4"/>
                  </button>
                  <span className="text-white/30 text-sm ml-2">× {fmt(cfg.price)}</span>
                </div>
              </div>

              {/* Payment plan */}
              <div>
                <p className="font-mono-custom text-[9px] uppercase tracking-[0.25em] text-white/35 mb-2">Forma de pago</p>
                <div className="space-y-2">
                  {ABONO_PLANS.map(p => (
                    <button key={p.id} onClick={() => setPlanId(p.id)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all"
                      style={{
                        borderColor: planId === p.id ? cfg.color : 'rgba(255,255,255,0.08)',
                        background:  planId === p.id ? cfg.colorLight : 'rgba(255,255,255,0.02)',
                      }}>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white/80">{p.label}</span>
                          {p.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{ background: cfg.colorLight, color: cfg.color }}>{p.badge}</span>
                          )}
                        </div>
                        <span className="text-xs text-white/35">{p.desc}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-base" style={{ color: cfg.color }}>
                          {fmt(Math.ceil(total * p.pct))}
                        </p>
                        <p className="text-[10px] text-white/30">primer pago</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button onClick={() => setStep('form')}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-display text-sm uppercase tracking-[0.2em] transition-all active:scale-[0.97]"
                style={{ background: cfg.color, color: '#08101f' }}>
                Continuar <ChevronRight className="w-4 h-4"/>
              </button>
            </>
          ) : (
            <>
              {/* Summary */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/8 bg-white/3">
                <div>
                  <p className="text-sm font-semibold text-white/80">{cfg.title} × {qty}</p>
                  <p className="text-xs text-white/35">{plan.label}</p>
                </div>
                <p className="font-display text-lg" style={{ color: cfg.color }}>
                  {fmt(primer)}
                </p>
              </div>

              {/* Form */}
              <div className="space-y-3">
                {[
                  { label: 'Nombre completo', val: nombre, set: setNombre, type: 'text',  placeholder: 'Tu nombre' },
                  { label: 'Email',           val: email,  set: setEmail,  type: 'email', placeholder: 'tu@email.com' },
                  { label: 'WhatsApp',        val: phone,  set: setPhone,  type: 'tel',   placeholder: '3001234567' },
                ].map(({ label, val, set, type, placeholder }) => (
                  <div key={label}>
                    <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/35 block mb-1">{label}</label>
                    <input type={type} value={val} onChange={e => { set(e.target.value); setError(null); }}
                      placeholder={placeholder}
                      className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-colors"/>
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-red-500/25 bg-red-500/8">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5"/>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep('detail')}
                  className="flex-none px-4 py-3.5 rounded-xl border border-white/10 text-white/50 text-sm hover:bg-white/5 transition-colors">
                  Atrás
                </button>
                <button onClick={handlePay} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-display text-sm uppercase tracking-[0.2em] transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{ background: cfg.color, color: '#08101f' }}>
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin"/>Procesando…</>
                    : <><CreditCard className="w-4 h-4"/>Pagar {fmt(primer)}</>
                  }
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="relative shrink-0 text-center font-mono-custom text-[8px] uppercase tracking-[0.2em] text-white/20 py-3 border-t border-white/6">
          Pago seguro · PSE · Tarjeta · Nequi · Daviplata
        </p>
      </div>
    </div>
  );
}
