/* eslint-disable @typescript-eslint/no-explicit-any */
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
    id: number; order_ref: string; total: number; status: string; codigo_referido?: string;
    payment_mode: string; reserved_until: string; created_at: string;
    customer_name: string; customer_email: string;
    qr_token?: string;
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
// Todos los precios incluyen el 5% adicional (precio base * 1.05)
const PAQUETES = [
  { label: 'Paquete 3D · Creyentes',          priceLabel: '$619.500',   price: '619500',   cat: '3 días' },
  { label: 'Paquete 3D · Referidos',           priceLabel: '$724.500',   price: '724500',   cat: '3 días' },
  { label: 'Paquete 3D · 1ª Etapa',            priceLabel: '$829.500',   price: '829500',   cat: '3 días' },
  { label: 'Paquete 3D · 2ª Etapa',            priceLabel: '$934.500',   price: '934500',   cat: '3 días' },
  { label: 'Paquete 3D · 3ª Etapa',            priceLabel: '$1.050.000', price: '1050000',  cat: '3 días' },
  { label: 'Pass VIP',                          priceLabel: '$367.500',   price: '367500',   cat: 'add-on' },
  { label: 'Transporte',                        priceLabel: '$189.000',   price: '189000',   cat: 'add-on' },
  { label: 'Suite Privada',                     priceLabel: '$2.625.000', price: '2625000',  cat: 'add-on' },
  { label: 'DÍA 1 — After Fiesta de Yates',    priceLabel: '$84.000',    price: '84000',    cat: 'daily'  },
  { label: 'DÍA 2 — Fiesta Majestic & Stage Joinn', priceLabel: '$157.500', price: '157500', cat: 'daily' },
  { label: 'DÍA 3 — Open Deck',                priceLabel: '$52.500',    price: '52500',    cat: 'daily'  },
];

// ─── Modal Registrar Abono ────────────────────────────────────────────────────
function AbonoModal({ reg, token, onClose, onDone }: {
  reg: any; token: string; onClose: () => void; onDone: () => void;
}) {
  const [form, setForm] = useState({
    monto: '', medio_pago: 'Efectivo',
    fecha_pago: new Date().toISOString().slice(0, 10), notas: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState<{ text: string; ok: boolean } | null>(null);
  const fmtLocal = (n: any) => n != null ? Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }) : '—';
  const pendiente = Number(reg.monto_pendiente);

  const submit = async () => {
    const monto = Number(form.monto);
    if (!monto || monto <= 0) { setMsg({ text: 'Ingresa un monto válido', ok: false }); return; }
    if (monto > pendiente) { setMsg({ text: `El abono (${fmtLocal(monto)}) supera el saldo pendiente (${fmtLocal(pendiente)})`, ok: false }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await fetch('/api/admin-registro', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ order_ref: reg.order_ref, ...form }),
      });
      const d = await r.json();
      if (d.ok) {
        setMsg({ text: `✓ Abono de ${fmtLocal(monto)} registrado${d.comision_generada > 0 ? ` · Comisión promotor: ${fmtLocal(d.comision_generada)}` : ''}`, ok: true });
        setTimeout(() => { onDone(); onClose(); }, 1500);
      } else { setMsg({ text: d.error || 'Error', ok: false }); }
    } finally { setSaving(false); }
  };

  const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors";
  const labelCls = "block text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-semibold";

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-white font-bold text-base">Registrar Abono</h3>
            <p className="text-zinc-500 text-xs mt-0.5 font-mono">{reg.order_ref}</p>
            <p className="text-zinc-400 text-sm mt-1">{reg.nombre}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors mt-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Resumen saldos */}
        <div className="grid grid-cols-3 gap-2 mb-5 text-center">
          <div className="bg-zinc-800 rounded-xl p-3">
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Total</p>
            <p className="text-white text-sm font-bold tabular-nums">{fmtLocal(reg.monto_total)}</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-3">
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Recibido</p>
            <p className="text-green-400 text-sm font-bold tabular-nums">{fmtLocal(reg.monto_recibido)}</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-3">
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Pendiente</p>
            <p className="text-yellow-400 text-sm font-bold tabular-nums">{fmtLocal(pendiente)}</p>
          </div>
        </div>

        {reg.codigo_referido && (
          <div className="mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-amber-300 text-xs">Promotor <span className="font-mono font-bold">{reg.codigo_referido}</span> ganará el <b>5%</b> de este abono</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="col-span-2">
            <label className={labelCls}>Monto del Abono *</label>
            <input type="number" className={inputCls} value={form.monto}
              placeholder={`Máx. ${fmtLocal(pendiente)}`}
              onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Medio de Pago</label>
            <select className={inputCls} value={form.medio_pago} onChange={e => setForm(f => ({ ...f, medio_pago: e.target.value }))}>
              {['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Tarjeta', 'Bold', 'Otro'].map(m =>
                <option key={m} value={m} style={{background:'#18181b'}}>{m}</option>
              )}
            </select>
          </div>
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" className={inputCls} value={form.fecha_pago}
              onChange={e => setForm(f => ({ ...f, fecha_pago: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Notas</label>
            <input className={inputCls} value={form.notas} placeholder="Ej: Segundo abono acordado..."
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
          </div>
        </div>

        {msg && <p className={`mb-3 text-sm font-semibold ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50">
            {saving ? 'Guardando…' : '+ Registrar Abono'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Editar Registro ────────────────────────────────────────────────────
function EditarModal({ reg, token, onClose, onDone }: {
  reg: any; token: string; onClose: () => void; onDone: () => void;
}) {
  const [form, setForm] = useState({
    nombre:          reg.nombre        || '',
    cedula:          reg.cedula        || '',
    movil:           reg.movil         || '',
    email:           reg.email         || '',
    paquete:         reg.paquete       || '',
    monto_total:     String(reg.monto_total    ?? ''),
    monto_recibido:  String(reg.monto_recibido ?? ''),
    medio_pago:      reg.medio_pago    || 'Efectivo',
    fecha_pago:      reg.fecha_pago    ? reg.fecha_pago.slice(0, 10) : new Date().toISOString().slice(0, 10),
    notas:           reg.notas         || '',
    codigo_referido: reg.codigo_referido || '',
  });
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState<{ text: string; ok: boolean } | null>(null);

  const fmtLocal = (n: any) => n != null ? Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }) : '—';

  const submit = async () => {
    if (!form.nombre || !form.cedula) { setMsg({ text: 'Nombre y cédula obligatorios', ok: false }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await fetch(`/api/admin-registro?id=${reg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({
          ...form,
          paquete: form.paquete || undefined,
          codigo_referido: form.codigo_referido.trim().toUpperCase() || undefined,
        }),
      });
      const d = await r.json();
      if (d.ok) {
        setMsg({ text: '✓ Registro actualizado correctamente', ok: true });
        setTimeout(() => { onDone(); onClose(); }, 1200);
      } else { setMsg({ text: d.error || 'Error al actualizar', ok: false }); }
    } finally { setSaving(false); }
  };

  const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors";
  const labelCls = "block text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-semibold";

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-2xl shadow-2xl my-8">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-white font-bold text-base">Editar Registro</h3>
            <p className="text-zinc-500 text-xs mt-0.5 font-mono">{reg.order_ref}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors mt-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>Nombre completo *</label>
            <input className={inputCls} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Cédula *</label>
            <input className={inputCls} value={form.cedula} onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Móvil / WhatsApp</label>
            <input className={inputCls} value={form.movil} onChange={e => setForm(f => ({ ...f, movil: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Correo Electrónico</label>
            <input type="email" className={inputCls} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Paquete / Servicio</label>
            <select className={inputCls} value={form.paquete} onChange={e => {
              const opt = PAQUETES.find(p => p.label === e.target.value);
              setForm(f => ({ ...f, paquete: e.target.value, monto_total: opt?.price || f.monto_total }));
            }}>
              <option value="" style={{ background: '#18181b' }}>— Seleccionar —</option>
              <optgroup label="Paquete 3 Días" style={{ background: '#18181b' }}>
                {PAQUETES.filter(p => p.cat === '3 días').map(p => <option key={p.label} value={p.label} style={{ background: '#18181b' }}>{p.label} · {p.priceLabel}</option>)}
              </optgroup>
              <optgroup label="Add-ons" style={{ background: '#18181b' }}>
                {PAQUETES.filter(p => p.cat === 'add-on').map(p => <option key={p.label} value={p.label} style={{ background: '#18181b' }}>{p.label} · {p.priceLabel}</option>)}
              </optgroup>
              <optgroup label="Por día" style={{ background: '#18181b' }}>
                {PAQUETES.filter(p => p.cat === 'daily').map(p => <option key={p.label} value={p.label} style={{ background: '#18181b' }}>{p.label} · {p.priceLabel}</option>)}
              </optgroup>
            </select>
          </div>
          <div>
            <label className={labelCls}>Código Referido</label>
            <input className={`${inputCls} font-mono tracking-widest uppercase`}
              value={form.codigo_referido}
              onChange={e => setForm(f => ({ ...f, codigo_referido: e.target.value.toUpperCase().replace(/\s+/g, '-') }))} />
          </div>
          <div>
            <label className={labelCls}>Medio de Pago</label>
            <select className={inputCls} value={form.medio_pago} onChange={e => setForm(f => ({ ...f, medio_pago: e.target.value }))}>
              {['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Tarjeta', 'Bold', 'Otro'].map(m =>
                <option key={m} value={m} style={{ background: '#18181b' }}>{m}</option>
              )}
            </select>
          </div>
          <div>
            <label className={labelCls}>Monto Total ($)</label>
            <input type="number" className={inputCls} value={form.monto_total}
              onChange={e => setForm(f => ({ ...f, monto_total: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Monto Recibido ($)</label>
            <input type="number" className={inputCls} value={form.monto_recibido}
              onChange={e => setForm(f => ({ ...f, monto_recibido: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Monto Pendiente</label>
            <div className={`${inputCls} text-yellow-400 font-semibold`}>
              {form.monto_total ? fmtLocal(Number(form.monto_total) - Number(form.monto_recibido || 0)) : '—'}
            </div>
          </div>
          <div>
            <label className={labelCls}>Fecha de Pago</label>
            <input type="date" className={inputCls} value={form.fecha_pago}
              onChange={e => setForm(f => ({ ...f, fecha_pago: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Notas</label>
            <input className={inputCls} value={form.notas} placeholder="Observaciones..."
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
          </div>
        </div>

        {msg && <p className={`mb-3 text-sm font-semibold ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50">
            {saving ? 'Guardando…' : '✓ Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ManualTab({ token }: { token: string }) {
  const emptyForm = { nombre: '', cedula: '', movil: '', email: '', paquete: '', monto_total: '', monto_recibido: '', medio_pago: 'Efectivo', fecha_pago: new Date().toISOString().slice(0, 10), notas: '', codigo_referido: '' };
  const [form,    setForm]    = useState(emptyForm);
  const [list,    setList]    = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState<{ text: string; ok: boolean } | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [abonoModal, setAbonoModal] = useState<any | null>(null);
  const [editModal,  setEditModal]  = useState<any | null>(null);
  const [copied, setCopied]   = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState<string | null>(null);

  const fmtLocal = (n: any) => n != null ? Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }) : '—';

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
    if (!form.nombre || !form.cedula) { setMsg({ text: 'Nombre y cédula obligatorios', ok: false }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await fetch('/api/admin-registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({
          ...form,
          paquete: form.paquete || undefined,
          codigo_referido: form.codigo_referido.trim().toUpperCase() || undefined,
        }),
      });
      const d = await r.json();
      if (d.ok) {
        setMsg({ text: `✓ Registrado: ${d.order_ref}${d.monto_pendiente > 0 ? ` · Pendiente: ${fmtLocal(d.monto_pendiente)}` : ' · Pagado completo'}`, ok: true });
        setForm(emptyForm);
        fetchList();
      } else { setMsg({ text: d.error || 'Error', ok: false }); }
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await fetch(`/api/admin-registro?id=${id}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
    fetchList();
  };

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyLink = (ref: string, qrToken?: string) => {
    const url = qrToken
      ? `https://www.viveaira.live/boleta/${ref}?token=${qrToken}`
      : `https://www.viveaira.live/boleta/${ref}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(ref);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const generateToken = async (order_ref: string) => {
    setGenLoading(order_ref);
    try {
      const r = await fetch('/api/admin-generar-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ order_ref }),
      });
      const d = await r.json();
      if (d.ok) {
        fetchList();
        setTimeout(() => copyLink(order_ref, d.qr_token), 300);
      } else { alert(d.error || 'Error generando token'); }
    } finally { setGenLoading(null); }
  };

  const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors";
  const labelCls = "block text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-semibold";

  return (
    <div className="space-y-6">
      {abonoModal && (
        <AbonoModal reg={abonoModal} token={token} onClose={() => setAbonoModal(null)} onDone={fetchList} />
      )}
      {editModal && (
        <EditarModal reg={editModal} token={token} onClose={() => setEditModal(null)} onDone={fetchList} />
      )}

      {/* ── Formulario nuevo registro ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-5">Nuevo Registro Manual</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><label className={labelCls}>Nombre completo *</label><input className={inputCls} value={form.nombre} placeholder="Juan García" onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
          <div><label className={labelCls}>Cédula *</label><input className={inputCls} value={form.cedula} placeholder="1234567890" onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))} /></div>
          <div><label className={labelCls}>Móvil / WhatsApp</label><input className={inputCls} value={form.movil} placeholder="3001234567" onChange={e => setForm(f => ({ ...f, movil: e.target.value }))} /></div>
          <div><label className={labelCls}>Correo Electrónico</label><input type="email" className={inputCls} value={form.email} placeholder="correo@ejemplo.com" onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div>
            <label className={labelCls}>Paquete / Servicio</label>
            <select className={inputCls} value={form.paquete} onChange={e => {
              const opt = PAQUETES.find(p => p.label === e.target.value);
              setForm(f => ({ ...f, paquete: e.target.value, monto_total: opt?.price || f.monto_total }));
            }}>
              <option value="" style={{ background: '#18181b' }}>— Seleccionar —</option>
              <optgroup label="Paquete 3 Días" style={{ background: '#18181b' }}>
                {PAQUETES.filter(p => p.cat === '3 días').map(p => <option key={p.label} value={p.label} style={{ background: '#18181b' }}>{p.label} · {p.priceLabel}</option>)}
              </optgroup>
              <optgroup label="Add-ons" style={{ background: '#18181b' }}>
                {PAQUETES.filter(p => p.cat === 'add-on').map(p => <option key={p.label} value={p.label} style={{ background: '#18181b' }}>{p.label} · {p.priceLabel}</option>)}
              </optgroup>
              <optgroup label="Por día" style={{ background: '#18181b' }}>
                {PAQUETES.filter(p => p.cat === 'daily').map(p => <option key={p.label} value={p.label} style={{ background: '#18181b' }}>{p.label} · {p.priceLabel}</option>)}
              </optgroup>
            </select>
          </div>

          {/* Código referido */}
          <div>
            <label className={labelCls}>Código Referido <span className="normal-case text-zinc-600">(promotor)</span></label>
            <input className={`${inputCls} font-mono tracking-widest uppercase`}
              value={form.codigo_referido}
              placeholder="PROMO-2026"
              onChange={e => setForm(f => ({ ...f, codigo_referido: e.target.value.toUpperCase().replace(/\s+/g, '-') }))} />
          </div>

          <div><label className={labelCls}>Monto Total ($)</label><input type="number" className={inputCls} value={form.monto_total} placeholder="280000" onChange={e => setForm(f => ({ ...f, monto_total: e.target.value }))} /></div>
          <div><label className={labelCls}>Monto Recibido ($)</label><input type="number" className={inputCls} value={form.monto_recibido} placeholder="140000" onChange={e => setForm(f => ({ ...f, monto_recibido: e.target.value }))} /></div>
          <div><label className={labelCls}>Monto Pendiente</label><div className={`${inputCls} text-yellow-400 font-semibold`}>{form.monto_total ? fmtLocal(Number(form.monto_total) - Number(form.monto_recibido || 0)) : '—'}</div></div>
          <div>
            <label className={labelCls}>Medio de Pago</label>
            <select className={inputCls} value={form.medio_pago} onChange={e => setForm(f => ({ ...f, medio_pago: e.target.value }))}>
              {['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Tarjeta', 'Bold', 'Otro'].map(m => <option key={m} value={m} style={{ background: '#18181b' }}>{m}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Fecha de Pago</label><input type="date" className={inputCls} value={form.fecha_pago} onChange={e => setForm(f => ({ ...f, fecha_pago: e.target.value }))} /></div>
          <div><label className={labelCls}>Notas</label><input className={inputCls} value={form.notas} placeholder="Observaciones..." onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></div>
        </div>
        {msg && <p className={`mt-4 text-sm font-semibold ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>}
        <button onClick={save} disabled={saving}
          className="mt-5 px-6 py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50">
          {saving ? 'Guardando…' : '+ Guardar Registro'}
        </button>
      </div>

      {/* ── Lista de registros ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-white font-semibold">Registros Manuales ({list.length})</h3>
          <button onClick={fetchList} className="text-xs text-zinc-400 hover:text-white transition-colors">↻ Actualizar</button>
        </div>

        {loading
          ? <div className="py-10 text-center text-zinc-500 text-sm">Cargando…</div>
          : list.length === 0
            ? <div className="py-10 text-center text-zinc-500 text-sm">Sin registros todavía</div>
            : <div className="divide-y divide-zinc-800/60">
                {list.map((r: any) => {
                  const isExpanded  = expanded.has(r.id);
                  const pendiente   = Number(r.monto_pendiente);
                  const pagadoTotal = pendiente === 0;
                  const abonos: any[] = r.abonos || [];

                  return (
                    <div key={r.id} className="hover:bg-zinc-800/20 transition-colors">
                      {/* Fila principal */}
                      <div className="grid grid-cols-[1fr_auto] gap-2 px-5 py-4">
                        <div className="min-w-0">
                          {/* Línea 1: ref + nombre + estado */}
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-zinc-400">{r.order_ref}</span>
                            <span className="text-white text-sm font-semibold truncate">{r.nombre}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${pagadoTotal ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                              {pagadoTotal ? '✓ Pagado' : `Pendiente ${fmtLocal(pendiente)}`}
                            </span>
                            {r.codigo_referido && (
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-amber-400/30 bg-amber-400/10 text-amber-400">
                                {r.codigo_referido}
                                {r.referido_nombre && <span className="text-amber-300/60 ml-1">· {r.referido_nombre}</span>}
                              </span>
                            )}
                          </div>
                          {/* Línea 2: datos secundarios */}
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
                            {r.cedula   && <span>CI {r.cedula}</span>}
                            {r.movil    && <span>📱 {r.movil}</span>}
                            {r.paquete  && <span className="text-zinc-400">{r.paquete}</span>}
                            <span>Total <b className="text-zinc-300">{fmtLocal(r.monto_total)}</b></span>
                            <span>Recibido <b className="text-green-400">{fmtLocal(r.monto_recibido)}</b></span>
                            {r.medio_pago && <span>{r.medio_pago}</span>}
                            {r.fecha_pago && <span>{new Date(r.fecha_pago).toLocaleDateString('es-CO')}</span>}
                            {abonos.length > 0 && (
                              <button onClick={() => toggleExpand(r.id)} className="text-zinc-400 hover:text-white underline underline-offset-2 transition-colors">
                                {isExpanded ? '▲ Ocultar abonos' : `▼ ${abonos.length} abono${abonos.length > 1 ? 's' : ''}`}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          {/* Boleta link */}
                          {r.qr_token ? (
                            <button onClick={() => copyLink(r.order_ref, r.qr_token)}
                              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700">
                              {copied === r.order_ref
                                ? <span className="text-green-400">✓ copiado</span>
                                : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copiar boleta</>
                              }
                            </button>
                          ) : (
                            <button onClick={() => generateToken(r.order_ref)}
                              disabled={genLoading === r.order_ref}
                              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-400 transition-colors px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40">
                              {genLoading === r.order_ref
                                ? <span className="animate-pulse">Generando…</span>
                                : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>Generar token</>
                              }
                            </button>
                          )}

                          {/* Registrar abono */}
                          {pendiente > 0 && (
                            <button onClick={() => setAbonoModal(r)}
                              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              Abonar
                            </button>
                          )}

                          {/* Editar */}
                          <button onClick={() => setEditModal(r)}
                            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-blue-400 transition-colors px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Editar
                          </button>

                          {/* Eliminar */}
                          <button onClick={() => del(r.id)} className="text-zinc-700 hover:text-red-400 transition-colors text-xs px-2 py-1">
                            ✕ Eliminar
                          </button>
                        </div>
                      </div>

                      {/* Historial de abonos expandible */}
                      {isExpanded && abonos.length > 0 && (
                        <div className="px-5 pb-4">
                          <div className="bg-zinc-800/50 rounded-xl overflow-hidden border border-zinc-700/50">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 px-4 py-2 border-b border-zinc-700/50 font-semibold">Historial de abonos</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left border-b border-zinc-700/30">
                                  {['#', 'Monto', 'Medio', 'Fecha', 'Notas'].map(h => (
                                    <th key={h} className="px-4 py-2 text-zinc-600 font-medium uppercase tracking-widest text-[10px]">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {abonos.map((ab: any, idx: number) => (
                                  <tr key={ab.id} className="border-b border-zinc-700/20 last:border-0">
                                    <td className="px-4 py-2 text-zinc-600">{idx + 1}</td>
                                    <td className="px-4 py-2 text-green-400 font-semibold tabular-nums">{fmtLocal(ab.monto)}</td>
                                    <td className="px-4 py-2 text-zinc-400">{ab.medio_pago || '—'}</td>
                                    <td className="px-4 py-2 text-zinc-400 tabular-nums">{ab.fecha_pago ? new Date(ab.fecha_pago).toLocaleDateString('es-CO') : '—'}</td>
                                    <td className="px-4 py-2 text-zinc-500 max-w-[180px] truncate">{ab.notas || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
        }
      </div>
    </div>
  );
}

export default function AdminDashboard({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const lenis = (window as any).__lenis;
    if (lenis) lenis.stop();
    const onWheel = (e: WheelEvent) => {
      const modal = document.getElementById('admin-modal');
      if (modal) { modal.scrollTop += e.deltaY; e.preventDefault(); }
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
  const [tab,      setTab]      = useState<'kpis'|'orders'|'tickets'|'recordatorios'|'manual'|'referidos'>('kpis');
  const [codigos,    setCodigos]    = useState<any[]>([]);
  const [newCodigo,  setNewCodigo]  = useState({ codigo: '', descripcion: '', usos_max: 1 });
  const [codigoSaving, setCodigoSaving] = useState(false);
  const [recLog,   setRecLog]   = useState<string[]>([]);
  const [recSending, setRecSending] = useState(false);
  const [recResult,  setRecResult]  = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchData = useCallback(async (tk: string) => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/admin?section=overview', { headers: { 'x-admin-token': tk } });
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

  useEffect(() => { if (authed && token) fetchData(token); }, [authed, token, fetchData]);

  useEffect(() => {
    if (tab === 'referidos' && token) {
      fetch('/api/referidos', { headers: { 'x-admin-token': token } })
        .then(r => r.json()).then(d => setCodigos(d.codigos || [])).catch(console.error);
    }
  }, [tab, token]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const copyBoletaLink = (ref: string, qrToken?: string) => {
    const url = qrToken
      ? `https://www.viveaira.live/boleta/${ref}?token=${qrToken}`
      : `https://www.viveaira.live/boleta/${ref}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(ref);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  if (!authed) return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-sm">
        <h2 className="text-white text-xl font-bold mb-1">Admin AIRA</h2>
        <p className="text-zinc-400 text-sm mb-6">Ingresa el token de acceso</p>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="Token..."
          className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-zinc-400 mb-3"
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button onClick={handleLogin} className="w-full bg-white text-black font-semibold rounded-lg py-3 hover:bg-zinc-200 transition-colors">Entrar</button>
        <button onClick={onClose} className="w-full mt-3 text-zinc-500 text-sm hover:text-zinc-300 transition-colors">Cancelar</button>
      </div>
    </div>
  );

  const r = data?.revenue;
  const maxRevenue = data?.dailyRevenue.length ? Math.max(...data.dailyRevenue.map(d => d.revenue), 1) : 1;

  return (
    <div id="admin-modal" className="fixed inset-0 z-[200] bg-black/95 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg tracking-tight">AIRA</span>
          <span className="text-zinc-500 text-sm">/ Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => fetchData(token)}
            className="text-zinc-400 hover:text-white text-sm transition-colors flex items-center gap-1">
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
                { label: 'Recaudado',      value: fmt(r?.paid_revenue ?? 0),    sub: 'pagos aprobados' },
                { label: 'Total generado', value: fmt(r?.total_revenue ?? 0),   sub: 'todas las órdenes' },
                { label: 'Órdenes total',  value: String(r?.total_orders ?? 0), sub: 'creadas' },
                { label: 'Pagadas',        value: String(r?.paid_orders ?? 0),  sub: 'aprobadas Bold' },
                { label: 'Pendientes',     value: String(r?.pending_orders ?? 0), sub: 'sin pagar' },
                { label: 'Canceladas',     value: String(r?.cancelled_orders ?? 0), sub: 'rechazadas' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{kpi.label}</p>
                  <p className="text-white text-xl font-bold tabular-nums">{kpi.value}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit flex-wrap">
              {(['kpis', 'orders', 'tickets', 'recordatorios', 'manual', 'referidos'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
                  {{ kpis: 'Ingresos', orders: 'Órdenes', tickets: 'Cupos', recordatorios: '📲 Recordatorios', manual: '✍ Registro Manual', referidos: '🎫 Referidos' }[t]}
                </button>
              ))}
            </div>

            {/* Tab: Ingresos */}
            {tab === 'kpis' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-6">Ingresos últimos 30 días</h3>
                {data.dailyRevenue.length === 0
                  ? <p className="text-zinc-500 text-sm text-center py-12">Sin datos de ingresos aún</p>
                  : <div className="flex items-end gap-1 h-48">
                      {data.dailyRevenue.map(d => (
                        <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group">
                          <div className="relative w-full">
                            <div className="w-full bg-white/80 rounded-sm transition-all group-hover:bg-white"
                              style={{ height: `${Math.round((d.revenue / maxRevenue) * 160)}px`, minHeight: d.revenue > 0 ? '4px' : '1px' }} />
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                              {d.day}<br />{fmt(d.revenue)}
                            </div>
                          </div>
                          <span className="text-zinc-600 text-[10px] rotate-45 origin-left hidden md:block">{d.day.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                }
              </div>
            )}

            {/* Tab: Órdenes */}
            {tab === 'orders' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        {['Ref', 'Cliente', 'Total', 'Modo', 'Estado', 'Referido', 'Fecha', 'Boleta'].map(h => (
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
                          <td className="px-4 py-3"><span className="text-zinc-400 text-xs capitalize">{o.payment_mode}</span></td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[o.status] ?? 'bg-zinc-700 text-zinc-300'}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {o.codigo_referido
                              ? <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-amber-400/30 bg-amber-400/10 text-amber-400">{o.codigo_referido}</span>
                              : <span className="text-zinc-700 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-xs tabular-nums">
                            {new Date(o.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="px-4 py-3">
                            {(o.status === 'paid' || o.status === 'abono') ? (
                              <div className="flex items-center gap-2">
                                <a href={o.qr_token ? `/boleta/${o.order_ref}?token=${o.qr_token}` : `/boleta/${o.order_ref}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-aira-lime hover:text-white transition-colors font-medium">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                  Ver
                                </a>
                                <button onClick={() => copyBoletaLink(o.order_ref, o.qr_token)}
                                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
                                  {copied === o.order_ref
                                    ? <span className="text-green-400 text-xs">✓ copiado</span>
                                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                  }
                                </button>
                              </div>
                            ) : <span className="text-zinc-700 text-xs">—</span>}
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

                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex mb-3">
                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${soldPct}%` }} />
                        <div className="bg-amber-400 h-full transition-all" style={{ width: `${resPct}%` }} />
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /><span className="text-zinc-400">Vendidos: <b className="text-white">{t.sold_qty}</b></span></span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /><span className="text-zinc-400">Reservados: <b className="text-white">{t.reserved_qty}</b></span></span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-600 inline-block" /><span className="text-zinc-400">Libres: <b className="text-white">{free}</b></span></span>
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
              <p className="text-zinc-400 text-sm mb-6">Envía mensajes WhatsApp a compradores con cuotas que vencen en 3 días o mañana.</p>
              <div className="flex flex-wrap gap-3 mb-6">
                <button disabled={recSending} onClick={async () => {
                  setRecSending(true); setRecLog([]); setRecResult(null);
                  try {
                    const resp = await fetch('/api/recordatorios-cuotas?dry=1', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': token }, body: JSON.stringify({ dry: true }) });
                    const d = await resp.json();
                    setRecResult(d); setRecLog(d.log || []);
                  } catch (e: any) { setRecLog(['Error: ' + e.message]); } finally { setRecSending(false); }
                }} className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:border-zinc-500 transition-colors disabled:opacity-40">
                  {recSending ? 'Procesando…' : '🔍 Simular (dry run)'}
                </button>
                <button disabled={recSending} onClick={async () => {
                  if (!confirm('¿Enviar recordatorios WhatsApp reales ahora?')) return;
                  setRecSending(true); setRecLog([]); setRecResult(null);
                  try {
                    const resp = await fetch('/api/recordatorios-cuotas', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': token }, body: JSON.stringify({}) });
                    const d = await resp.json();
                    setRecResult(d); setRecLog(d.log || []);
                  } catch (e: any) { setRecLog(['Error: ' + e.message]); } finally { setRecSending(false); }
                }} className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors disabled:opacity-40">
                  {recSending ? 'Enviando…' : '📲 Enviar ahora'}
                </button>
              </div>
              {recResult && (
                <div className={`rounded-xl border p-4 mb-4 text-sm ${recResult.ok ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                  <p className={recResult.ok ? 'text-green-400' : 'text-red-400'}>{recResult.dryRun ? '[DRY RUN] ' : ''} ✓ {recResult.enviados} enviados · {recResult.errores} errores · {recResult.total} total</p>
                </div>
              )}
              {recLog.length > 0 && (
                <div className="bg-black/50 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-400 max-h-64 overflow-y-auto space-y-1">
                  {recLog.map((line, i) => <p key={i} className={line.startsWith('→') ? 'text-zinc-300' : line.startsWith('⚠') ? 'text-yellow-400' : ''}>{line}</p>)}
                </div>
              )}
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <p className="text-zinc-500 text-xs">⏰ Cron automático: todos los días a las 9:00am (hora Colombia)</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Registro Manual */}
        {tab === 'manual' && <ManualTab token={token} />}

        {/* Tab: Referidos */}
        {tab === 'referidos' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Códigos de Referido</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Nuevo Código</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div><label className="block text-xs text-zinc-500 mb-1">Código *</label><input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm font-mono tracking-widest uppercase placeholder:text-zinc-600 outline-none focus:border-zinc-500" value={newCodigo.codigo} onChange={e => setNewCodigo(f => ({ ...f, codigo: e.target.value.toUpperCase().replace(/\s+/g, '-') }))} placeholder="AIRA-2026" /></div>
                <div><label className="block text-xs text-zinc-500 mb-1">Descripción</label><input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-500" value={newCodigo.descripcion} onChange={e => setNewCodigo(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Código para equipo de ventas" /></div>
                <div><label className="block text-xs text-zinc-500 mb-1">Usos máx.</label><input type="number" min={1} max={999} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-zinc-500" value={newCodigo.usos_max} onChange={e => setNewCodigo(f => ({ ...f, usos_max: Number(e.target.value) }))} /></div>
              </div>
              <button disabled={codigoSaving || !newCodigo.codigo} onClick={async () => {
                setCodigoSaving(true);
                const resp = await fetch('/api/referidos', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': token }, body: JSON.stringify(newCodigo) });
                const d = await resp.json();
                if (d.ok) { setCodigos(cs => [d.codigo, ...cs]); setNewCodigo({ codigo: '', descripcion: '', usos_max: 1 }); } else { alert(d.error); }
                setCodigoSaving(false);
              }} className="px-5 py-2 rounded-lg bg-white text-black text-sm font-semibold disabled:opacity-40">
                {codigoSaving ? 'Creando...' : '+ Crear Código'}
              </button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Códigos registrados</p>
                <button onClick={async () => { const resp = await fetch('/api/referidos', { headers: { 'x-admin-token': token } }); const d = await resp.json(); setCodigos(d.codigos || []); }} className="text-xs text-zinc-500 hover:text-white transition">↻ Refrescar</button>
              </div>
              {codigos.length === 0
                ? <p className="text-center text-zinc-600 text-sm py-10">Sin códigos. Crea el primero arriba.</p>
                : <table className="w-full text-sm">
                    <thead><tr className="border-b border-zinc-800 text-left">{['Código', 'Descripción', 'Usos', 'Estado', 'Acciones'].map(h => <th key={h} className="px-4 py-3 text-[10px] uppercase tracking-widest text-zinc-500 font-medium">{h}</th>)}</tr></thead>
                    <tbody>{codigos.map((cod: any) => (
                      <tr key={cod.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition">
                        <td className="px-4 py-3 font-mono text-white tracking-widest">{cod.codigo}</td>
                        <td className="px-4 py-3 text-zinc-400 max-w-[200px] truncate">{cod.descripcion || '—'}</td>
                        <td className="px-4 py-3"><span className={`font-mono text-sm ${cod.usos_actuales >= cod.usos_max ? 'text-red-400' : 'text-green-400'}`}>{cod.usos_actuales}</span><span className="text-zinc-600">/{cod.usos_max}</span></td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cod.activo ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>{cod.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td className="px-4 py-3"><div className="flex gap-2">
                          <button onClick={async () => { await fetch('/api/referidos', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-token': token }, body: JSON.stringify({ id: cod.id, activo: cod.activo ? 0 : 1 }) }); setCodigos(cs => cs.map(c => c.id === cod.id ? { ...c, activo: cod.activo ? 0 : 1 } : c)); }} className="text-xs text-zinc-500 hover:text-white transition">{cod.activo ? 'Desactivar' : 'Activar'}</button>
                          <button onClick={async () => { if (!confirm(`¿Eliminar código ${cod.codigo}?`)) return; await fetch(`/api/referidos?id=${cod.id}`, { method: 'DELETE', headers: { 'x-admin-token': token } }); setCodigos(cs => cs.filter(c => c.id !== cod.id)); }} className="text-xs text-red-500 hover:text-red-400 transition">Eliminar</button>
                        </div></td>
                      </tr>
                    ))}</tbody>
                  </table>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
