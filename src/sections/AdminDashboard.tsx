import { useEffect, useState, useCallback } from 'react';

const ADMIN_TOKEN_KEY = 'aira_admin_token';

interface Overview {
  revenue: {
    total_revenue: number; paid_revenue: number;
    total_orders: number; paid_orders: number;
    pending_orders: number; cancelled_orders: number;
  };
  tickets: Array<{
    name: string; access_type: string;
    available_qty: number; sold_qty: number;
    reserved_qty: number; price: number;
  }>;
  recentOrders: Array<{
    id: number; order_ref: string; total: number; status: string;
    payment_mode: string; reserved_until: string; created_at: string;
    customer_name: string; customer_email: string;
  }>;
  dailyRevenue: Array<{ day: string; revenue: number; orders: number }>;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const statusColor: Record<string, string> = {
  paid:      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  pending:   'bg-amber-500/20   text-amber-300   border border-amber-500/30',
  cancelled: 'bg-red-500/20     text-red-300     border border-red-500/30',
};

// ─── Manual Registration Tab ─────────────────────────────────────────────────
const PAQUETES = [
  { label: 'Paquete 3 Días',                 priceLabel: '$280.000',   price: '280000',   cat: 'premium' },
  { label: 'Pass VIP',                        priceLabel: '$450.000',   price: '450000',   cat: 'premium' },
  { label: 'Transporte',                      priceLabel: '$180.000',   price: '180000',   cat: 'premium' },
  { label: 'Suite Privada',                   priceLabel: '$2.200.000', price: '2200000',  cat: 'premium' },
  { label: 'DÍA 1 — After Fiesta de Yates',  priceLabel: '$80.000',    price: '80000',    cat: 'daily'   },
  { label: 'DÍA 2 — Fiesta Majestic & Stage Joinn', priceLabel: '$150.000', price: '150000', cat: 'daily' },
  { label: 'DÍA 3 — Open Deck',              priceLabel: '$50.000',    price: '50000',    cat: 'daily'   },
];

function ManualTab({ token }: { token: string }) {
  const [form, setForm] = useState({ nombre:'', cedula:'', movil:'', paquete:'', monto_total:'', monto_recibido:'', medio_pago:'Efectivo', fecha_pago: new Date().toISOString().slice(0,10), notas:'' });
  const [list,    setList]    = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState<{text:string;ok:boolean}|null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-registro', { headers: { 'x-admin-token': token } });
      const d = await r.json();
      if (d.ok) setList(d.registros || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, []);

  const save = async () => {
    if (!form.nombre || !form.cedula) { setMsg({text:'Nombre y cédula obligatorios',ok:false}); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await fetch('/api/admin-registro', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-admin-token': token },
        body: JSON.stringify({ ...form, paquete: form.paquete || undefined }),
      });
      const d = await r.json();
      if (d.ok) {
        setMsg({text:`✓ Registrado: ${d.order_ref}`, ok:true});
        setForm({ nombre:'', cedula:'', movil:'', paquete:'', monto_total:'', monto_recibido:'', medio_pago:'Efectivo', fecha_pago: new Date().toISOString().slice(0,10), notas:'' });
        fetchList();
      } else { setMsg({text: d.error || 'Error', ok:false}); }
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await fetch(`/api/admin-registro?id=${id}`, { method:'DELETE', headers:{'x-admin-token':token} });
    fetchList();
  };

  const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors";
  const labelCls = "block text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-semibold";
  const fmt = (n: any) => n != null ? Number(n).toLocaleString('es-CO', {style:'currency',currency:'COP',maximumFractionDigits:0}) : '—';

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-5">Nuevo Registro Manual</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><label className={labelCls}>Nombre completo *</label><input className={inputCls} value={form.nombre} placeholder="Juan García" onChange={e=>setForm(f=>({...f,nombre:e.target.value}))}/></div>
          <div><label className={labelCls}>Cédula *</label><input className={inputCls} value={form.cedula} placeholder="1234567890" onChange={e=>setForm(f=>({...f,cedula:e.target.value}))}/></div>
          <div><label className={labelCls}>Móvil / WhatsApp</label><input className={inputCls} value={form.movil} placeholder="3001234567" onChange={e=>setForm(f=>({...f,movil:e.target.value}))}/></div>
          <div>
            <label className={labelCls}>Paquete / Servicio</label>
            <select className={inputCls} value={form.paquete} onChange={e=>{
              const opt = PAQUETES.find(p=>p.label===e.target.value);
              setForm(f=>({...f, paquete:e.target.value, monto_total: opt?.price || f.monto_total}));
            }}>
              <option value="" style={{background:'#18181b'}}>— Seleccionar —</option>
              <optgroup label="Premium" style={{background:'#18181b'}}>
                {PAQUETES.filter(p=>p.cat==='premium').map(p=><option key={p.label} value={p.label} style={{background:'#18181b'}}>{p.label} · {p.priceLabel}</option>)}
              </optgroup>
              <optgroup label="Por día" style={{background:'#18181b'}}>
                {PAQUETES.filter(p=>p.cat==='daily').map(p=><option key={p.label} value={p.label} style={{background:'#18181b'}}>{p.label} · {p.priceLabel}</option>)}
              </optgroup>
            </select>
          </div>
          <div><label className={labelCls}>Monto Total ($)</label><input type="number" className={inputCls} value={form.monto_total} placeholder="280000" onChange={e=>setForm(f=>({...f,monto_total:e.target.value}))}/></div>
          <div><label className={labelCls}>Monto Recibido ($)</label><input type="number" className={inputCls} value={form.monto_recibido} placeholder="140000" onChange={e=>setForm(f=>({...f,monto_recibido:e.target.value}))}/></div>
          <div><label className={labelCls}>Monto Pendiente</label><div className={`${inputCls} text-yellow-400 font-semibold`}>{form.monto_total ? fmt(Number(form.monto_total)-Number(form.monto_recibido||0)) : '—'}</div></div>
          <div><label className={labelCls}>Medio de Pago</label>
            <select className={inputCls} value={form.medio_pago} onChange={e=>setForm(f=>({...f,medio_pago:e.target.value}))}>
              {['Efectivo','Transferencia','Nequi','Daviplata','Tarjeta','Bold','Otro'].map(m=><option key={m} value={m} style={{background:'#18181b'}}>{m}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Fecha de Pago</label><input type="date" className={inputCls} value={form.fecha_pago} onChange={e=>setForm(f=>({...f,fecha_pago:e.target.value}))}/></div>
          <div><label className={labelCls}>Notas</label><input className={inputCls} value={form.notas} placeholder="Observaciones..." onChange={e=>setForm(f=>({...f,notas:e.target.value}))}/></div>
        </div>
        {msg && <p className={`mt-4 text-sm font-semibold ${msg.ok?'text-green-400':'text-red-400'}`}>{msg.text}</p>}
        <button onClick={save} disabled={saving}
          className="mt-5 px-6 py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50">
          {saving ? 'Guardando…' : '+ Guardar Registro'}
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-white font-semibold">Registros Manuales ({list.length})</h3>
          <button onClick={fetchList} className="text-xs text-zinc-400 hover:text-white transition-colors">↻ Actualizar</button>
        </div>
        {loading ? <div className="py-10 text-center text-zinc-500 text-sm">Cargando…</div>
        : list.length === 0 ? <div className="py-10 text-center text-zinc-500 text-sm">Sin registros todavía</div>
        : <div className="overflow-x-auto"><table className="w-full text-sm min-w-[900px]">
            <thead><tr className="border-b border-zinc-800 text-left">
              {['Ref','Nombre','Cédula','Móvil','Paquete','Total','Recibido','Pendiente','Medio','Fecha','Notas',''].map(h=>(
                <th key={h} className="px-4 py-3 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">{h}</th>
              ))}
            </tr></thead>
            <tbody>{list.map((r:any)=>(
              <tr key={r.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors">
                <td className="px-4 py-3 text-zinc-400 text-xs font-mono">{r.order_ref}</td>
                <td className="px-4 py-3 text-white font-medium">{r.nombre}</td>
                <td className="px-4 py-3 text-zinc-300 font-mono text-xs">{r.cedula}</td>
                <td className="px-4 py-3 text-zinc-400 text-xs">{r.movil||'—'}</td>
                <td className="px-4 py-3 text-xs"><span className="text-aira-lime/80 font-medium">{r.paquete||'—'}</span></td>
                <td className="px-4 py-3 text-white tabular-nums text-xs">{fmt(r.monto_total)}</td>
                <td className="px-4 py-3 text-green-400 tabular-nums text-xs font-semibold">{fmt(r.monto_recibido)}</td>
                <td className="px-4 py-3 tabular-nums text-xs font-semibold"><span className={Number(r.monto_pendiente)>0?'text-yellow-400':'text-zinc-500'}>{fmt(r.monto_pendiente)}</span></td>
                <td className="px-4 py-3 text-zinc-400 text-xs">{r.medio_pago||'—'}</td>
                <td className="px-4 py-3 text-zinc-400 text-xs">{r.fecha_pago?new Date(r.fecha_pago).toLocaleDateString('es-CO'):'—'}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs max-w-[160px] truncate">{r.notas||'—'}</td>
                <td className="px-4 py-3"><button onClick={()=>del(r.id)} className="text-zinc-600 hover:text-red-400 transition-colors text-xs">✕</button></td>
              </tr>
            ))}</tbody>
          </table></div>}
      </div>
    </div>
  );
}

export default function AdminDashboard({ onClose }: { onClose: () => void }) {
  // Parar Lenis + interceptar wheel manualmente para el modal
  useEffect(() => {
    const lenis = (window as any).__lenis;
    if (lenis) lenis.stop();

    const onWheel = (e: WheelEvent) => {
      const modal = document.getElementById('admin-modal');
      if (modal) {
        modal.scrollTop += e.deltaY;
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      const l = (window as any).__lenis;
      if (l) l.start();
      window.removeEventListener('wheel', onWheel);
    };
  }, []);
  const [token,    setToken]    = useState(() => sessionStorage.getItem(ADMIN_TOKEN_KEY) || '');
  const [password, setPassword] = useState('');
  const [authed,   setAuthed]   = useState(() => !!sessionStorage.getItem(ADMIN_TOKEN_KEY));
  const [data,     setData]     = useState<Overview | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [tab,      setTab]      = useState<'kpis'|'orders'|'tickets'|'recordatorios'|'manual'>('kpis');
  const [recLog,   setRecLog]   = useState<string[]>([]);
  const [recSending, setRecSending] = useState(false);
  const [recResult,  setRecResult]  = useState<any>(null);

  const fetchData = useCallback(async (tk: string) => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/admin?section=overview', {
        headers: { 'x-admin-token': tk },
      });
      if (r.status === 401) { setAuthed(false); sessionStorage.removeItem(ADMIN_TOKEN_KEY); setError('Token inválido'); return; }
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, password);
    setToken(password);
    setAuthed(true);
    fetchData(password);
  };

  useEffect(() => {
    if (authed && token) fetchData(token);
  }, [authed, token, fetchData]);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Login ──────────────────────────────────────────────────────────────────
  if (!authed) return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-sm">
        <h2 className="text-white text-xl font-bold mb-1">Admin AIRA</h2>
        <p className="text-zinc-400 text-sm mb-6">Ingresa el token de acceso</p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Token..."
          className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-zinc-400 mb-3"
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          onClick={handleLogin}
          className="w-full bg-white text-black font-semibold rounded-lg py-3 hover:bg-zinc-200 transition-colors"
        >Entrar</button>
        <button onClick={onClose} className="w-full mt-3 text-zinc-500 text-sm hover:text-zinc-300 transition-colors">Cancelar</button>
      </div>
    </div>
  );

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const r = data?.revenue;
  const maxRevenue = data?.dailyRevenue.length
    ? Math.max(...data.dailyRevenue.map(d => d.revenue), 1)
    : 1;

  return (
    <div id="admin-modal" className="fixed inset-0 z-[200] bg-black/95 overflow-y-auto overscroll-contain" style={{WebkitOverflowScrolling:"touch"}}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg tracking-tight">AIRA</span>
          <span className="text-zinc-500 text-sm">/ Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => fetchData(token)}
            className="text-zinc-400 hover:text-white text-sm transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Actualizar
          </button>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">{error}</div>
        )}

        {data && !loading && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[
                { label: 'Recaudado', value: fmt(r?.paid_revenue ?? 0), sub: 'pagos aprobados' },
                { label: 'Total generado', value: fmt(r?.total_revenue ?? 0), sub: 'todas las órdenes' },
                { label: 'Órdenes total', value: String(r?.total_orders ?? 0), sub: 'creadas' },
                { label: 'Pagadas', value: String(r?.paid_orders ?? 0), sub: 'aprobadas Bold' },
                { label: 'Pendientes', value: String(r?.pending_orders ?? 0), sub: 'sin pagar' },
                { label: 'Canceladas', value: String(r?.cancelled_orders ?? 0), sub: 'rechazadas' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{kpi.label}</p>
                  <p className="text-white text-xl font-bold tabular-nums">{kpi.value}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
              {(['kpis', 'orders', 'tickets', 'recordatorios', 'manual'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === t
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {{ kpis: 'Ingresos', orders: 'Órdenes', tickets: 'Cupos', recordatorios: '📲 Recordatorios', manual: '✍ Registro Manual' }[t]}
                </button>
              ))}
            </div>

            {/* Tab: Ingresos (chart de barras) */}
            {tab === 'kpis' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-6">Ingresos últimos 30 días</h3>
                {data.dailyRevenue.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-12">Sin datos de ingresos aún</p>
                ) : (
                  <div className="flex items-end gap-1 h-48">
                    {data.dailyRevenue.map(d => (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group">
                        <div className="relative w-full">
                          <div
                            className="w-full bg-white/80 rounded-sm transition-all group-hover:bg-white"
                            style={{ height: `${Math.round((d.revenue / maxRevenue) * 160)}px`, minHeight: d.revenue > 0 ? '4px' : '1px' }}
                          />
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                            {d.day}<br />{fmt(d.revenue)}
                          </div>
                        </div>
                        <span className="text-zinc-600 text-[10px] rotate-45 origin-left hidden md:block">
                          {d.day.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Órdenes */}
            {tab === 'orders' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        {['Ref', 'Cliente', 'Total', 'Modo', 'Estado', 'Fecha'].map(h => (
                          <th key={h} className="text-left text-zinc-500 text-xs uppercase tracking-widest px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentOrders.map(o => (
                        <tr key={o.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-zinc-300">{o.order_ref}</td>
                          <td className="px-4 py-3">
                            <p className="text-white text-xs font-medium">{o.customer_name}</p>
                            <p className="text-zinc-500 text-xs">{o.customer_email}</p>
                          </td>
                          <td className="px-4 py-3 text-white tabular-nums text-xs">{fmt(o.total)}</td>
                          <td className="px-4 py-3">
                            <span className="text-zinc-400 text-xs capitalize">{o.payment_mode}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[o.status] ?? 'bg-zinc-700 text-zinc-300'}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-xs tabular-nums">
                            {new Date(o.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.recentOrders.length === 0 && (
                    <p className="text-zinc-500 text-sm text-center py-12">Sin órdenes aún</p>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Cupos */}
            {tab === 'tickets' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.tickets.map(t => {
                  const total = t.available_qty;
                  const free  = Math.max(0, total - t.sold_qty - t.reserved_qty);
                  const soldPct = total > 0 ? (t.sold_qty / total) * 100 : 0;
                  const resPct  = total > 0 ? (t.reserved_qty / total) * 100 : 0;
                  return (
                    <div key={t.name} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-white font-semibold text-sm">{t.name}</p>
                          <p className="text-zinc-500 text-xs capitalize mt-0.5">{t.access_type}</p>
                        </div>
                        <span className="text-zinc-400 text-sm tabular-nums">{fmt(t.price)}</span>
                      </div>
                      {/* Barra de progreso */}
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex mb-3">
                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${soldPct}%` }} />
                        <div className="bg-amber-400 h-full transition-all" style={{ width: `${resPct}%` }} />
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          <span className="text-zinc-400">Vendidos: <b className="text-white">{t.sold_qty}</b></span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                          <span className="text-zinc-400">Reservados: <b className="text-white">{t.reserved_qty}</b></span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-zinc-600 inline-block" />
                          <span className="text-zinc-400">Libres: <b className="text-white">{free}</b></span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

            {/* Tab: Recordatorios */}
            {tab === 'recordatorios' && (
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-1">Recordatorios de cuotas</h3>
                  <p className="text-zinc-400 text-sm mb-6">
                    Envía mensajes WhatsApp a compradores con cuotas que vencen en 3 días o mañana.
                    El cron automático lo ejecuta cada día a las 9am hora Colombia.
                  </p>
                  <div className="flex flex-wrap gap-3 mb-6">
                    <button
                      disabled={recSending}
                      onClick={async () => {
                        setRecSending(true); setRecLog([]); setRecResult(null);
                        try {
                          const r = await fetch('/api/recordatorios-cuotas?dry=1', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
                            body: JSON.stringify({ dry: true }),
                          });
                          const d = await r.json();
                          setRecResult(d); setRecLog(d.log || []);
                        } catch(e:any) { setRecLog(['Error: ' + e.message]); }
                        finally { setRecSending(false); }
                      }}
                      className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:border-zinc-500 transition-colors disabled:opacity-40 flex items-center gap-2"
                    >
                      {recSending ? 'Procesando…' : '🔍 Simular (dry run)'}
                    </button>
                    <button
                      disabled={recSending}
                      onClick={async () => {
                        if (!confirm('¿Enviar recordatorios WhatsApp reales ahora?')) return;
                        setRecSending(true); setRecLog([]); setRecResult(null);
                        try {
                          const r = await fetch('/api/recordatorios-cuotas', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
                            body: JSON.stringify({}),
                          });
                          const d = await r.json();
                          setRecResult(d); setRecLog(d.log || []);
                        } catch(e:any) { setRecLog(['Error: ' + e.message]); }
                        finally { setRecSending(false); }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors disabled:opacity-40 flex items-center gap-2"
                    >
                      {recSending ? 'Enviando…' : '📲 Enviar ahora'}
                    </button>
                  </div>

                  {recResult && (
                    <div className={`rounded-xl border p-4 mb-4 text-sm ${
                      recResult.ok ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'
                    }`}>
                      <p className={recResult.ok ? 'text-green-400' : 'text-red-400'}>
                        {recResult.dryRun ? '[DRY RUN] ' : ''}
                        ✓ {recResult.enviados} enviados · {recResult.errores} errores · {recResult.total} total
                      </p>
                    </div>
                  )}

                  {recLog.length > 0 && (
                    <div className="bg-black/50 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-400 max-h-64 overflow-y-auto space-y-1">
                      {recLog.map((line, i) => (
                        <p key={i} className={line.startsWith('→') ? 'text-zinc-300' : line.startsWith('⚠') ? 'text-yellow-400' : ''}>  {line}</p>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-zinc-800">
                    <p className="text-zinc-500 text-xs">⏰ Cron automático: todos los días a las 9:00am (hora Colombia)</p>
                    <p className="text-zinc-500 text-xs mt-1">🔒 Requiere variable de entorno <code className="text-zinc-400">CRON_SECRET</code> y <code className="text-zinc-400">ADMIN_SECRET_KEY</code> en Vercel</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Registro Manual */}
            {tab === 'manual' && <ManualTab token={token} />}
      </div>
    </div>
  );
}
