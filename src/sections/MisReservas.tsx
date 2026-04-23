import React, { useState, useEffect, useRef } from 'react';
import {
  X, Ticket, CreditCard, CheckCircle, Clock,
  AlertCircle, Download, ChevronDown, ChevronUp,
  Loader2, QrCode, RefreshCw, Calendar, MapPin,
  MessageCircle, ShieldCheck, ArrowLeft,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Abono {
  cuota_number: number; amount: number; due_date: string;
  status: 'pending'|'paid'|'overdue'|'cancelled';
  paid_at: string|null; plan_label: string; total_cuotas: number;
}
interface OrderItem {
  id: number; ticket_name: string; stage_label: string|null;
  quantity: number; unit_price: number; is_vip: number; qr_code: string|null;
}
interface Order {
  id: number; order_ref: string; status: string;
  payment_mode: 'full'|'abono'; total: number;
  created_at: string; paid_at: string|null;
  buyer_name: string; buyer_phone: string;
  event_name: string; event_date: string; venue: string; city: string;
  items: OrderItem[]; abonos: Abono[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'});

const STATUS_MAP: Record<string,{label:string;color:string;bg:string;icon:React.ReactNode}> = {
  pending: {label:'Pendiente', color:'text-yellow-400',  bg:'bg-yellow-400/10',  icon:<Clock className="w-3.5 h-3.5"/>},
  partial: {label:'En abonos', color:'text-blue-400',    bg:'bg-blue-400/10',    icon:<CreditCard className="w-3.5 h-3.5"/>},
  paid:    {label:'Pagado',    color:'text-emerald-400', bg:'bg-emerald-400/10', icon:<CheckCircle className="w-3.5 h-3.5"/>},
  overdue: {label:'Vencido',   color:'text-red-400',     bg:'bg-red-400/10',     icon:<AlertCircle className="w-3.5 h-3.5"/>},
};

// ─── OTP Step ─────────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  {code:'57', flag:'🇨🇴', digits:10},
  {code:'1',  flag:'🇺🇸', digits:10},
  {code:'34', flag:'🇪🇸', digits:9 },
  {code:'52', flag:'🇲🇽', digits:10},
  {code:'54', flag:'🇦🇷', digits:10},
  {code:'56', flag:'🇨🇱', digits:9 },
];

type AuthMethod = 'phone' | 'email';
type OtpSubStep = 'input' | 'code';

function AuthStep({ onVerified }: { onVerified: (identifier: string) => void }) {
  const [method,      setMethod]      = useState<AuthMethod>('phone');
  const [subStep,     setSubStep]     = useState<OtpSubStep>('input');
  const [countryCode, setCountryCode] = useState('57');
  const [localPhone,  setLocalPhone]  = useState('');
  const [email,       setEmail]       = useState('');
  const [digits,      setDigits]      = useState(['','','','','','']);
  const [sending,     setSending]     = useState(false);
  const [verifying,   setVerifying]   = useState(false);
  const [error,       setError]       = useState<string|null>(null);
  const [countdown,   setCountdown]   = useState(0);
  const inputRefs = useRef<(HTMLInputElement|null)[]>([]);

  const selectedCountry = COUNTRY_CODES.find(c=>c.code===countryCode) || COUNTRY_CODES[0];
  const digitsOnly = localPhone.replace(/\D/g,'');
  const fullPhone  = `${countryCode}${digitsOnly}`;
  const phoneValid = digitsOnly.length === selectedCountry.digits;
  const emailValid = email.includes('@') && email.includes('.');

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(()=>setCountdown(c=>c-1), 1000);
    return ()=>clearTimeout(t);
  }, [countdown]);

  const sendOtp = async () => {
    setSending(true); setError(null);
    try {
      const res = await fetch('/api/otp-reservas-enviar', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(method==='phone' ? {phone:fullPhone} : {email:email.trim()}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Error al enviar código');
      setSubStep('code'); setCountdown(60); setDigits(['','','','','','']);
    } catch(e:any) { setError(e.message); }
    finally { setSending(false); }
  };

  const verifyOtp = async () => {
    const code = digits.join('');
    if (code.length < 6) { setError('Ingresa los 6 dígitos'); return; }
    setVerifying(true); setError(null);
    try {
      const res = await fetch('/api/otp-reservas-verificar', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(method==='phone'
          ? {phone:fullPhone, otp:code}
          : {email:email.trim(), otp:code}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Código incorrecto');
      onVerified(method==='phone' ? fullPhone : email.trim());
    } catch(e:any) { setError(e.message); }
    finally { setVerifying(false); }
  };

  const handleDigit = (idx:number, val:string) => {
    const v = val.replace(/\D/g,'').slice(-1);
    const next = [...digits]; next[idx]=v; setDigits(next); setError(null);
    if (v && idx<5) inputRefs.current[idx+1]?.focus();
  };
  const handleKeyDown = (idx:number, e:React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key==='Backspace' && !digits[idx] && idx>0) inputRefs.current[idx-1]?.focus();
  };
  const handlePaste = (e:React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6).split('');
    const next=[...digits]; p.forEach((d,i)=>{if(i<6)next[i]=d;}); setDigits(next);
  };

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-aira-lime/50 transition-all";

  if (subStep === 'code') return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-aira-blue/20 border border-aira-blue/30 flex items-center justify-center mx-auto mb-4">
          {method==='phone' ? <MessageCircle className="w-7 h-7 text-aira-blue"/> : <ShieldCheck className="w-7 h-7 text-aira-blue"/>}
        </div>
        <p className="font-mono-custom text-[9px] uppercase tracking-[0.3em] text-aira-lime/70 mb-1">Código de verificación</p>
        <p className="text-sm text-white/60">
          Enviamos un código a{' '}
          <span className="text-white/80 font-mono-custom text-xs">
            {method==='phone' ? `+${fullPhone}` : email}
          </span>
        </p>
      </div>

      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {digits.map((d,i)=>(
          <input key={i} ref={el=>{inputRefs.current[i]=el;}}
            type="text" inputMode="numeric" maxLength={1} value={d}
            onChange={e=>handleDigit(i,e.target.value)}
            onKeyDown={e=>handleKeyDown(i,e)}
            className={`w-11 h-14 rounded-xl border text-center text-xl font-mono-custom text-white bg-white/[0.05] focus:outline-none transition-all ${
              error?'border-red-500/50 bg-red-500/5':d?'border-aira-lime/50 bg-aira-lime/5':'border-white/15 focus:border-aira-lime/40'
            }`}/>
        ))}
      </div>

      {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      <button onClick={verifyOtp} disabled={verifying||digits.join('').length<6}
        className="w-full py-3.5 rounded-2xl bg-aira-lime text-aira-darkBlue font-display text-sm uppercase tracking-[0.2em] hover:bg-white active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-40">
        {verifying ? <><Loader2 className="w-4 h-4 animate-spin"/>Verificando…</> : <><ShieldCheck className="w-4 h-4"/>Verificar</>}
      </button>

      <div className="flex items-center justify-between">
        <button onClick={()=>{setSubStep('input');setError(null);setDigits(['','','','','','']);}}
          className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors">
          <ArrowLeft className="w-3 h-3"/>Volver
        </button>
        {countdown>0
          ? <p className="font-mono-custom text-[10px] text-white/30">Reenviar en {countdown}s</p>
          : <button onClick={sendOtp} disabled={sending}
              className="flex items-center gap-1 text-xs text-aira-lime/70 hover:text-aira-lime transition-colors">
              <RefreshCw className="w-3 h-3"/>Reenviar
            </button>
        }
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-aira-lime/10 border border-aira-lime/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🎫</span>
        </div>
        <p className="font-mono-custom text-[9px] uppercase tracking-[0.3em] text-aira-lime/70 mb-1">Accede a tus reservas</p>
        <p className="text-sm text-white/50">Verifica tu identidad para ver tus boletas y pagar cuotas</p>
      </div>

      {/* Method selector */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
        {(['phone','email'] as AuthMethod[]).map(m=>(
          <button key={m} onClick={()=>{setMethod(m);setError(null);}}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              method===m ? 'bg-aira-lime text-aira-darkBlue' : 'text-white/40 hover:text-white/60'
            }`}>
            {m==='phone' ? '📱 WhatsApp' : '📧 Email'}
          </button>
        ))}
      </div>

      {method==='phone' ? (
        <div>
          <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Celular WhatsApp</label>
          <div className="flex gap-2">
            <select value={countryCode} onChange={e=>{setCountryCode(e.target.value);setLocalPhone('');}}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white focus:outline-none focus:border-aira-lime/50 transition-all"
              style={{minWidth:'80px'}}>
              {COUNTRY_CODES.map(c=>(
                <option key={c.code} value={c.code} style={{background:'#08101f'}}>
                  {c.flag} +{c.code}
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <input type="tel" value={localPhone}
                onChange={e=>{setLocalPhone(e.target.value.replace(/\D/g,'').slice(0,selectedCountry.digits));setError(null);}}
                onKeyDown={e=>e.key==='Enter'&&phoneValid&&sendOtp()}
                placeholder={'0'.repeat(selectedCountry.digits)}
                className={`${inputClass} pr-12`} autoFocus inputMode="tel"/>
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono-custom text-[10px] transition-colors ${
                digitsOnly.length===selectedCountry.digits?'text-aira-lime':'text-white/25'
              }`}>{digitsOnly.length}/{selectedCountry.digits}</span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5 block">Correo electrónico</label>
          <input type="email" value={email}
            onChange={e=>{setEmail(e.target.value);setError(null);}}
            onKeyDown={e=>e.key==='Enter'&&emailValid&&sendOtp()}
            placeholder="tu@email.com" className={inputClass} autoFocus/>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button onClick={sendOtp}
        disabled={sending||(method==='phone'?!phoneValid:!emailValid)}
        className="w-full py-3.5 rounded-2xl bg-aira-lime text-aira-darkBlue font-display text-sm uppercase tracking-[0.2em] hover:bg-white active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
        {sending
          ? <><Loader2 className="w-4 h-4 animate-spin"/>Enviando código…</>
          : <><MessageCircle className="w-4 h-4"/>Enviar código</>}
      </button>

      <p className="text-center font-mono-custom text-[9px] text-white/25 uppercase tracking-[0.2em]">
        Código válido por 10 minutos · sin contraseñas
      </p>
    </div>
  );
}

// ─── QR Display ───────────────────────────────────────────────────────────────
function QRDisplay({ qrCode }: { qrCode: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`;
  return (
    <div className="flex flex-col items-center gap-2">
      <img src={qrUrl} alt="QR Boleta" className="w-28 h-28 rounded-xl border border-white/10"/>
      <a href={qrUrl} download={`QR-AIRA-${qrCode.slice(0,8)}.png`} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[10px] text-aira-lime/80 hover:text-aira-lime transition-colors">
        <Download className="w-3 h-3"/>Descargar QR
      </a>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const [paying,   setPaying]   = useState(false);
  const [payError, setPayError] = useState<string|null>(null);

  const st         = STATUS_MAP[order.status] || STATUS_MAP.pending;
  const paidCuotas = order.abonos.filter(a=>a.status==='paid').length;
  const totalCuotas= order.abonos[0]?.total_cuotas || 0;
  const nextCuota  = order.abonos.find(a=>a.status==='pending'||a.status==='overdue');
  const totalPaid  = order.abonos.filter(a=>a.status==='paid').reduce((s,a)=>s+a.amount,0);
  const allQrs     = order.items.filter(i=>i.qr_code);

  const payCuota = async () => {
    setPaying(true); setPayError(null);
    try {
      const res = await fetch('/api/pay-cuota', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({orderRef:order.order_ref}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Error al generar link');
      window.location.href = data.paymentUrl;
    } catch(e:any) { setPayError(e.message); }
    finally { setPaying(false); }
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      order.status==='overdue' ? 'border-red-500/30 bg-red-500/5' :
      order.status==='paid'    ? 'border-emerald-500/20 bg-emerald-500/5' :
      order.status==='partial' ? 'border-blue-500/20 bg-blue-500/5' :
                                  'border-white/10 bg-white/[0.03]'
    }`}>
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs text-white/50">{order.order_ref}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.bg} ${st.color}`}>
              {st.icon}{st.label}
            </span>
          </div>
          <p className="font-display text-base text-white leading-tight">{order.event_name}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[10px] text-white/40 flex items-center gap-1"><MapPin className="w-3 h-3"/>{order.venue} · {order.city}</span>
            <span className="text-[10px] text-white/40 flex items-center gap-1"><Calendar className="w-3 h-3"/>{fmtDate(order.event_date)}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-lg text-aira-lime">{fmt(order.total)}</p>
          {order.payment_mode==='abono' && totalCuotas>0 && (
            <p className="text-[10px] text-white/40 mt-0.5">{paidCuotas}/{totalCuotas} cuotas</p>
          )}
        </div>
      </div>

      {/* Progress */}
      {order.payment_mode==='abono' && totalCuotas>0 && (
        <div className="px-4 pb-3">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-aira-lime rounded-full transition-all duration-500"
              style={{width:`${(paidCuotas/totalCuotas)*100}%`}}/>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-white/30">Pagado: {fmt(totalPaid)}</span>
            <span className="text-[9px] text-white/30">Pendiente: {fmt(order.total-totalPaid)}</span>
          </div>
        </div>
      )}

      {/* Próxima cuota */}
      {nextCuota && (
        <div className="px-4 pb-3 space-y-2">
          <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
            nextCuota.status==='overdue' ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5 border border-white/8'
          }`}>
            <div>
              <p className="text-xs text-white/70 font-semibold">Cuota {nextCuota.cuota_number} de {nextCuota.total_cuotas}</p>
              <p className={`text-[10px] mt-0.5 ${nextCuota.status==='overdue'?'text-red-400':'text-white/40'}`}>
                {nextCuota.status==='overdue'?'⚠ Vencida · ':'Vence: '}{fmtDate(nextCuota.due_date)}
              </p>
            </div>
            <p className="font-display text-base text-aira-lime">{fmt(nextCuota.amount)}</p>
          </div>
          <button onClick={payCuota} disabled={paying}
            className="w-full py-3 rounded-xl bg-aira-lime text-aira-darkBlue font-display text-sm uppercase tracking-[0.2em] hover:bg-white active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {paying ? <><Loader2 className="w-4 h-4 animate-spin"/>Generando…</> : <><CreditCard className="w-4 h-4"/>Pagar cuota {nextCuota.cuota_number}</>}
          </button>
          {payError && <p className="text-xs text-red-400 text-center">{payError}</p>}
        </div>
      )}

      {/* QRs */}
      {order.status==='paid' && allQrs.length>0 && (
        <div className="px-4 pb-4">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-3">Tu{allQrs.length>1?'s':''} boleta{allQrs.length>1?'s':''}</p>
          <div className="flex flex-wrap gap-4">
            {order.items.map(item=>item.qr_code?(
              <div key={item.id} className="flex flex-col items-center gap-1.5">
                <QRDisplay qrCode={item.qr_code}/>
                <p className="text-[10px] text-white/50 text-center">{item.ticket_name}{item.is_vip?' · VIP':''}<br/>×{item.quantity}</p>
              </div>
            ):null)}
          </div>
        </div>
      )}

      {/* Historial */}
      {order.payment_mode==='abono' && order.abonos.length>0 && (
        <>
          <button onClick={()=>setExpanded(v=>!v)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] text-white/40 hover:text-white/60 transition-colors">
            <span className="text-[10px] uppercase tracking-widest font-semibold">Historial de cuotas</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
          </button>
          {expanded && (
            <div className="px-4 pb-4 space-y-1.5">
              {order.abonos.map(ab=>(
                <div key={ab.cuota_number}
                  className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${ab.status==='paid'?'bg-emerald-400':ab.status==='overdue'?'bg-red-400 animate-pulse':'bg-white/20'}`}/>
                    <span className="text-xs text-white/70">Cuota {ab.cuota_number}</span>
                    <span className={`text-[10px] ${ab.status==='paid'?'text-emerald-400':ab.status==='overdue'?'text-red-400':'text-white/40'}`}>
                      {ab.status==='paid'?'Pagada':ab.status==='overdue'?'Vencida':'Pendiente'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-white/80 tabular-nums">{fmt(ab.amount)}</p>
                    <p className="text-[9px] text-white/30">
                      {ab.status==='paid'&&ab.paid_at?`Pagada ${fmtDate(ab.paid_at)}`:`Vence ${fmtDate(ab.due_date)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── MODAL PRINCIPAL ──────────────────────────────────────────────────────────
interface MisReservasProps { isOpen: boolean; onClose: () => void; }

export default function MisReservas({ isOpen, onClose }: MisReservasProps) {
  const [verified,  setVerified]  = useState(false);
  const [identifier,setIdentifier]= useState('');
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string|null>(null);

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) { setVerified(false); setIdentifier(''); setOrders([]); setError(null); }
  }, [isOpen]);

  // Cargar órdenes tras verificar
  const handleVerified = async (id: string) => {
    setIdentifier(id); setVerified(true); setLoading(true); setError(null);
    try {
      const isEmail = id.includes('@');
      const res = await fetch('/api/mis-reservas', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(isEmail ? {email:id} : {phone:id}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Error al cargar reservas');
      setOrders(data.orders||[]);
    } catch(e:any) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4 md:p-6"
      style={{background:'rgba(3,6,18,0.85)',backdropFilter:'blur(20px)'}}
      onClick={onClose}>
      <div role="dialog" aria-modal="true"
        className="relative w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] border border-white/10 bg-[#08101f] shadow-2xl flex flex-col max-h-[92dvh]"
        onClick={e=>e.stopPropagation()}>

        {/* Glow */}
        <div className="absolute inset-0 opacity-20 pointer-events-none rounded-[inherit]" style={{
          background:'radial-gradient(circle at top right,rgba(225,254,82,0.2),transparent 35%),' +
                     'radial-gradient(circle at left center,rgba(0,79,255,0.15),transparent 35%)',
        }}/>

        {/* Header */}
        <div className="relative z-10 flex-none border-b border-white/10 px-5 py-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {verified && (
              <button onClick={()=>{setVerified(false);setOrders([]);}}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0">
                <ArrowLeft className="w-4 h-4"/>
              </button>
            )}
            <div>
              <p className="font-mono-custom text-[10px] uppercase tracking-[0.35em] text-aira-lime/70 mb-0.5">AIRA · Guatapé</p>
              <h3 className="font-display text-2xl text-white leading-none">Mis Reservas</h3>
            </div>
          </div>
          <button onClick={onClose}
            className="flex-none w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Body */}
        <div className="relative z-10 flex-1 overflow-y-auto p-5 md:p-6">
          {!verified ? (
            <AuthStep onVerified={handleVerified}/>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-aira-lime animate-spin"/>
              <p className="text-sm text-white/50">Cargando tus reservas…</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5"/>
              <div>
                <p className="text-sm text-red-400 font-semibold">{error}</p>
                <button onClick={()=>{setVerified(false);setError(null);}}
                  className="text-xs text-white/40 hover:text-white/60 mt-1 transition-colors">
                  Intentar con otro número / email
                </button>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
              <Ticket className="w-8 h-8 text-white/20 mx-auto mb-3"/>
              <p className="text-sm font-semibold text-white/70 mb-1">Sin reservas encontradas</p>
              <p className="text-xs text-white/40 mb-4">No encontramos reservas asociadas a este contacto.</p>
              <button onClick={()=>setVerified(false)}
                className="text-xs text-aira-lime/70 hover:text-aira-lime transition-colors underline underline-offset-2">
                Intentar con otro número / email
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/40 uppercase tracking-widest">
                  {orders.length} reserva{orders.length>1?'s':''} · {identifier}
                </p>
              </div>
              {orders.map(order=><OrderCard key={order.order_ref} order={order}/>)}
            </div>
          )}
        </div>

        <p className="relative z-10 flex-none text-center font-mono-custom text-[8px] uppercase tracking-[0.2em] text-white/20 py-3 border-t border-white/[0.06]">
          Pago seguro · PSE · Tarjeta · Nequi · Daviplata
        </p>
      </div>
    </div>
  );
}
