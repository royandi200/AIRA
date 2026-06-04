import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, ChevronRight, X, Plus, Search, Send, Copy, LogOut, Users, DollarSign, ClipboardList } from 'lucide-react'

const TOKEN_KEY = 'aira_promotor_token'
const BASE_URL  = 'https://www.viveaira.live'

const PAQUETES = [
  { label: 'Paquete 3D · Creyentes',               price: 619500,   cat: '3 días' },
  { label: 'Paquete 3D · Referidos',                price: 724500,   cat: '3 días' },
  { label: 'Paquete 3D · 1ª Etapa',                price: 829500,   cat: '3 días' },
  { label: 'Paquete 3D · 2ª Etapa',                price: 934500,   cat: '3 días' },
  { label: 'Paquete 3D · 3ª Etapa',                price: 1050000,  cat: '3 días' },
  { label: 'Pass VIP',                              price: 367500,   cat: 'add-on' },
  { label: 'Transporte',                            price: 189000,   cat: 'add-on' },
  { label: 'Suite Privada',                         price: 2625000,  cat: 'add-on' },
  { label: 'DÍA 1 — After Fiesta de Yates',         price: 84000,    cat: 'diario' },
  { label: 'DÍA 2 — Fiesta Majestic & Stage Joinn', price: 157500,   cat: 'diario' },
  { label: 'DÍA 3 — Open Deck',                     price: 52500,    cat: 'diario' },
]
const MEDIOS = ['Efectivo','Nequi','Daviplata','Transferencia','Bold','Otro']
const fmt = (n: number) => `$${n.toLocaleString('es-CO')}`
const fmtAny = (n: any) => fmt(Number(n) || 0)

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin:(t:string)=>void }) {
  const [clave,setClave]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false)
  const submit = async () => {
    if (!clave.trim()) return
    setLoading(true); setError('')
    // Verificar clave haciendo un fetch real al API (mismo patrón que admin)
    const r = await fetch('/api/admin-registro', { headers: { 'x-admin-token': clave.trim() } })
    if (r.status === 401) { setError('Clave incorrecta'); setLoading(false); return }
    localStorage.setItem(TOKEN_KEY, clave.trim())
    onLogin(clave.trim())
    setLoading(false)
  }
  return (
    <div className="min-h-screen bg-[#030d06] flex flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-aira-lime font-mono mb-2">AIRA Festival</p>
        <h1 className="text-3xl font-display font-black text-white">Panel Promotor</h1>
        <p className="text-white/40 text-sm mt-1">Registro de pagos manuales</p>
      </div>
      <div className="w-full max-w-sm space-y-3">
        <input type="password" value={clave} onChange={e=>setClave(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}
          placeholder="Clave de acceso"
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-base outline-none focus:border-aira-lime/50" />
        {error&&<p className="text-red-400 text-sm text-center">{error}</p>}
        <button onClick={submit} disabled={loading||!clave}
          className="w-full py-4 rounded-2xl bg-aira-lime text-black font-black text-base disabled:opacity-40 active:scale-95 transition-all">
          {loading?'Verificando…':'Ingresar →'}
        </button>
      </div>
    </div>
  )
}

// ── Nuevo registro ────────────────────────────────────────────────────────────
function NuevoModal({token,onClose,onDone}:{token:string;onClose:()=>void;onDone:()=>void}) {
  const empty = {nombre:'',cedula:'',movil:'',email:'',paquete:PAQUETES[2].label,monto_total:String(PAQUETES[2].price),monto_recibido:'',medio_pago:'Efectivo',fecha_pago:new Date().toISOString().slice(0,10),notas:'',codigo_referido:''}
  const [form,setForm]=useState(empty); const [saving,setSaving]=useState(false); const [done,setDone]=useState<any>(null); const [sending,setSending]=useState(false)
  const f=(k:keyof typeof empty)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setForm(p=>({...p,[k]:e.target.value}))
  const pendiente=(Number(form.monto_total)||0)-(Number(form.monto_recibido)||0)
  const inputCls="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-aira-lime/50"
  const lCls="block text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1.5"

  const save = async () => {
    if(!form.nombre||!form.movil){alert('Nombre y móvil son obligatorios');return}
    setSaving(true)
    const r=await fetch('/api/admin-registro',{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':token},body:JSON.stringify(form)})
    const d=await r.json()
    if(!r.ok){alert(d.error||'Error guardando');setSaving(false);return}
    setDone(d);setSaving(false)
  }

  const sendWA = async () => {
    if(!done)return; setSending(true)
    const url=`${BASE_URL}/boleta/${done.order_ref}`
    const msg=`✅ *Registro AIRA confirmado*\n\nHola *${done.nombre}* 🎉\nPaquete: *${done.paquete||'AIRA 2026'}*\nAbono recibido: *${fmtAny(done.monto_recibido)}*\nSaldo pendiente: *${fmtAny(done.monto_pendiente)}*\n\n📲 Ver tu comprobante:\n${url}\n\n📍 *AIRA Experience · Guatapé · Ago 2026*`
    await fetch('/api/send-wa',{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':token},body:JSON.stringify({phone:form.movil,message:msg})})
    setSending(false); alert('✅ Mensaje enviado por WhatsApp')
  }

  if(done) return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0a0a0f] border border-white/10 rounded-3xl p-6">
        <div className="text-center mb-6">
          <CheckCircle2 className="w-14 h-14 text-aira-lime mx-auto mb-3"/>
          <h3 className="text-xl font-black text-white mb-1">¡Registro guardado!</h3>
          <p className="text-white/50 text-sm">{done.nombre} · {done.paquete}</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-white/40">Abono</span><span className="text-aira-lime font-bold">{fmtAny(done.monto_recibido)}</span></div>
          <div className="flex justify-between"><span className="text-white/40">Pendiente</span><span className="text-amber-400 font-bold">{fmtAny(done.monto_pendiente)}</span></div>
          <div className="flex justify-between"><span className="text-white/40">Ref.</span><span className="text-white font-mono text-xs">{done.order_ref}</span></div>
        </div>
        <div className="space-y-2.5">
          <button onClick={sendWA} disabled={sending}
            className="w-full py-3.5 rounded-2xl bg-[#25D366] text-white font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40">
            <Send className="w-4 h-4"/>{sending?'Enviando…':'Enviar comprobante por WhatsApp'}
          </button>
          <button onClick={()=>{navigator.clipboard.writeText(`${BASE_URL}/boleta/${done.order_ref}`);alert('URL copiada')}}
            className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-semibold flex items-center justify-center gap-2 text-sm active:scale-95">
            <Copy className="w-4 h-4"/>Copiar URL del comprobante
          </button>
          <button onClick={()=>{onDone();onClose()}} className="w-full py-3 text-white/40 text-sm">Cerrar</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center">
      <div className="w-full max-w-lg bg-[#0a0a0f] border border-white/10 rounded-t-3xl p-5 overflow-y-auto" style={{maxHeight:'92vh'}}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-white">Nuevo registro</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center"><X className="w-4 h-4 text-white/50"/></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={lCls}>Nombre *</label><input className={inputCls} value={form.nombre} onChange={f('nombre')} placeholder="Nombre completo"/></div>
            <div><label className={lCls}>Cédula</label><input className={inputCls} value={form.cedula} onChange={f('cedula')} placeholder="Documento"/></div>
            <div><label className={lCls}>Móvil *</label><input className={inputCls} value={form.movil} onChange={f('movil')} placeholder="300..." type="tel"/></div>
            <div className="col-span-2"><label className={lCls}>Email</label><input className={inputCls} value={form.email} onChange={f('email')} placeholder="opcional" type="email"/></div>
          </div>
          <div>
            <label className={lCls}>Paquete</label>
            <select className={inputCls} value={form.paquete} onChange={e=>{const opt=PAQUETES.find(p=>p.label===e.target.value);setForm(p=>({...p,paquete:e.target.value,monto_total:String(opt?.price||p.monto_total)}))}}>
              <optgroup label="Paquete 3 Días">{PAQUETES.filter(p=>p.cat==='3 días').map(p=><option key={p.label} value={p.label}>{p.label} · {fmt(p.price)}</option>)}</optgroup>
              <optgroup label="Add-ons">{PAQUETES.filter(p=>p.cat==='add-on').map(p=><option key={p.label} value={p.label}>{p.label} · {fmt(p.price)}</option>)}</optgroup>
              <optgroup label="Diario">{PAQUETES.filter(p=>p.cat==='diario').map(p=><option key={p.label} value={p.label}>{p.label} · {fmt(p.price)}</option>)}</optgroup>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lCls}>Total</label><input className={inputCls} type="number" value={form.monto_total} onChange={f('monto_total')}/></div>
            <div><label className={lCls}>Abono recibido</label><input className={inputCls} type="number" value={form.monto_recibido} onChange={f('monto_recibido')} placeholder="0"/></div>
            <div><label className={lCls}>Medio de pago</label>
              <select className={inputCls} value={form.medio_pago} onChange={f('medio_pago')}>{MEDIOS.map(m=><option key={m}>{m}</option>)}</select>
            </div>
            <div><label className={lCls}>Fecha pago</label><input className={inputCls} type="date" value={form.fecha_pago} onChange={f('fecha_pago')}/></div>
          </div>
          {Number(form.monto_total)>0&&(
            <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
              <span className="text-amber-400/70 text-xs font-bold uppercase tracking-wider">Pendiente</span>
              <span className="text-amber-400 font-black text-lg">{fmt(pendiente)}</span>
            </div>
          )}
          <div><label className={lCls}>Código referido</label><input className={inputCls} value={form.codigo_referido} onChange={f('codigo_referido')} placeholder="opcional"/></div>
          <div><label className={lCls}>Notas</label><textarea className={`${inputCls} resize-none`} rows={2} value={form.notas} onChange={f('notas')} placeholder="Observaciones..."/></div>
          <button onClick={save} disabled={saving||!form.nombre||!form.movil}
            className="w-full py-4 rounded-2xl bg-aira-lime text-black font-black text-base disabled:opacity-40 active:scale-95 transition-all">
            {saving?'Guardando…':'Guardar registro →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Abono modal ───────────────────────────────────────────────────────────────
function AbonoModal({reg,token,onClose,onDone}:{reg:any;token:string;onClose:()=>void;onDone:()=>void}) {
  const [monto,setMonto]=useState(''); const [medio,setMedio]=useState('Efectivo')
  const [fecha,setFecha]=useState(new Date().toISOString().slice(0,10)); const [notas,setNotas]=useState('')
  const [saving,setSaving]=useState(false); const [sending,setSending]=useState(false); const [done,setDone]=useState(false)
  const inputCls="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-aira-lime/50"
  const lCls="block text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1.5"
  const pendiente=Number(reg.monto_pendiente)||0

  const save=async()=>{
    if(!monto||Number(monto)<=0){alert('Ingresa el monto');return}
    setSaving(true)
    const r=await fetch('/api/admin-registro',{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':token},body:JSON.stringify({_abono:true,id:reg.id,monto,medio_pago:medio,fecha_pago:fecha,notas})})
    if(!r.ok){alert('Error guardando abono');setSaving(false);return}
    setDone(true);setSaving(false);onDone()
  }

  const sendWA=async()=>{
    setSending(true)
    const url=`${BASE_URL}/boleta/${reg.order_ref}`
    const nuevoPend=Math.max(0,pendiente-Number(monto))
    const msg=`💰 *Abono AIRA registrado*\n\nHola *${reg.nombre}* 🎉\nAbono: *${fmt(Number(monto))}* (${medio})\nSaldo pendiente: *${fmt(nuevoPend)}*\n\n📲 Ver tu comprobante:\n${url}\n\n📍 *AIRA Experience · Guatapé · Ago 2026*`
    await fetch('/api/send-wa',{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':token},body:JSON.stringify({phone:reg.movil,message:msg})})
    setSending(false);alert('✅ Mensaje enviado')
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center">
      <div className="w-full max-w-sm bg-[#0a0a0f] border border-white/10 rounded-t-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-white">{reg.nombre}</h3>
            <p className="text-white/40 text-xs">{reg.paquete} · Pendiente: {fmt(pendiente)}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center"><X className="w-4 h-4 text-white/50"/></button>
        </div>
        <div className="space-y-3">
          <div><label className={lCls}>Monto del abono</label><input className={inputCls} type="number" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0" autoFocus/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lCls}>Medio</label><select className={inputCls} value={medio} onChange={e=>setMedio(e.target.value)}>{MEDIOS.map(m=><option key={m}>{m}</option>)}</select></div>
            <div><label className={lCls}>Fecha</label><input className={inputCls} type="date" value={fecha} onChange={e=>setFecha(e.target.value)}/></div>
          </div>
          <div><label className={lCls}>Notas</label><input className={inputCls} value={notas} onChange={e=>setNotas(e.target.value)} placeholder="opcional"/></div>
          {done?(
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-aira-lime text-sm font-bold"><CheckCircle2 className="w-4 h-4"/>Abono guardado</div>
              <button onClick={sendWA} disabled={sending}
                className="w-full py-3.5 rounded-2xl bg-[#25D366] text-white font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40">
                <Send className="w-4 h-4"/>{sending?'Enviando…':'Enviar comprobante WA'}
              </button>
              <button onClick={onClose} className="w-full py-2.5 text-white/40 text-sm">Cerrar</button>
            </div>
          ):(
            <button onClick={save} disabled={saving||!monto}
              className="w-full py-4 rounded-2xl bg-aira-lime text-black font-black text-base disabled:opacity-40 active:scale-95 transition-all">
              {saving?'Guardando…':'Registrar abono →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Promotor() {
  const [token,setToken]=useState(()=>localStorage.getItem(TOKEN_KEY)||'')
  const [regs,setRegs]=useState<any[]>([]); const [loading,setLoading]=useState(false)
  const [search,setSearch]=useState(''); const [showNew,setShowNew]=useState(false)
  const [abonoReg,setAbonoReg]=useState<any>(null)
  const [stats,setStats]=useState({total:0,recaudado:0,pendiente:0})

  const fetchRegs=useCallback(async()=>{
    if(!token)return; setLoading(true)
    const r=await fetch('/api/admin-registro',{headers:{'x-admin-token':token}})
    if(r.status===401){localStorage.removeItem(TOKEN_KEY);setToken('');setLoading(false);return}
    const d=await r.json()
    const list=d.registros||[]
    setRegs(list)
    setStats({total:list.length,recaudado:list.reduce((s:number,r:any)=>s+Number(r.monto_recibido||0),0),pendiente:list.reduce((s:number,r:any)=>s+Number(r.monto_pendiente||0),0)})
    setLoading(false)
  },[token])

  useEffect(()=>{if(token)fetchRegs()},[token,fetchRegs])

  if(!token) return <LoginScreen onLogin={setToken}/>

  const filtered=regs.filter(r=>!search||r.nombre?.toLowerCase().includes(search.toLowerCase())||r.movil?.includes(search)||r.cedula?.includes(search))

  return (
    <div className="min-h-screen bg-[#030d06] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#030d06]/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-aira-lime font-mono">AIRA · Panel Promotor</p>
          <h1 className="text-white font-black text-lg leading-none">Registros</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowNew(true)} className="w-9 h-9 rounded-full bg-aira-lime flex items-center justify-center">
            <Plus className="w-4 h-4 text-black"/>
          </button>
          <button onClick={()=>{localStorage.removeItem(TOKEN_KEY);setToken('')}} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
            <LogOut className="w-3.5 h-3.5 text-white/50"/>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-white/5 border-b border-white/5">
        {[{label:'Registros',value:String(stats.total),icon:<Users className="w-3 h-3"/>},{label:'Recaudado',value:fmt(stats.recaudado),icon:<DollarSign className="w-3 h-3"/>},{label:'Pendiente',value:fmt(stats.pendiente),icon:<ClipboardList className="w-3 h-3"/>}].map(s=>(
          <div key={s.label} className="bg-[#030d06] px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-1 text-white/30 mb-0.5">{s.icon}<span className="text-[9px] uppercase tracking-wider">{s.label}</span></div>
            <p className="text-white font-black text-sm tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-white/30"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, móvil o cédula…"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25"/>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2.5">
        {loading&&<p className="text-center text-white/30 py-10 text-sm">Cargando…</p>}
        {!loading&&filtered.length===0&&<p className="text-center text-white/30 py-10 text-sm">{search?'Sin resultados':'Sin registros aún'}</p>}
        {filtered.map(r=>(
          <div key={r.id} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{r.nombre}</p>
                <p className="text-white/40 text-[11px] truncate">{r.paquete||'—'}</p>
              </div>
              <div className="text-right ml-3 shrink-0">
                <p className="text-aira-lime font-black text-sm tabular-nums">{fmtAny(r.monto_recibido)}</p>
                {Number(r.monto_pendiente)>0&&<p className="text-amber-400 text-[11px] tabular-nums">-{fmtAny(r.monto_pendiente)}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-white/30 mb-3">
              <span>📱 {r.movil||'—'}</span>
              <span>💳 {r.medio_pago||'—'}</span>
              {r.fecha_pago&&<span>{new Date(r.fecha_pago).toLocaleDateString('es-CO')}</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setAbonoReg(r)} className="flex-1 py-2 rounded-xl bg-aira-lime/10 text-aira-lime text-xs font-bold border border-aira-lime/20 active:scale-95 transition-all">
                + Registrar abono
              </button>
              <a href={`${BASE_URL}/boleta/${r.order_ref}`} target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-bold flex items-center gap-1 active:scale-95">
                Ver<ChevronRight className="w-3 h-3"/>
              </a>
            </div>
          </div>
        ))}
      </div>

      {showNew&&<NuevoModal token={token} onClose={()=>setShowNew(false)} onDone={fetchRegs}/>}
      {abonoReg&&<AbonoModal reg={abonoReg} token={token} onClose={()=>setAbonoReg(null)} onDone={fetchRegs}/>}
    </div>
  )
}
