import { useState, useEffect } from 'react';
import React from 'react';
import {
  X, Search, Ticket, CreditCard, CheckCircle, Clock,
  AlertCircle, Download, ChevronDown, ChevronUp,
  Loader2, QrCode, RefreshCw, Calendar, MapPin,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Abono {
  cuota_number: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
  plan_label: string;
  total_cuotas: number;
}
interface OrderItem {
  id: number;
  ticket_name: string;
  stage_label: string | null;
  quantity: number;
  unit_price: number;
  is_vip: number;
  qr_code: string | null;
}
interface Order {
  id: number;
  order_ref: string;
  status: string;
  payment_mode: 'full' | 'abono';
  total: number;
  created_at: string;
  paid_at: string | null;
  buyer_name: string;
  buyer_phone: string;
  event_name: string;
  event_date: string;
  venue: string;
  city: string;
  items: OrderItem[];
  abonos: Abono[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pendiente',  color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: <Clock className="w-3.5 h-3.5"/> },
  partial:  { label: 'En abonos', color: 'text-blue-400',   bg: 'bg-blue-400/10',   icon: <CreditCard className="w-3.5 h-3.5"/> },
  paid:     { label: 'Pagado',    color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: <CheckCircle className="w-3.5 h-3.5"/> },
  overdue:  { label: 'Vencido',   color: 'text-red-400',    bg: 'bg-red-400/10',    icon: <AlertCircle className="w-3.5 h-3.5"/> },
};

const CUOTA_STATUS: Record<string, { color: string; label: string }> = {
  pending: { color: 'text-yellow-400', label: 'Pendiente' },
  paid:    { color: 'text-emerald-400', label: 'Pagada' },
  overdue: { color: 'text-red-400',    label: 'Vencida' },
};

// ─── QR Downloader ────────────────────────────────────────────────────────────
function QRDisplay({ qrCode }: { qrCode: string; ticketName?: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`;
  return (
    <div className="flex flex-col items-center gap-2">
      <img src={qrUrl} alt="QR Boleta" className="w-28 h-28 rounded-xl border border-white/10"/>
      <a href={qrUrl} download={`QR-AIRA-${qrCode.slice(0,8)}.png`} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[10px] text-aira-lime/80 hover:text-aira-lime transition-colors">
        <Download className="w-3 h-3"/> Descargar QR
      </a>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order }: { order: Order }) {
  const [expanded,    setExpanded]    = useState(false);
  const [paying,      setPaying]      = useState(false);
  const [payError,    setPayError]    = useState<string | null>(null);

  const st = STATUS_MAP[order.status] || STATUS_MAP.pending;
  const paidCuotas = order.abonos.filter(a => a.status === 'paid').length;
  const totalCuotas = order.abonos[0]?.total_cuotas || 0;
  const nextCuota   = order.abonos.find(a => a.status === 'pending' || a.status === 'overdue');
  const totalPaid   = order.abonos.filter(a => a.status === 'paid').reduce((s, a) => s + a.amount, 0);
  const allQrs      = order.items.filter(i => i.qr_code);

  const handlePayCuota = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch('/api/pay-cuota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderRef: order.order_ref }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar link de pago');
      window.location.href = data.paymentUrl;
    } catch (err: any) {
      setPayError(err.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
      order.status === 'overdue' ? 'border-red-500/30 bg-red-500/5' :
      order.status === 'paid'    ? 'border-emerald-500/20 bg-emerald-500/5' :
      order.status === 'partial' ? 'border-blue-500/20 bg-blue-500/5' :
                                   'border-white/10 bg-white/[0.03]'
    }`}>

      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs text-white/60">{order.order_ref}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.bg} ${st.color}`}>
              {st.icon}{st.label}
            </span>
          </div>
          <p className="font-display text-base text-white leading-tight">{order.event_name}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[10px] text-white/40 flex items-center gap-1">
              <MapPin className="w-3 h-3"/>{order.venue} · {order.city}
            </span>
            <span className="text-[10px] text-white/40 flex items-center gap-1">
              <Calendar className="w-3 h-3"/>{fmtDate(order.event_date)}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-lg text-aira-lime">{fmt(order.total)}</p>
          {order.payment_mode === 'abono' && totalCuotas > 0 && (
            <p className="text-[10px] text-white/40 mt-0.5">
              {paidCuotas}/{totalCuotas} cuotas pagadas
            </p>
          )}
        </div>
      </div>

      {/* Progress bar para abonos */}
      {order.payment_mode === 'abono' && totalCuotas > 0 && (
        <div className="px-4 pb-3">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-aira-lime rounded-full transition-all duration-500"
              style={{ width: `${(paidCuotas / totalCuotas) * 100}%` }}/>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-white/30">Pagado: {fmt(totalPaid)}</span>
            <span className="text-[9px] text-white/30">Pendiente: {fmt(order.total - totalPaid)}</span>
          </div>
        </div>
      )}

      {/* CTA — pagar siguiente cuota */}
      {nextCuota && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
            nextCuota.status === 'overdue' ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5 border border-white/8'
          }`}>
            <div>
              <p className="text-xs text-white/70 font-semibold">
                Cuota {nextCuota.cuota_number} de {nextCuota.total_cuotas}
              </p>
              <p className={`text-[10px] mt-0.5 ${nextCuota.status === 'overdue' ? 'text-red-400' : 'text-white/40'}`}>
                {nextCuota.status === 'overdue' ? '⚠ Vencida · ' : 'Vence: '}
                {fmtDate(nextCuota.due_date)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-base text-aira-lime">{fmt(nextCuota.amount)}</p>
            </div>
          </div>
          <button onClick={handlePayCuota} disabled={paying}
            className="w-full py-3 rounded-xl bg-aira-lime text-aira-darkBlue font-display text-sm uppercase tracking-[0.2em] hover:bg-white active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {paying
              ? <><Loader2 className="w-4 h-4 animate-spin"/>Generando link...</>
              : <><CreditCard className="w-4 h-4"/>Pagar cuota {nextCuota.cuota_number}</>
            }
          </button>
          {payError && <p className="text-xs text-red-400 text-center">{payError}</p>}
        </div>
      )}

      {/* QR si está pagado */}
      {order.status === 'paid' && allQrs.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-3">Tu{allQrs.length > 1 ? 's' : ''} boleta{allQrs.length > 1 ? 's' : ''}</p>
          <div className="flex flex-wrap gap-4">
            {order.items.map((item) =>
              item.qr_code ? (
                <div key={item.id} className="flex flex-col items-center gap-1.5">
                  <QRDisplay qrCode={item.qr_code} ticketName={item.ticket_name}/>
                  <p className="text-[10px] text-white/50 text-center">
                    {item.ticket_name}{item.is_vip ? ' · VIP' : ''}<br/>
                    ×{item.quantity}
                  </p>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Expandible — historial de cuotas */}
      {order.payment_mode === 'abono' && order.abonos.length > 0 && (
        <>
          <button onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] text-white/40 hover:text-white/60 transition-colors">
            <span className="text-[10px] uppercase tracking-widest font-semibold">
              Historial de cuotas
            </span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-1.5">
              {order.abonos.map(ab => {
                const cs = CUOTA_STATUS[ab.status] || CUOTA_STATUS.pending;
                return (
                  <div key={ab.cuota_number}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        ab.status==='paid' ? 'bg-emerald-400' :
                        ab.status==='overdue' ? 'bg-red-400 animate-pulse' : 'bg-white/20'
                      }`}/>
                      <span className="text-xs text-white/70">Cuota {ab.cuota_number}</span>
                      <span className={`text-[10px] ${cs.color}`}>{cs.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-white/80 tabular-nums">{fmt(ab.amount)}</p>
                      <p className="text-[9px] text-white/30">
                        {ab.status === 'paid' && ab.paid_at ? `Pagada ${fmtDate(ab.paid_at)}` : `Vence ${fmtDate(ab.due_date)}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── MODAL PRINCIPAL ──────────────────────────────────────────────────────────
interface MisReservasProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MisReservas({ isOpen, onClose }: MisReservasProps) {
  const [query,    setQuery]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [error,    setError]    = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Auto-buscar si viene ?reserva=REF en la URL
  useEffect(() => {
    if (!isOpen) return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('reserva');
    if (ref) {
      setQuery(ref);
      handleSearch(undefined, ref);
      // Limpiar URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isOpen]);

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    e?.preventDefault();
    const q = (overrideQuery || query).trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(false);

    // Detectar si es email, teléfono, o ref de orden
    const isEmail = q.includes('@');
    const isRef   = q.startsWith('AIRA-') || q.startsWith('aira-');

    try {
      let res, data;

      if (isRef) {
        // Buscar por order_ref directamente
        res  = await fetch(`/api/orders/${encodeURIComponent(q)}`);
        data = await res.json();
        if (res.ok && data.order) {
          setOrders([{ ...data.order, items: data.items, abonos: data.abonos }]);
          setSearched(true);
          return;
        }
      }

      res  = await fetch('/api/mis-reservas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(isEmail ? { email: q } : { phone: q }),
      });
      data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al buscar');
      setOrders(data.orders || []);
      setSearched(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setQuery('');
    setOrders([]);
    setError(null);
    setSearched(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4 md:p-6"
      style={{ background: 'rgba(3,6,18,0.85)', backdropFilter: 'blur(20px)' }}
      onClick={onClose}>
      <div
        role="dialog" aria-modal="true"
        className="relative w-full sm:max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] border border-white/10 bg-[#08101f] shadow-2xl flex flex-col max-h-[92dvh]"
        onClick={e => e.stopPropagation()}>

        {/* Glow */}
        <div className="absolute inset-0 opacity-20 pointer-events-none rounded-[inherit]" style={{
          background: 'radial-gradient(circle at top right,rgba(225,254,82,0.2),transparent 35%),' +
                      'radial-gradient(circle at left center,rgba(0,79,255,0.15),transparent 35%)',
        }}/>

        {/* Header */}
        <div className="relative z-10 flex-none border-b border-white/10 px-5 py-4 md:px-6 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono-custom text-[10px] uppercase tracking-[0.35em] text-aira-lime/70 mb-0.5">AIRA · Guatapé</p>
            <h3 className="font-display text-2xl text-white leading-none">Mis Reservas</h3>
          </div>
          <button onClick={onClose}
            className="flex-none w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Body */}
        <div className="relative z-10 flex-1 overflow-y-auto p-5 md:p-6 space-y-5">

          {/* Buscador */}
          <form onSubmit={handleSearch} className="space-y-3">
            <p className="text-sm text-white/50 leading-relaxed">
              Ingresa tu número de celular, email o código de reserva para ver el estado de tus boletas.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none"/>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Celular, email o AIRA-XXXXXX"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-aira-lime/50 focus:bg-white/[0.06] transition-all"
                />
              </div>
              <button type="submit" disabled={loading || !query.trim()}
                className="px-5 py-3 rounded-xl bg-aira-lime text-aira-darkBlue font-display text-sm uppercase tracking-[0.2em] hover:bg-white active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
                Buscar
              </button>
            </div>
            {searched && orders.length > 0 && (
              <button type="button" onClick={reset}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors">
                <RefreshCw className="w-3 h-3"/> Nueva búsqueda
              </button>
            )}
          </form>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5"/>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Sin resultados */}
          {searched && !loading && orders.length === 0 && !error && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
              <Ticket className="w-8 h-8 text-white/20 mx-auto mb-3"/>
              <p className="text-sm font-semibold text-white/70 mb-1">Sin reservas encontradas</p>
              <p className="text-xs text-white/40">
                Verifica que el número o email coincida con el que usaste al reservar.
              </p>
            </div>
          )}

          {/* Órdenes */}
          {orders.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-widest">
                {orders.length} reserva{orders.length > 1 ? 's' : ''} encontrada{orders.length > 1 ? 's' : ''}
              </p>
              {orders.map(order => (
                <OrderCard key={order.order_ref} order={order}/>
              ))}
            </div>
          )}

          {/* Estado vacío inicial */}
          {!searched && !loading && !error && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-aira-lime/10 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-aira-lime/60"/>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/60 mb-1">Consulta tus reservas</p>
                  <p className="text-xs text-white/30 max-w-xs mx-auto leading-relaxed">
                    Aquí puedes pagar tus cuotas pendientes, ver el historial de pagos y descargar tu QR de acceso.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 mt-1 w-full max-w-xs">
                  {[
                    ['📱', 'Celular con el que reservaste'],
                    ['📧', 'Email de confirmación'],
                    ['🎫', 'Código AIRA-XXXXXX'],
                  ].map(([ico, txt]) => (
                    <div key={txt} className="flex items-center gap-2 text-left">
                      <span className="text-sm">{ico}</span>
                      <span className="text-xs text-white/30">{txt}</span>
                    </div>
                  ))}
                </div>
              </div>
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
