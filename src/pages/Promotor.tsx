import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, ChevronRight, X, Plus, Search, Copy, LogOut, Users, DollarSign, ClipboardList, MessageCircle, LayoutList, UserPlus, RefreshCw } from 'lucide-react'

const TOKEN_KEY  = 'aira_promotor_token'
const CODIGO_KEY = 'aira_promotor_codigo'
const DESC_KEY   = 'aira_promotor_desc'
const BASE_URL   = 'https://www.viveaira.live'

const PAQUETES = [
  { label:'Paquete 3D · Referidos',  price:724500,  cat:'paquete' },
  { label:'Cabaña AIRA · 8va Etapa', price:4830000, cat:'cabaña'  },
]
const MEDIOS = ['Efectivo','Nequi','Daviplata','Transferencia','Bold','Otro']
const fmt    = (n:number) => `$${n.toLocaleString('es-CO')}`
const fmtAny = (n:any)   => fmt(Number(n)||0)
const iCls   = "w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3.5 text-white text-sm outline-none focus:border-aira-lime/60 transition-colors placeholder:text-white/25"
const lCls   = "block text-[9px] uppercase tracking-[0.2em] text-white/35 font-bold mb-1.5"

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({onLogin}:{onLogin:(t:string,c:string,d:string)=>void}) {
  const [codigo,setCodigo]=useState(''); const [clave,setClave]=useState('')
  const [error,setError]=useState('');   const [loading,setLoading]=useState(false)

  const submit=async()=>{
    if(!codigo||!clave){setError('Ingresa tu código y clave');return}
    setLoading(true);setError('')
    const r=await fetch('/api/promotor-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({codigo:codigo.toUpperCase().trim(),clave:clave.trim()})})
    const d=await r.json()
    if(!r.ok){setError(d.error||'Error de autenticación');setLoading(false);return}
    localStorage.setItem(TOKEN_KEY,d.token);localStorage.setItem(CODIGO_KEY,d.codigo);localStorage.setItem(DESC_KEY,d.descripcion||d.codigo)
    onLogin(d.token,d.codigo,d.descripcion||d.codigo);setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#030d06] flex flex-col" style={{fontFamily:"'Inter',sans-serif"}}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-aira-lime/5 rounded-full blur-[80px]"/>
      </div>
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-aira-lime/10 border border-aira-lime/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-aira-lime animate-pulse"/>
            <span className="text-[9px] uppercase tracking-[0.3em] text-aira-lime font-mono font-bold">Panel Promotor</span>
          </div>
          <h1 className="text-4xl font-display font-black text-white tracking-tight mb-2">AIRA</h1>
          <p className="text-white/35 text-sm">Gestión de registros y abonos</p>
        </div>
        <div className="w-full max-w-sm bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 space-y-4">
          <div>
            <label className={lCls}>Código de referido</label>
            <input value={codigo} onChange={e=>setCodigo(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&submit()}
              placeholder="Ej: JUANC2026" className={`${iCls} font-mono tracking-widest text-aira-lime`}/>
          </div>
          <div>
            <label className={lCls}>Clave de acceso</label>
            <input type="password" value={clave} onChange={e=>setClave(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}
              placeholder="••••••" className={iCls}/>
          </div>
          {error&&<div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5"><p className="text-red-400 text-sm">{error}</p></div>}
          <button onClick={submit} disabled={loading||!codigo||!clave}
            className="w-full py-4 rounded-2xl bg-aira-lime text-black font-black text-base disabled:opacity-40 active:scale-95 transition-all">
            {loading?'Verificando…':'Ingresar →'}
          </button>
        </div>
        <p className="text-white/20 text-xs mt-8 text-center">Si no tienes clave, contacta al organizador</p>
      </div>
    </div>
  )
}

// ── Registro card ─────────────────────────────────────────────────────────────
function RegCard({r,token,onRefresh}:{r:any;token:string;onRefresh:()=>void}) {
  const [sending,setSending]=useState(false)
  const [sent,setSent]=useState(false)
  const [showAbono,setShowAbono]=useState(false)
  const [monto,setMonto]=useState('');const [medio,setMedio]=useState('Efectivo')
  const [fecha,setFecha]=useState(new Date().toISOString().slice(0,10))
  const [savingAbono,setSavingAbono]=useState(false);const [abonoOk,setAbonoOk]=useState(false)
  const pendiente=Number(r.monto_pendiente)||0

  const sendWA=async()=>{
    setSending(true)
    const url=`${BASE_URL}/boleta/${r.order_ref}`
    const msg=`✅ *Registro AIRA*\n\nHola *${r.nombre}* 🎉\nPaquete: *${r.paquete||'AIRA 2026'}*\nAbono: *${fmtAny(r.monto_recibido)}*\nPendiente: *${fmtAny(r.monto_pendiente)}*\n\n📲 Tu comprobante:\n${url}\n\n📍 *AIRA Experience · Guatapé · Ago 2026*`
    await fetch('/api/send-wa',{method:'POST',headers:{'Content-Type':'application/json','x-promotor-token':token},body:JSON.stringify({phone:r.movil,message:msg})})
    setSending(false);setSent(true);setTimeout(()=>setSent(false),3000)
  }

  const saveAbono=async()=>{
    if(!monto||Number(monto)<=0){alert('Ingresa el monto');return}
    setSavingAbono(true)
    const res=await fetch('/api/admin-registro',{method:'POST',headers:{'Content-Type':'application/json','x-promotor-token':token},body:JSON.stringify({_abono:true,id:r.id,monto,medio_pago:medio,fecha_pago:fecha})})
    if(!res.ok){alert('Error guardando abono');setSavingAbono(false);return}
    setAbonoOk(true);setSavingAbono(false);onRefresh()
    // Auto send WA after abono
    const url=`${BASE_URL}/boleta/${r.order_ref}`
    const nuevoPend=Math.max(0,pendiente-Number(monto))
    const msg=`💰 *Abono AIRA*\n\nHola *${r.nombre}* 🎉\nAbono: *${fmt(Number(monto))}* (${medio})\nSaldo pendiente: *${fmt(nuevoPend)}*\n\n📲 Tu comprobante:\n${url}\n\n📍 *AIRA Experience · Guatapé · Ago 2026*`
    await fetch('/api/send-wa',{method:'POST',headers:{'Content-Type':'application/json','x-promotor-token':token},body:JSON.stringify({phone:r.movil,message:msg})})
    setTimeout(()=>{setShowAbono(false);setAbonoOk(false);setMonto('')},1500)
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
      {/* Main info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-white font-bold text-sm truncate">{r.nombre}</p>
            <p className="text-white/35 text-[11px] truncate mt-0.5">{r.paquete||'—'}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-aira-lime font-black text-base tabular-nums">{fmtAny(r.monto_recibido)}</p>
            {pendiente>0&&<p className="text-amber-400/80 text-[11px] tabular-nums">-{fmtAny(pendiente)}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-white/25 mb-3">
          {r.movil&&<span>📱 {r.movil}</span>}
          {r.medio_pago&&<span>💳 {r.medio_pago}</span>}
          {r.fecha_pago&&<span>{new Date(r.fecha_pago).toLocaleDateString('es-CO',{day:'2-digit',month:'short'})}</span>}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={sendWA} disabled={sending||!r.movil}
            className={`col-span-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 border ${sent?'bg-green-500/10 border-green-500/20 text-green-400':sending?'bg-white/5 border-white/10 text-white/30':'bg-[#25D366]/10 border-[#25D366]/20 text-[#25D366]'}`}>
            <MessageCircle className="w-3.5 h-3.5 shrink-0"/>
            {sent?'Enviado':'WA'}
          </button>
          <button onClick={()=>setShowAbono(v=>!v)}
            className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 border ${showAbono?'bg-aira-lime/15 border-aira-lime/30 text-aira-lime':'bg-white/[0.04] border-white/[0.08] text-white/50'}`}>
            <Plus className="w-3.5 h-3.5"/>Abonar
          </button>
          <a href={`${BASE_URL}/boleta/${r.order_ref}`} target="_blank" rel="noopener noreferrer"
            className="py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 bg-white/[0.04] border border-white/[0.08] text-white/40 active:scale-95 transition-all">
            Ver<ChevronRight className="w-3 h-3"/>
          </a>
        </div>
      </div>

      {/* Abono inline */}
      {showAbono&&(
        <div className="border-t border-white/[0.06] p-4 bg-white/[0.02]">
          {abonoOk?(
            <div className="flex items-center gap-2 text-green-400 text-sm font-bold py-1">
              <CheckCircle2 className="w-4 h-4"/>Abono guardado · WA enviado
            </div>
          ):(
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className={lCls}>Monto</label>
                  <input className={iCls} type="number" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0" autoFocus/>
                </div>
                <div className="col-span-1">
                  <label className={lCls}>Medio</label>
                  <select className={iCls} value={medio} onChange={e=>setMedio(e.target.value)}>
                    {MEDIOS.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className={lCls}>Fecha</label>
                  <input className={iCls} type="date" value={fecha} onChange={e=>setFecha(e.target.value)}/>
                </div>
              </div>
              <button onClick={saveAbono} disabled={savingAbono||!monto}
                className="w-full py-3 rounded-xl bg-aira-lime text-black font-black text-sm disabled:opacity-40 active:scale-95 transition-all">
                {savingAbono?'Guardando…':'Guardar abono + enviar WA 📲'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Nuevo Registro form ───────────────────────────────────────────────────────
function NuevoRegistro({token,codigo,onDone}:{token:string;codigo:string;onDone:()=>void}) {
  const empty={nombre:'',cedula:'',movil:'',email:'',paquete:PAQUETES[0].label,monto_total:String(PAQUETES[0].price),monto_recibido:'',medio_pago:'Efectivo',fecha_pago:new Date().toISOString().slice(0,10),notas:'',codigo_referido:codigo}
  const [form,setForm]=useState(empty);const [saving,setSaving]=useState(false);const [done,setDone]=useState<any>(null)
  const [sending,setSending]=useState(false)
  const f=(k:keyof typeof empty)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setForm(p=>({...p,[k]:e.target.value}))
  const pendiente=(Number(form.monto_total)||0)-(Number(form.monto_recibido)||0)

  const save=async()=>{
    if(!form.nombre||!form.movil){alert('Nombre y móvil son obligatorios');return}
    setSaving(true)
    const r=await fetch('/api/admin-registro',{method:'POST',headers:{'Content-Type':'application/json','x-promotor-token':token},body:JSON.stringify({...form,codigo_referido:codigo})})
    const d=await r.json()
    if(!r.ok){alert(d.error||'Error guardando');setSaving(false);return}
    setDone(d);setSaving(false)
  }

  const sendWA=async()=>{
    if(!done||!form.movil)return;setSending(true)
    const url=`${BASE_URL}/boleta/${done.order_ref}`
    const msg=`✅ *Registro AIRA confirmado*\n\nHola *${done.nombre}* 🎉\nPaquete: *${done.paquete||'AIRA 2026'}*\nAbono: *${fmtAny(done.monto_recibido)}*\nPendiente: *${fmtAny(done.monto_pendiente)}*\n\n📲 Tu comprobante:\n${url}\n\n📍 *AIRA Experience · Guatapé · Ago 2026*`
    await fetch('/api/send-wa',{method:'POST',headers:{'Content-Type':'application/json','x-promotor-token':token},body:JSON.stringify({phone:form.movil,message:msg})})
    setSending(false);alert('✅ Enviado por WhatsApp')
  }

  if(done) return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-aira-lime/10 border border-aira-lime/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-aira-lime"/>
        </div>
        <h3 className="text-xl font-black text-white mb-1">¡Registro guardado!</h3>
        <p className="text-white/40 text-sm mb-1">{done.nombre}</p>
        <p className="text-aira-lime/60 text-xs font-mono mb-6">{done.paquete}</p>
        <div className="bg-white/[0.04] rounded-2xl p-4 mb-5 space-y-2.5 text-sm">
          <div className="flex justify-between"><span className="text-white/40">Abono</span><span className="text-aira-lime font-bold">{fmtAny(done.monto_recibido)}</span></div>
          <div className="flex justify-between"><span className="text-white/40">Pendiente</span><span className="text-amber-400 font-bold">{fmtAny(done.monto_pendiente)}</span></div>
          <div className="flex justify-between"><span className="text-white/40">Ref.</span><span className="text-white font-mono text-xs">{done.order_ref}</span></div>
        </div>
        <div className="space-y-2.5">
          <button onClick={sendWA} disabled={sending}
            className="w-full py-4 rounded-2xl bg-[#25D366] text-white font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 text-sm">
            <MessageCircle className="w-4 h-4"/>{sending?'Enviando…':'Enviar comprobante por WhatsApp'}
          </button>
          <button onClick={()=>navigator.clipboard.writeText(`${BASE_URL}/boleta/${done.order_ref}`).then(()=>alert('URL copiada'))}
            className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-sm flex items-center justify-center gap-2 active:scale-95">
            <Copy className="w-4 h-4"/>Copiar URL comprobante
          </button>
          <button onClick={()=>{setDone(null);setForm(empty);onDone()}} className="w-full py-2.5 text-white/30 text-sm">Nuevo registro</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-5 pb-8">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 font-bold mb-3">Datos del cliente</p>
          <div className="space-y-3">
            <div><label className={lCls}>Nombre completo *</label><input className={iCls} value={form.nombre} onChange={f('nombre')} placeholder="Nombre completo"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lCls}>Móvil *</label><input className={iCls} value={form.movil} onChange={f('movil')} placeholder="300..." type="tel"/></div>
              <div><label className={lCls}>Cédula</label><input className={iCls} value={form.cedula} onChange={f('cedula')} placeholder="Documento"/></div>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 font-bold mb-3">Paquete</p>
          <select className={iCls} value={form.paquete} onChange={e=>{const o=PAQUETES.find(p=>p.label===e.target.value);setForm(p=>({...p,paquete:e.target.value,monto_total:String(o?.price||p.monto_total)}))}}>
            <optgroup label="Paquete 3 Días">{PAQUETES.filter(p=>p.cat==='3 días').map(p=><option key={p.label} value={p.label}>{p.label} · {fmt(p.price)}</option>)}</optgroup>
            <optgroup label="Add-ons">{PAQUETES.filter(p=>p.cat==='add-on').map(p=><option key={p.label} value={p.label}>{p.label} · {fmt(p.price)}</option>)}</optgroup>
            <optgroup label="Boletería diaria">{PAQUETES.filter(p=>p.cat==='diario').map(p=><option key={p.label} value={p.label}>{p.label} · {fmt(p.price)}</option>)}</optgroup>
          </select>
        </div>

        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 font-bold mb-3">Pago</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lCls}>Total</label><input className={iCls} type="number" value={form.monto_total} onChange={f('monto_total')}/></div>
            <div><label className={lCls}>Abono recibido</label><input className={iCls} type="number" value={form.monto_recibido} onChange={f('monto_recibido')} placeholder="0"/></div>
            <div><label className={lCls}>Medio</label><select className={iCls} value={form.medio_pago} onChange={f('medio_pago')}>{MEDIOS.map(m=><option key={m}>{m}</option>)}</select></div>
            <div><label className={lCls}>Fecha</label><input className={iCls} type="date" value={form.fecha_pago} onChange={f('fecha_pago')}/></div>
          </div>
        </div>

        {Number(form.monto_total)>0&&(
          <div className="flex justify-between items-center bg-amber-500/8 border border-amber-500/15 rounded-2xl px-5 py-3">
            <span className="text-amber-400/60 text-xs font-bold uppercase tracking-wider">Pendiente</span>
            <span className="text-amber-400 font-black text-xl">{fmt(pendiente)}</span>
          </div>
        )}

        <div><label className={lCls}>Notas</label><textarea className={`${iCls} resize-none`} rows={2} value={form.notas} onChange={f('notas')} placeholder="Observaciones opcionales"/></div>
        <div><label className={lCls}>Código referido</label><input className={`${iCls} font-mono text-aira-lime/70`} value={form.codigo_referido} readOnly/></div>

        <button onClick={save} disabled={saving||!form.nombre||!form.movil}
          className="w-full py-4 rounded-2xl bg-aira-lime text-black font-black text-base disabled:opacity-40 active:scale-95 transition-all">
          {saving?'Guardando…':'Guardar registro →'}
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Promotor() {
  // Reducir volumen de audio del sitio al 20% cuando está en /promotor
  useEffect(() => {
    const audios = document.querySelectorAll('audio')
    audios.forEach(a => { a.volume = 0.2 })
    return () => {
      // Restaurar al salir
      audios.forEach(a => { a.volume = 0.55 })
    }
  }, [])

  const [token,  setToken] =useState(()=>localStorage.getItem(TOKEN_KEY)||'')
  const [codigo,setCodigo] =useState(()=>localStorage.getItem(CODIGO_KEY)||'')
  const [desc,   setDesc]  =useState(()=>localStorage.getItem(DESC_KEY)||'')
  const [regs,   setRegs]  =useState<any[]>([])
  const [loading,setLoading]=useState(false)
  const [search, setSearch]=useState('')
  const [tab,    setTab]   =useState<'ventas'|'nuevo'>('ventas')

  const stats={
    total:     regs.length,
    recaudado: regs.reduce((s,r)=>s+Number(r.monto_recibido||0),0),
    pendiente: regs.reduce((s,r)=>s+Number(r.monto_pendiente||0),0),
  }

  const fetchRegs=useCallback(async()=>{
    if(!token)return; setLoading(true)
    const r=await fetch('/api/promotor-auth',{headers:{'x-promotor-token':token}})
    if(r.status===401){localStorage.removeItem(TOKEN_KEY);setToken('');setLoading(false);return}
    const d=await r.json(); setRegs(d.registros||[]); setLoading(false)
  },[token])

  useEffect(()=>{if(token)fetchRegs()},[token,fetchRegs])

  const logout=()=>{
    [TOKEN_KEY,CODIGO_KEY,DESC_KEY].forEach(k=>localStorage.removeItem(k))
    setToken('');setCodigo('');setDesc('')
  }

  if(!token) return <LoginScreen onLogin={(t,c,d)=>{setToken(t);setCodigo(c);setDesc(d)}}/>

  const filtered=regs.filter(r=>!search||r.nombre?.toLowerCase().includes(search.toLowerCase())||r.movil?.includes(search)||r.cedula?.includes(search))

  return (
    <div className="bg-[#030d06] flex flex-col" style={{fontFamily:"'Inter',sans-serif",height:"100dvh",maxHeight:"100dvh"}}>

      {/* Header */}
      <div className="bg-[#030d06]/95 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-aira-lime animate-pulse"/>
            <p className="text-[9px] uppercase tracking-[0.25em] text-aira-lime/70 font-mono">AIRA Promotor</p>
          </div>
          <h1 className="text-white font-black text-base leading-none">{desc||codigo}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRegs} disabled={loading}
            className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <RefreshCw className={`w-3.5 h-3.5 text-white/35 ${loading?'animate-spin':''}`}/>
          </button>
          <button onClick={logout} className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <LogOut className="w-3.5 h-3.5 text-white/35"/>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 border-b border-white/[0.06] shrink-0">
        {[
          {label:'Registros',value:String(stats.total),icon:<Users className="w-3 h-3"/>},
          {label:'Recaudado',value:fmt(stats.recaudado),icon:<DollarSign className="w-3 h-3"/>},
          {label:'Pendiente',value:fmt(stats.pendiente),icon:<ClipboardList className="w-3 h-3"/>},
        ].map((s,i)=>(
          <div key={s.label} className={`px-3 py-3 text-center ${i<2?'border-r border-white/[0.06]':''}`}>
            <div className="flex items-center justify-center gap-1 text-white/20 mb-1">{s.icon}<span className="text-[8px] uppercase tracking-wider">{s.label}</span></div>
            <p className="text-white font-black text-sm tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {tab==='ventas'&&(
          <>
            {/* Search */}
            <div className="px-4 py-3 shrink-0">
              <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3">
                <Search className="w-4 h-4 text-white/25 shrink-0"/>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Buscar nombre, móvil, cédula…"
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/20"/>
                {search&&<button onClick={()=>setSearch('')}><X className="w-4 h-4 text-white/25"/></button>}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2.5">
              {loading&&<p className="text-center text-white/25 py-10 text-sm">Cargando…</p>}
              {!loading&&filtered.length===0&&(
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-white/25 text-sm">{search?'Sin resultados':'Aún no tienes registros'}</p>
                  <button onClick={()=>setTab('nuevo')} className="mt-4 px-4 py-2 rounded-full bg-aira-lime/10 text-aira-lime text-xs font-bold border border-aira-lime/20">
                    + Crear primer registro
                  </button>
                </div>
              )}
              {filtered.map(r=><RegCard key={r.id} r={r} token={token} onRefresh={fetchRegs}/>)}
            </div>
          </>
        )}

        {tab==='nuevo'&&(
          <NuevoRegistro token={token} codigo={codigo} onDone={()=>{fetchRegs();setTab('ventas')}}/>
        )}
      </div>

      {/* Tab bar — fixed bottom, always visible */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#030d06]/95 backdrop-blur-md border-t border-white/[0.06] grid grid-cols-2"
        style={{paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
        {[
          {id:'ventas', label:'Ventas', icon:<LayoutList className="w-5 h-5"/>},
          {id:'nuevo',  label:'Nuevo',  icon:<UserPlus className="w-5 h-5"/>},
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            className={`relative flex flex-col items-center gap-1 py-3.5 transition-all active:opacity-70 ${tab===t.id?'text-aira-lime':'text-white/30'}`}>
            {t.icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
            {tab===t.id&&<div className="absolute bottom-0 inset-x-0 h-0.5 bg-aira-lime rounded-full"/>}
          </button>
        ))}
      </div>
    </div>
  )
}
