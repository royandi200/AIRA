import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle, Ticket, Download } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

type OrderStatus = 'loading' | 'paid' | 'pending' | 'cancelled' | 'error';

interface OrderData {
  id: number;
  status: string;
  total: number;
  event_name: string;
  event_date: string;
  venue: string;
  name: string;
  email: string;
  items: Array<{ id: number; label: string; quantity: number; qr_code: string }>;
}

export default function CheckoutSuccess() {
  // ✅ Native URLSearchParams — no react-router-dom needed
  const orderId = new URLSearchParams(window.location.search).get('order_id');

  const [status, setStatus] = useState<OrderStatus>('loading');
  const [order,  setOrder]  = useState<OrderData | null>(null);

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!orderId) { setStatus('error'); return; }

    const check = async () => {
      try {
        const res  = await fetch(`${API}/api/orders/${orderId}`);
        const data = await res.json();
        setOrder(data);
        if (data.status === 'paid')           setStatus('paid');
        else if (data.status === 'cancelled') setStatus('cancelled');
        else                                  setStatus('pending');
      } catch { setStatus('error'); }
    };

    check();

    // Polling cada 3s mientras el pago está pendiente (Bold puede demorar el webhook)
    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`${API}/api/payments/status/${orderId}`);
        const data = await res.json();
        if (data.status === 'paid') { setStatus('paid'); clearInterval(interval); }
      } catch { /* ignorar errores de polling */ }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId]);

  return (
    <div className="min-h-screen bg-[#030612] flex items-center justify-center p-6">
      <div className="w-full max-w-lg relative">
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center top, rgba(225,254,82,0.08) 0%, transparent 60%)'
        }} />

        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-aira-lime animate-spin mx-auto mb-4" />
            <p className="font-display text-2xl text-white">Verificando tu pago…</p>
            <p className="text-white/40 text-sm mt-2">Esto puede tomar unos segundos</p>
          </div>
        )}

        {status === 'paid' && order && (
          <div className="rounded-3xl border border-aira-lime/20 bg-[#08101f] p-8 space-y-6">
            {/* Header */}
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-aira-lime mx-auto mb-4" />
              <p className="font-mono text-[10px] uppercase tracking-[.3em] text-aira-lime/70 mb-2">Pago confirmado · Bold</p>
              <h1 className="font-display text-4xl text-white mb-1">¡Listo, {order.name.split(' ')[0]}! 🎉</h1>
              <p className="text-white/50 text-sm">Revisa tu email — enviamos tus boletas con código QR</p>
            </div>

            {/* Resumen evento */}
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5 space-y-3">
              <p className="font-mono text-[9px] uppercase tracking-[.25em] text-white/35">Evento</p>
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-display text-lg text-white">{order.event_name}</p>
                  <p className="text-sm text-white/45">{order.venue}</p>
                  <p className="font-mono text-[10px] text-white/30 mt-1">
                    {new Date(order.event_date).toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-[9px] uppercase tracking-[.2em] text-white/35">Orden #</p>
                  <p className="font-display text-xl text-aira-lime">{order.id}</p>
                </div>
              </div>
            </div>

            {/* Items y QRs */}
            <div className="space-y-3">
              <p className="font-mono text-[9px] uppercase tracking-[.25em] text-white/35">Tus boletas</p>
              {order.items.map(item => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-aira-lime/10 border border-aira-lime/20 flex items-center justify-center">
                      <Ticket className="w-4 h-4 text-aira-lime" />
                    </div>
                    <div>
                      <p className="font-display text-sm text-white">{item.label}</p>
                      <p className="font-mono text-[9px] text-white/40">× {item.quantity}</p>
                    </div>
                  </div>
                  <a
                    href={`${API}/api/tickets/qr/${item.qr_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/10 text-white/60 hover:border-aira-lime/30 hover:text-aira-lime transition-colors text-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> QR
                  </a>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="rounded-2xl border border-aira-lime/20 bg-aira-lime/5 p-4 flex justify-between items-center">
              <p className="font-mono text-[9px] uppercase tracking-[.2em] text-aira-lime/60">Total pagado</p>
              <p className="font-display text-2xl text-aira-lime">{fmt(order.total)}</p>
            </div>

            <p className="text-center font-mono text-[9px] text-white/25">
              Boletas enviadas a <span className="text-white/50">{order.email}</span>
            </p>
          </div>
        )}

        {status === 'pending' && (
          <div className="text-center rounded-3xl border border-yellow-400/20 bg-[#08101f] p-8">
            <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
            <h1 className="font-display text-3xl text-white mb-2">Pago en proceso</h1>
            <p className="text-white/50 text-sm">Tu pago está siendo procesado por Bold. Te notificaremos por email cuando se confirme.</p>
          </div>
        )}

        {(status === 'cancelled' || status === 'error') && (
          <div className="text-center rounded-3xl border border-red-500/20 bg-[#08101f] p-8">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="font-display text-3xl text-white mb-2">Pago no completado</h1>
            <p className="text-white/50 text-sm mb-6">Hubo un problema con tu pago. No se realizó ningún cobro.</p>
            <button onClick={() => window.history.back()} className="px-6 py-3 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition-colors">
              Volver e intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
