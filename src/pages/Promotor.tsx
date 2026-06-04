import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, ChevronRight, X, Plus, Search, Send, Copy, LogOut, Users, DollarSign, ClipboardList, MessageCircle } from 'lucide-react'

// ── Config ────────────────────────────────────────────────────────────────────
const TOKEN_KEY = 'aira_promotor_token'
const CODIGO_KEY = 'aira_promotor_codigo'
const DESC_KEY   = 'aira_promotor_desc'
const BASE_URL   = 'https://www.viveaira.live'

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
const fmt    = (n: number) => `$${n.toLocaleString('es-CO')}`
const fmtAny = (n: any)   => fmt(Number(n) || 0)
const iCls   = "w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3.5 text-white text-sm outline-none focus:border-aira-lime/60 transition-colors placeholder:text-white/25"
const lCls   = "block text-[9px] uppercase tracking-[0.2em] text-white/35 font-bold mb-1.5"

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin:(token:string,codigo:string,desc:string)=>void }) {
  const [codigo, setCodigo] = useState('')
  const [clave,  setClave]  = useState('')
  const [error,  setError]  = useState('')
  const [loading,setLoading]= useState(false)

  const submit = async () => {
    if (!codigo || !clave) { setError('Ingresa tu código y clave'); return }
    setLoading(true); setError('')
    const r = await fetch('/api/promotor-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: codigo.toUpperCase().trim(), clave: clave.trim() }),
    })
    const d = await r.json()
    if (!r.ok) { setError(d.error || 'Error de autenticación'); setLoading(false); return }
    localStorage.setItem(TOKEN_KEY,  d.token)
    localStorage.setItem(CODIGO_KEY, d.codigo)
    localStorage.setItem(DESC_KEY,   d.descripcion || d.codigo)
    onLogin(d.token, d.codigo, d.descripcion || d.codigo)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#030d06] flex flex-col" style={{fontFamily:"'Inter',sans-serif"}}>
      {/* Fondo AIRA */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#030d06] via-[#071f0f]/80 to-[#030d06] pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-aira-lime/5 rounded-full blur-[80px]"/>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo / brand */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-aira-lime/10 border border-aira-lime/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-aira-lime animate-pulse"/>
            <span className="text-[9px] uppercase tracking-[0.3em] text-aira-lime font-mono font-bold">Panel Promotor</span>
          </div>
          <h1 className="text-4xl font-display font-black text-white tracking-tight mb-2">AIRA</h1>
          <p className="text-white/35 text-sm">Gestión de registros y abonos</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 space-y-4">
          <div>
            <label className={lCls}>Código de referido</label>
            <input value={codigo} onChange={e=>setCodigo(e.target.value.toUpperCase())}
              onKeyDown={e=>e.key==='Enter'&&submit()}
              placeholder="Ej: JUANC2026"
              className={`${iCls} font-mono tracking-widest text-aira-lime`}/>
          </div>
          <div>
            <label className={lCls}>Clave de acceso</label>
            <input type="password" value={clave} onChange={e=>setClave(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&submit()}
              placeholder="••••••"
              className={iCls}/>
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          <button onClick={submit} disabled={loading||!codigo||!clave}
            className="w-full py-4 rounded-2xl bg-aira-lime text-black font-black text-base disabled:opacity-40 active:scale-95 transition-all">
            {loading ? 'Verificando…' : 'Ingresar →'}
          </button>
        </div>

        <p className="text-white/20 text-xs mt-8 text-center">
          Si no tienes clave, contacta al organizador del evento
        </p>
      </div>
    </div>
  )
}

// ── Nuevo registro ─────────────────────────────────────────────────────────────
function NuevoModal({token,codigo,onClose,onDone}:{token:string;codigo:string;onClose:()=>void;onDone:()=>void}) {
  const empty = {
    nombre:'',cedula:'',movil:'',email:'',
    paquete:PAQUETES[2].label,monto_total:String(PAQUETES[2].price),
    monto_recibido:'',medio_pago:'Efectivo',
    fecha_pago:new Date().toISOString().slice(0,10),
    notas:'',codigo_referido:codigo,
  }
  const [form,setForm]   = useState(empty)
  const [saving,setSaving]= useState(false)
  const [done,setDone]   = useState<any>(null)
  const [sending,setSending]=useState(false)
  const f=(k:keyof typeof empty)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setForm(p=>({...p,[k]:e.target.value}))
  const pendiente=(Number(form.monto_total)||0)-(Number(form.monto_recibido)||0)

  const save = async () => {
    if(!form.nombre||!form.movil){alert('Nombre y móvil son obligatorios');return}
    setSaving(true)
    const r=await fetch('/api/admin-registro',{method:'POST',headers:{'Content-Type':'application/json','x-promotor-token':token},body:JSON.stringify({...form,codigo_referido:codigo})})
    const d=await r.json()
    if(!r.ok){alert(d.error||'Error guardando');setSaving(false);return}
    setDone(d);setSaving(false)
  }

  const sendWA = async () => {
    if(!done||!form.movil)return; setSending(true)
    const url=`${BASE_URL}/boleta/${done.order_ref}`
    const msg=`✅ *Registro AIRA confirmado*\n\nHola *${done.nombre}* 🎉\nPaquete: *${done.paquete||'AIRA 2026'}*\nAbono recibido: *${fmtAny(done.monto_recibido)}*\nSaldo pendiente: *${fmtAny(done.monto_pendiente)}*\n\n📲 Tu comprobante:\n${url}\n\n📍 *AIRA Experience · Guatapé · Ago 2026*`
    await fetch('/api/send-wa',{method:'POST',headers:{'Content-Type':'application/json','x-promotor-token':token},body:JSON.stringify({phone:form.movil,message:msg})})
    setSending(false); alert('✅ Mensaje enviado por WhatsApp')
  }

  if(done) return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-5">
      <div className="w-full max-w-sm bg-[#0a0f0a] border border-aira-lime/20 rounded-3xl p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-aira-lime/10 border border-aira-lime/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-aira-lime"/>
          </div>
          <h3 className="text-xl font-black text-white mb-1">¡Registro guardado!</h3>
          <p className="text-white/40 text-sm">{done.nombre}</p>
          <p className="text-aira-lime/70 text-xs font-mono mt-1">{done.paquete}</p>
        </div>
        <div className="bg-white/[0.04] rounded-2xl p-4 mb-5 space-y-2.5 text-sm">
          <div className="flex justify-between"><span className="text-white/40">Abono</span><span className="text-aira-lime font-bold">{fmtAny(done.monto_recibido)}</span></div>
          <div className="flex justify-between"><span className="text-white/40">Pendiente</span><span className="text-amber-400 font-bold">{fmtAny(done.monto_pendiente)}</span></div>
          <div className="flex justify-between items-center"><span className="text-white/40">Ref.</span><span className="text-white font-mono text-xs bg-white/5 px-2 py-0.5 rounded-lg">{done.order_ref}</span></div>
        </div>
        <div className="space-y-2.5">
          <button onClick={sendWA} disabled={sending}
            className="w-full py-4 rounded-2xl bg-[#25D366] text-white font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 text-sm">
            <MessageCircle className="w-4 h-4"/>{sending?'Enviando…':'Enviar comprobante por WhatsApp'}
          </button>
          <button onClick={()=>navigator.clipboard.writeText(`${BASE_URL}/boleta/${done.order_ref}`).then(()=>alert('URL copiada'))}
            className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-semibold flex items-center justify-center gap-2 text-sm active:scale-95">
            <Copy className="w-4 h-4"/>Copiar URL
          </button>
          <button onClick={()=>{onDone();onClose()}} className="w-full py-2.5 text-white/30 text-sm font-medium">Cerrar</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end justify-center">
      <div className="w-full max-w-lg bg-[#060f07] border border-white/[0.08] rounded-t-3xl overflow-y-auto" style={{maxHeight:'94vh'}}>
        <div className="sticky top-0 bg-[#060f07] px-5 py-4 flex items-center justify-between border-b border-white/[0.06]">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-aira-lime/60 font-mono">Nuevo registro</p>
            <h2 className="text-base font-black text-white leading-none mt-0.5">Registrar pago manual</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center"><X className="w-4 h-4 text-white/40"/></button>
        </div>

        <div className="p-5 space-y-4 pb-8">
          {/* Datos */}
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 font-bold mb-3">Datos del cliente</p>
            <div className="space-y-3">
              <div><label className={lCls}>Nombre completo *</label><input className={iCls} value={form.nombre} onChange={f('nombre')} placeholder="Nombre completo"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lCls}>Móvil *</label><input className={iCls} value={form.movil} onChange={f('movil')} placeholder="300..." type="tel"/></div>
                <div><label className={lCls}>Cédula</label><input className={iCls} value={form.cedula} onChange={f('cedula')} placeholder="Documento"/></div>
              </div>
              <div><label className={lCls}>Email</label><input className={iCls} value={form.email} onChange={f('email')} placeholder="opcional" type="email"/></div>
            </div>
          </div>

          {/* Paquete */}
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 font-bold mb-3">Paquete</p>
            <select className={iCls} value={form.paquete} onChange={e=>{const o=PAQUETES.find(p=>p.label===e.target.value);setForm(p=>({...p,paquete:e.target.value,monto_total:String(o?.price||p.monto_total)}))}}>
              <optgroup label="── Paquete 3 Días ──">{PAQUETES.filter(p=>p.cat==='3 días').map(p=><option key={p.label} value={p.label}>{p.label} · {fmt(p.price)}</option>)}</optgroup>
              <optgroup label="── Add-ons ──">{PAQUETES.filter(p=>p.cat==='add-on').map(p=><option key={p.label} value={p.label}>{p.label} · {fmt(p.price)}</option>)}</optgroup>
              <optgroup label="── Boletería diaria ──">{PAQUETES.filter(p=>p.cat==='diario').map(p=><option key={p.label} value={p.label}>{p.label} · {fmt(p.price)}</option>)}</optgroup>
            </select>
          </div>

          {/* Pago */}
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 font-bold mb-3">Pago</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lCls}>Total</label><input className={iCls} type="number" value={form.monto_total} onChange={f('monto_total')}/></div>
              <div><label className={lCls}>Abono recibido</label><input className={iCls} type="number" value={form.monto_recibido} onChange={f('monto_recibido')} placeholder="0"/></div>
              <div><label className={lCls}>Medio</label>
                <select className={iCls} value={form.medio_pago} onChange={f('medio_pago')}>{MEDIOS.map(m=><option key={m}>{m}</option>)}</select>
              </div>
              <div><label className={lCls}>Fecha</label><input className={iCls} type="date" value={form.fecha_pago} onChange={f('fecha_pago')}/></div>
            </div>
          </div>

          {Number(form.monto_total)>0&&(
            <div className="flex justify-between items-center bg-amber-500/8 border border-amber-500/15 rounded-2xl px-5 py-3">
              <span className="text-amber-400/60 text-xs font-bold uppercase tracking-wider">Pendiente</span>
              <span className="text-amber-400 font-black text-xl">{fmt(pendiente)}</span>
            </div>
          )}

          <div>
            <label className={lCls}>Código referido</label>
            <input className={`${iCls} font-mono text-aira-lime/80`} value={form.codigo_referido} readOnly/>
          </div>
          <div><label className={lCls}>Notas</label><textarea className={`${iCls} resize-none`} rows={2} value={form.notas} onChange={f('notas')} placeholder="Observaciones opcionales"/></div>

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
  const [fecha,setFecha]=useState(new Date().toISOString().slice(0,10))
  const [notas,setNotas]=useState(''); const [saving,setSaving]=useState(false)
  const [sending,setSending]=useState(false); const [done,setDone]=useState(false)
  const pendiente=Number(reg.monto_pendiente)||0

  const save=async()=>{
    if(!monto||Number(monto)<=0){alert('Ingresa el monto');return}
    setSaving(true)
    const r=await fetch('/api/admin-registro',{method:'POST',headers:{'Content-Type':'application/json','x-promotor-token':token},body:JSON.stringify({_abono:true,id:reg.id,monto,medio_pago:medio,fecha_pago:fecha,notas})})
    if(!r.ok){alert('Error guardando abono');setSaving(false);return}
    setDone(true);setSaving(false);onDone()
  }

  const sendWA=async()=>{
    setSending(true)
    const url=`${BASE_URL}/boleta/${reg.order_ref}`
    const nuevoPend=Math.max(0,pendiente-Number(monto))
    const msg=`💰 *Abono AIRA registrado*\n\nHola *${reg.nombre}* 🎉\nAbono: *${fmt(Number(monto))}* (${medio})\nSaldo pendiente: *${fmt(nuevoPend)}*\n\n📲 Tu comprobante:\n${url}\n\n📍 *AIRA Experience · Guatapé · Ago 2026*`
    await fetch('/api/send-wa',{method:'POST',headers:{'Content-Type':'application/json','x-promotor-token':token},body:JSON.stringify({phone:reg.movil,message:msg})})
    setSending(false);alert('✅ Mensaje enviado')
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end justify-center">
      <div className="w-full max-w-sm bg-[#060f07] border border-white/[0.08] rounded-t-3xl p-5">
        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-4"/>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-black text-white text-base">{reg.nombre}</h3>
            <p className="text-white/35 text-xs mt-0.5">{reg.paquete}</p>
            <p className="text-amber-400 text-sm font-bold mt-1">Pendiente: {fmt(pendiente)}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0"><X className="w-4 h-4 text-white/40"/></button>
        </div>
        <div className="space-y-3 pb-2">
          <div><label className={lCls}>Monto del abono</label><input className={iCls} type="number" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0" autoFocus/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lCls}>Medio</label><select className={iCls} value={medio} onChange={e=>setMedio(e.target.value)}>{MEDIOS.map(m=><option key={m}>{m}</option>)}</select></div>
            <div><label className={lCls}>Fecha</label><input className={iCls} type="date" value={fecha} onChange={e=>setFecha(e.target.value)}/></div>
          </div>
          <div><label className={lCls}>Notas</label><input className={iCls} value={notas} onChange={e=>setNotas(e.target.value)} placeholder="opcional"/></div>
          {done?(
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2 text-aira-lime text-sm font-bold bg-aira-lime/8 border border-aira-lime/20 rounded-xl px-4 py-2.5">
                <CheckCircle2 className="w-4 h-4"/>Abono guardado correctamente
              </div>
              <button onClick={sendWA} disabled={sending}
                className="w-full py-4 rounded-2xl bg-[#25D366] text-white font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40">
                <MessageCircle className="w-4 h-4"/>{sending?'Enviando…':'Enviar comprobante por WhatsApp'}
              </button>
              <button onClick={onClose} className="w-full py-2.5 text-white/30 text-sm text-center">Cerrar</button>
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
  const [token,  setToken]  = useState(()=>localStorage.getItem(TOKEN_KEY)||'')
  const [codigo, setCodigo] = useState(()=>localStorage.getItem(CODIGO_KEY)||'')
  const [desc,   setDesc]   = useState(()=>localStorage.getItem(DESC_KEY)||'')
  const [regs,   setRegs]   = useState<any[]>([])
  const [loading,setLoading]= useState(false)
  const [search, setSearch] = useState('')
  const [showNew,setShowNew]= useState(false)
  const [abonoReg,setAbonoReg]=useState<any>(null)
  const [tab,    setTab]    = useState<'registros'|'stats'>('registros')

  const stats = {
    total:     regs.length,
    recaudado: regs.reduce((s,r)=>s+Number(r.monto_recibido||0),0),
    pendiente: regs.reduce((s,r)=>s+Number(r.monto_pendiente||0),0),
  }

  const fetchRegs=useCallback(async()=>{
    if(!token)return; setLoading(true)
    const r=await fetch('/api/promotor-auth',{headers:{'x-promotor-token':token}})
    if(r.status===401){localStorage.removeItem(TOKEN_KEY);setToken('');setLoading(false);return}
    const d=await r.json()
    setRegs(d.registros||[])
    setLoading(false)
  },[token])

  useEffect(()=>{if(token)fetchRegs()},[token,fetchRegs])

  const logout=()=>{
    localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(CODIGO_KEY);localStorage.removeItem(DESC_KEY)
    setToken('');setCodigo('');setDesc('')
  }

  if(!token) return <LoginScreen onLogin={(t,c,d)=>{setToken(t);setCodigo(c);setDesc(d)}}/>

  const filtered=regs.filter(r=>!search||r.nombre?.toLowerCase().includes(search.toLowerCase())||r.movil?.includes(search)||r.cedula?.includes(search))

  return (
    <div className="min-h-screen bg-[#030d06] flex flex-col" style={{fontFamily:"'Inter',sans-serif"}}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#030d06]/95 backdrop-blur-md border-b border-white/[0.06] px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-aira-lime animate-pulse"/>
              <p className="text-[9px] uppercase tracking-[0.25em] text-aira-lime/70 font-mono">Panel Promotor</p>
            </div>
            <h1 className="text-white font-black text-lg leading-none">{desc || codigo}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setShowNew(true)}
              className="flex items-center gap-1.5 bg-aira-lime text-black px-3.5 py-2 rounded-full text-xs font-black active:scale-95 transition-all">
              <Plus className="w-3.5 h-3.5"/>Nuevo
            </button>
            <button onClick={logout} className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <LogOut className="w-3.5 h-3.5 text-white/35"/>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 border-b border-white/[0.06]">
        {[
          {label:'Registros',value:String(stats.total),      icon:<Users className="w-3 h-3"/>},
          {label:'Recaudado',value:fmt(stats.recaudado),     icon:<DollarSign className="w-3 h-3"/>},
          {label:'Pendiente',value:fmt(stats.pendiente),     icon:<ClipboardList className="w-3 h-3"/>},
        ].map((s,i)=>(
          <div key={s.label} className={`px-3 py-4 text-center ${i<2?'border-r border-white/[0.06]':''}`}>
            <div className="flex items-center justify-center gap-1 text-white/20 mb-1">{s.icon}<span className="text-[8px] uppercase tracking-wider">{s.label}</span></div>
            <p className="text-white font-black text-sm tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3">
          <Search className="w-4 h-4 text-white/25 shrink-0"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar por nombre, móvil o cédula…"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/20"/>
          {search&&<button onClick={()=>setSearch('')}><X className="w-4 h-4 text-white/25"/></button>}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2.5">
        {loading&&<p className="text-center text-white/25 py-12 text-sm">Cargando registros…</p>}
        {!loading&&filtered.length===0&&(
          <div className="text-center py-12">
            <p className="text-white/20 text-4xl mb-3">📋</p>
            <p className="text-white/25 text-sm">{search?'Sin resultados para esa búsqueda':'Aún no tienes registros'}</p>
          </div>
        )}
        {filtered.map(r=>(
          <div key={r.id} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 active:bg-white/[0.05] transition-colors">
            <div className="flex items-start justify-between mb-2.5">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-white font-bold text-sm truncate">{r.nombre}</p>
                <p className="text-white/35 text-[11px] truncate mt-0.5">{r.paquete||'—'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-aira-lime font-black text-base tabular-nums">{fmtAny(r.monto_recibido)}</p>
                {Number(r.monto_pendiente)>0&&(
                  <p className="text-amber-400/80 text-[11px] tabular-nums">-{fmtAny(r.monto_pendiente)}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/25 mb-3">
              {r.movil&&<span>📱 {r.movil}</span>}
              {r.medio_pago&&<span>💳 {r.medio_pago}</span>}
              {r.fecha_pago&&<span>{new Date(r.fecha_pago).toLocaleDateString('es-CO',{day:'2-digit',month:'short'})}</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setAbonoReg(r)}
                className="flex-1 py-2.5 rounded-xl bg-aira-lime/8 text-aira-lime text-xs font-bold border border-aira-lime/15 active:scale-95 transition-all">
                + Abonar
              </button>
              <a href={`${BASE_URL}/boleta/${r.order_ref}`} target="_blank" rel="noopener noreferrer"
                className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 text-xs font-bold flex items-center gap-1 active:scale-95">
                Ver<ChevronRight className="w-3 h-3"/>
              </a>
            </div>
          </div>
        ))}
      </div>

      {showNew&&<NuevoModal token={token} codigo={codigo} onClose={()=>setShowNew(false)} onDone={fetchRegs}/>}
      {abonoReg&&<AbonoModal reg={abonoReg} token={token} onClose={()=>setAbonoReg(null)} onDone={fetchRegs}/>}
    </div>
  )
}
