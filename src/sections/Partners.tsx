import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Users, Target, MapPin, Anchor,
  Menu, X, Shield, Calendar,
  Waves, Building2, Briefcase,
  Video, Star, Headphones, Globe, Instagram,
  ExternalLink,
} from 'lucide-react';

// ─── Global styles
const GLOBAL_STYLE = '@keyframes fadeIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }';

// ─── Brand colors ──────────────────────────────────────────────────────────────
const LIME  = '#e1fe52';
const DARK  = '#00164c';
const BLACK = '#030612';

const WHATSAPP_URL  = 'https://wa.me/573003062259';
const INSTAGRAM_URL = 'https://instagram.com/viveaira';
const WEBSITE_URL   = 'https://www.viveaira.live';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} className={className}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity .7s ease ${delay}ms, transform .7s ease ${delay}ms`,
      }}>
      {children}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const links = [
    { href: '#resumen',      label: 'Resumen' },
    { href: '#ecosistema',   label: 'Ecosistema' },
    { href: '#itinerario',   label: 'Itinerario' },
    { href: '#aliados',      label: 'Aliados' },
    { href: '#patrocinios',  label: 'Patrocinios' },
  ];

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/8' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center">
          <img src="/AIRA BLANCO.png" alt="AIRA" className="h-24 w-auto object-contain" />
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a key={l.href} href={l.href}
              className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/50 hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-all"
            style={{ background: LIME, color: DARK }}>
            Contactar
          </a>
          <button onClick={() => setOpen(v => !v)} className="md:hidden text-white p-2">
            {open ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-black/95 backdrop-blur-2xl p-8 flex flex-col gap-6 border-b border-white/8">
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="font-display text-2xl text-white/80 hover:text-aira-lime transition-colors uppercase tracking-wider">
              {l.label}
            </a>
          ))}
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest"
            style={{ background: LIME, color: DARK }}>
            Contactar vía WhatsApp
          </a>
        </div>
      )}
    </nav>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px w-10 bg-aira-lime"/>
      <span className="font-mono-custom text-[10px] uppercase tracking-[0.4em]" style={{ color: LIME }}>{children}</span>
    </div>
  );
}

// ─── Image hover tooltip ─────────────────────────────────────────────────────
function ImageHover({ src, children, href, className = '' }: {
  src: string; children: React.ReactNode; href?: string; className?: string;
}) {
  const [hov, setHov] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const onMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const Tag = href ? 'a' : 'div';
  const tagProps = href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <Tag {...tagProps as any} className={`relative inline-block cursor-pointer ${className}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onMouseMove={onMove}>
      {children}
      {hov && (
        <div className="pointer-events-none fixed z-[200] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          style={{
            left: pos.x + 20, top: pos.y - 60,
            width: '400px', height: '260px',
            position: 'fixed',
            animation: 'fadeIn .15s ease',
          }}>
          <img src={src} alt="" className="w-full h-full object-cover"/>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,6,18,0.6), transparent)' }}/>
        </div>
      )}
    </Tag>
  );
}

// ─── Tier card ────────────────────────────────────────────────────────────────
function TierCard({ letter, title, focus, contribution, benefits, delay = 0 }: {
  letter: string; title: string; focus: string;
  contribution: string; benefits: string[]; delay?: number;
}) {
  return (
    <Reveal delay={delay}
      className="flex flex-col p-8 md:p-10 rounded-3xl border border-white/8 bg-white/[0.03] hover:border-aira-lime/30 hover:bg-white/[0.05] transition-all duration-500 group">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-display text-xl"
          style={{ background: `${LIME}15`, color: LIME }}>
          {letter}
        </div>
        <div>
          <h3 className="font-display text-xl md:text-2xl text-white leading-tight">{title}</h3>
          <p className="font-mono-custom text-[10px] uppercase tracking-widest mt-1" style={{ color: LIME }}>{focus}</p>
        </div>
      </div>

      <p className="text-white/45 text-sm leading-relaxed mb-6 flex-1">{contribution}</p>

      <div className="border-t border-white/8 pt-5 space-y-2">
        <p className="font-mono-custom text-[9px] uppercase tracking-widest text-white/30 mb-3">Beneficios exclusivos</p>
        {benefits.map((b, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: LIME }}/>
            <p className="text-sm text-white/60 leading-snug">{b}</p>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

// ─── Ally card ────────────────────────────────────────────────────────────────
function AllyGroup({ category, items }: { category: string; items: { name: string; link?: string; img?: string }[] }) {
  return (
    <div className="p-6 rounded-2xl border border-white/8 bg-white/[0.02] hover:border-white/15 transition-all">
      <p className="font-mono-custom text-[9px] uppercase tracking-[0.35em] text-white/30 mb-4 pb-3 border-b border-white/8">
        {category}
      </p>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i}>
            {item.link && item.img ? (
              <ImageHover src={item.img} href={item.link} className="flex items-center justify-between text-sm text-white/50 hover:text-aira-lime transition-colors w-full">
                <span>{item.name}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'inherit' }}/>
              </ImageHover>
            ) : item.link ? (
              <a href={item.link} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between text-sm text-white/50 hover:text-aira-lime transition-colors">
                {item.name}
                <ExternalLink className="w-3 h-3"/>
              </a>
            ) : (
              <span className="text-sm text-white/50">{item.name}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Partners() {


  useEffect(() => {
    // Stop lenis if active
    const lenis = (window as any).__lenis;
    if (lenis) lenis.start();


    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: BLACK, fontFamily: 'Figtree, sans-serif' }}>
      <style>{GLOBAL_STYLE}</style>
      <Navbar/>

      {/* ── HERO ── */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Clean dark BG with subtle grid */}
        <div className="absolute inset-0 z-0" style={{ background: BLACK }}/>
        <div className="absolute inset-0 z-0 opacity-[0.04]"
          style={{ backgroundImage:'radial-gradient(circle,#e1fe52 1px,transparent 1px)', backgroundSize:'40px 40px' }}/>
        <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(ellipse at center, rgba(225,254,82,0.05) 0%, transparent 70%)' }}/>

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto flex flex-col items-center">
          <div className="flex items-center gap-3 mb-8 px-5 py-2.5 rounded-full border border-aira-lime/30 bg-aira-lime/8">
            <Calendar className="w-4 h-4" style={{ color: LIME }}/>
            <span className="font-mono-custom text-xs uppercase tracking-[0.25em]" style={{ color: LIME }}>
              15 — 17 Agosto 2026 · Guatapé, Colombia
            </span>
          </div>

          <h1 className="font-display text-6xl md:text-8xl lg:text-[7rem] text-white leading-none mb-4">
            AIRA
          </h1>
          <p className="font-mono-custom text-xs md:text-sm uppercase tracking-[0.5em] text-white/50 mb-6">
            Propuesta de Patrocinio Comercial
          </p>
          <p className="text-white/60 text-lg md:text-xl max-w-2xl leading-relaxed mb-12 font-light italic">
            "Conectamos marcas visionarias con una audiencia cautiva de alto poder adquisitivo"
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="#patrocinios"
              className="flex items-center gap-2 px-8 py-4 font-display text-sm uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95"
              style={{ background: LIME, color: DARK }}>
              Ver oportunidades <ArrowRight className="w-4 h-4"/>
            </a>
            <a href="#ecosistema"
              className="flex items-center gap-2 px-8 py-4 border border-white/20 text-white font-display text-sm uppercase tracking-[0.2em] hover:bg-white/8 transition-all">
              Resumen ejecutivo
            </a>
          </div>
        </div>
      </section>

      {/* ── QUIÉNES SOMOS ── */}
      <section id="resumen" className="py-28 md:py-36 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <Reveal>
              <Label>El Respaldo Corporativo</Label>
              <h2 className="font-display text-5xl md:text-6xl text-white leading-none mb-6">Quiénes Somos</h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Detrás de AIRA Experience se encuentra <strong className="text-white">VIVE AIRA S.A.S.</strong>, una compañía concebida con una visión clara: redefinir los estándares del entretenimiento y el estilo de vida premium en Colombia.
              </p>
            </Reveal>

            <div className="space-y-5">
              {[
                { icon: <Users className="w-5 h-5"/>, title: 'Equipo Multidisciplinario', desc: 'Expertos en diseño corporativo, estrategias financieras, curaduría artística y logística de alto nivel.' },
                { icon: <Briefcase className="w-5 h-5"/>, title: 'Estética & Precisión', desc: 'Operamos bajo una estética minimalista y profundamente profesional que refleja el lujo moderno.' },
                { icon: <Shield className="w-5 h-5"/>, title: 'Respaldo Corporativo', desc: 'Garantizamos una ejecución impecable y un soporte sólido para nuestros inversionistas y aliados.' },
              ].map((item, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className="flex items-start gap-4 p-5 rounded-2xl border border-white/6 bg-white/[0.02] hover:border-aira-lime/20 transition-all">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${LIME}15`, color: LIME }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm mb-1">{item.title}</p>
                      <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={150}>
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-white/8 bg-black">
              {/* Google Drive video embed */}
              <iframe
                src="https://drive.google.com/file/d/1UzkAGQgH_8v79z-rmb1igf0DnOzj3vi0/preview"
                className="w-full h-full"
                allow="autoplay"
                style={{ border: 'none' }}
              />
              {/* Label overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 pointer-events-none px-6 py-5"
                style={{ background: 'linear-gradient(to top, rgba(3,6,18,0.95), transparent)' }}>
                <div className="h-px w-8 mb-3" style={{ background: LIME }}/>
                <h3 className="font-display text-2xl text-white mb-0.5">VIVE AIRA <span style={{ color: LIME }}>S.A.S.</span></h3>
                <p className="font-mono-custom text-[9px] uppercase tracking-widest text-white/40">Operador Oficial</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── ECOSISTEMA ── */}
      <section id="ecosistema" className="py-28 md:py-36 border-y border-white/6" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="px-6 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <Reveal>
              <Label>Plataforma de Superlujo</Label>
              <h2 className="font-display text-5xl md:text-6xl text-white leading-none mb-6">Ecosistema AIRA</h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                AIRA Experience no es solo un evento; es una plataforma de estilo de vida de superlujo fundamentada en tres pilares:
              </p>
              <div className="space-y-4 mb-8">
                {[
                  { n: '01', title: 'Turismo', sub: 'Exploración & Asombro', desc: 'Locaciones icónicas y exclusividad absoluta en el embalse de Guatapé.' },
                  { n: '02', title: 'Deportes', sub: 'Adrenalina', desc: 'Actividades náuticas y conexión física en el embalse.' },
                  { n: '03', title: 'Wellness', sub: 'Relajación', desc: 'Mindfulness, sanación sonora y desconexión mental.' },
                ].map((p, i) => (
                  <Reveal key={i} delay={i * 80}>
                    <div className="flex items-start gap-5 p-5 rounded-2xl border border-white/6 hover:border-aira-lime/20 transition-all">
                      <span className="font-mono-custom text-[10px] mt-1" style={{ color: LIME }}>{p.n}</span>
                      <div>
                        <p className="text-white font-semibold">{p.title} <span className="text-white/30 font-normal text-sm">— {p.sub}</span></p>
                        <p className="text-white/40 text-sm mt-0.5">{p.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
              <div className="p-6 rounded-2xl border-l-2 bg-white/[0.03]" style={{ borderColor: LIME }}>
                <p className="text-white/70 italic leading-relaxed">"El lujo moderno es interactivo y multisensorial. La música electrónica curada actúa como la banda sonora de este viaje, todo envuelto en un confort de 5 estrellas."</p>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-white/8 group">
                <img src="https://i.imgur.com/tN3Gr8q.jpeg" alt="AIRA Guatapé"
                  className="w-full h-full object-cover transition-transform duration-[5s] group-hover:scale-110"/>
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,6,18,0.8), transparent 60%)' }}/>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── ITINERARIO ── */}
      <section id="itinerario" className="py-28 md:py-36 px-6 max-w-7xl mx-auto">
        <Reveal>
          <Label>Itinerario Maestro (3 Días)</Label>
          <h2 className="font-display text-5xl md:text-6xl text-white leading-none mb-4">Ruta de Inmersión</h2>
          <p className="text-white/40 text-lg max-w-2xl leading-relaxed mb-16">
            Diseñado para garantizar múltiples puntos de contacto orgánicos entre los asistentes y las marcas patrocinadoras en Joinn Houtel.
          </p>
        </Reveal>

        {/* Hero image */}
        <Reveal className="mb-16">
          <div className="relative w-full aspect-[16/7] rounded-3xl overflow-hidden border border-white/8 group">
            <img src="https://i.imgur.com/ITrRi84.jpeg" alt="Joinn Houtel AIRA"
              className="w-full h-full object-cover transition-transform duration-[5s] group-hover:scale-105"/>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,6,18,0.9), transparent 50%)' }}/>
            <div className="absolute bottom-8 left-8 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: LIME }}>
                <Anchor className="w-7 h-7" style={{ color: DARK }}/>
              </div>
              <div>
                <h4 className="font-display text-3xl text-white">Boutique Experience</h4>
                <p className="font-mono-custom text-[10px] uppercase tracking-widest text-white/50 mt-1">Sede Oficial 5 Estrellas</p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* 4 Escenarios */}
        <Reveal className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <MapPin className="w-5 h-5" style={{ color: LIME }}/>
            <h3 className="font-display text-3xl text-white">4 Escenarios <span className="text-white/30 font-light text-2xl">(Naming Rights)</span></h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Floating Stage', desc: 'Plataforma en la mitad de la represa.',                 icon: <Target className="w-6 h-6"/>, img: '/beach-party.jpg' },
              { title: 'Beach Stage',    desc: 'Ubicado en la playa del hotel.',                         icon: <Waves className="w-6 h-6"/>,  img: '/main-stage.jpg'  },
              { title: 'Lobby Stage',   desc: 'Epicentro de bienvenida en el hotel.',                   icon: <Building2 className="w-6 h-6"/>, img: '/celebration.jpg' },
              { title: 'Main Stage',    desc: 'A bordo del yate Majestic (el más grande de LATAM).',   icon: <Anchor className="w-6 h-6"/>,  img: '/yacht-party.jpg' },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 70}>
                <ImageHover src={s.img} className="block w-full">
                  <div className="p-6 rounded-2xl border border-white/8 bg-white/[0.02] hover:border-aira-lime/25 hover:bg-white/[0.04] transition-all group h-full">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-colors group-hover:bg-aira-lime/20" style={{ background: `${LIME}12`, color: LIME }}>
                      {s.icon}
                    </div>
                    <span className="font-mono-custom text-[10px] uppercase tracking-widest text-white/25 block mb-1">{i + 1}.</span>
                    <h4 className="font-display text-lg text-white mb-2 group-hover:text-aira-lime transition-colors">{s.title}</h4>
                    <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </ImageHover>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* 3 días */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {[
            { day: 'Día 1', title: 'Inmersión & Comunidad', desc: 'Bienvenida en el Lobby Stage. Tarde de Yacht Party en el Floating Stage. Noche de inmersión en el Beach Stage.' },
            { day: 'Día 2', title: 'Equilibrio & Adrenalina', desc: 'Sesiones de meditación y deportes náuticos. Catarsis absoluta en el Main Stage a bordo del "Majestic", el yate más grande de agua dulce de Latinoamérica.' },
            { day: 'Día 3', title: 'Wellness & Descubrimiento', desc: 'Cierre y recuperación. Relajación con Open Deck para descubrir las próximas promesas de la escena electrónica.' },
          ].map((d, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="relative p-8 rounded-3xl border border-white/8 bg-white/[0.02] hover:border-aira-lime/20 transition-all overflow-hidden group">
                <span className="absolute top-4 right-6 font-display text-7xl text-white/[0.04] group-hover:text-aira-lime/[0.07] transition-colors">{d.day}</span>
                <div className="w-8 h-0.5 mb-6" style={{ background: LIME }}/>
                <h3 className="font-display text-xl text-white mb-3">{d.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{d.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Yate Majestic image */}
        <Reveal>
          <div className="relative w-full aspect-[16/7] rounded-3xl overflow-hidden border border-white/8 group">
            <img src="https://corpotur.com/wp-content/uploads/2023/08/majestic1.jpg" alt="Yate Majestic"
              className="w-full h-full object-cover transition-transform duration-[5s] group-hover:scale-105"/>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,6,18,0.95), rgba(3,6,18,0.2) 50%, transparent)' }}/>
            <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
              <div>
                <span className="inline-block px-3 py-1 rounded-full font-mono-custom text-[9px] uppercase tracking-widest mb-4 border" style={{ background: `${LIME}15`, color: LIME, borderColor: `${LIME}30` }}>
                  Día 2 · El Coloso del Embalse
                </span>
                <h4 className="font-display text-2xl md:text-3xl text-white max-w-xl leading-tight">
                  Catarsis flotante en el yate más grande de agua dulce
                </h4>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-sm shrink-0">
                <Waves className="w-5 h-5" style={{ color: LIME }}/>
                <span className="font-mono-custom text-[10px] uppercase tracking-widest">Inmersión Total</span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── ALIADOS ── */}
      <section id="aliados" className="py-28 border-y border-white/6" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="px-6 max-w-7xl mx-auto">
          <Reveal>
            <Label>Respaldo & Sinergias</Label>
            <h2 className="font-display text-5xl md:text-6xl text-white leading-none mb-4">Aliados & Curaduría</h2>
            <p className="text-white/40 text-lg max-w-2xl leading-relaxed mb-16">
              Red de aliados estratégicos confirmados y un lineup de talla internacional que garantizan los más altos estándares de calidad.
            </p>
          </Reveal>

          {/* Curaduría */}
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <Headphones className="w-5 h-5" style={{ color: LIME }}/>
              <h3 className="font-display text-3xl text-white">Curaduría Musical</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { tag: 'Main Event', title: 'Headliners Internacionales', desc: 'Referentes globales de la escena electrónica que liderarán la catarsis a bordo del Majestic.' },
                { tag: 'Soporte & Transición', title: 'Talento Nacional Top', desc: 'Los artistas más consolidados del país encargados de mantener la energía durante el día y la noche.' },
                { tag: 'Nuevas Promesas', title: 'Open Decks & Wellness', desc: 'Espacios para descubrir talentos emergentes y acompañar las sesiones de relajación matutinas.' },
              ].map((c, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className="p-7 rounded-2xl border border-white/8 bg-white/[0.02] hover:border-aira-lime/20 transition-all">
                    <span className="font-mono-custom text-[9px] uppercase tracking-widest block mb-3" style={{ color: LIME }}>{c.tag}</span>
                    <h4 className="font-display text-xl text-white mb-3">{c.title}</h4>
                    <p className="text-white/40 text-sm leading-relaxed">{c.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="mt-5 p-5 rounded-2xl border text-center" style={{ background: `${LIME}08`, borderColor: `${LIME}20` }}>
              <p className="text-sm italic" style={{ color: `${LIME}cc` }}>Nota Estratégica: El cartel completo de artistas se revelará de manera progresiva en nuestras fases de campaña.</p>
            </div>
          </Reveal>

          {/* Aliados */}
          <Reveal>
            <div className="flex items-center gap-3 mb-8">
              <Star className="w-5 h-5" style={{ color: LIME }}/>
              <h3 className="font-display text-3xl text-white">Red de Aliados Confirmados</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <AllyGroup category="Institucional & Base" items={[
                { name: 'Alcaldía de El Peñol' },
                { name: 'Joinn Houtel', link: 'https://www.instagram.com/joinn_houtel/', img: 'https://i.imgur.com/ITrRi84.jpeg' },
              ]}/>
              <AllyGroup category="Promotores & Producción" items={[
                { name: 'Aphasia Collective',  link: 'https://www.instagram.com/aphasia.col/',    img: '/dj-1.jpg' },
                { name: 'Real Salsa Vibes',    link: 'https://www.instagram.com/realsalsavibes/', img: '/crowd-1.jpg' },
                { name: 'In House Production', link: 'https://www.instagram.com/djfrann75/',      img: '/dj-console.jpg' },
              ]}/>
              <AllyGroup category="Sellos & Estudios" items={[
                { name: 'Isiday Music',     link: 'https://www.instagram.com/isiday_music/',  img: '/main-stage.jpg' },
                { name: 'Club Sonica',      link: 'https://www.instagram.com/clubsonica/',    img: '/stage-1.jpg' },
                { name: 'Japi' },
                { name: 'Yin Yang Studios', link: 'https://www.instagram.com/yinyangcol/',   img: '/dj-portrait.jpg' },
              ]}/>
              <AllyGroup category="Media & Turismo" items={[
                { name: 'Iwana Travel',      link: 'https://www.instagram.com/iwana.travel/',     img: '/yacht-party.jpg' },
                { name: 'El de los Planes',  link: 'https://www.instagram.com/eldelosplanes/',    img: '/beach-party.jpg' },
                { name: 'REC Emisora',       link: 'https://www.instagram.com/recemisora/',       img: '/celebration.jpg' },
              ]}/>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PATROCINIOS ── */}
      <section id="patrocinios" className="py-28 md:py-36 px-6 max-w-7xl mx-auto">
        <Reveal>
          <Label>Oportunidades Comerciales</Label>
          <h2 className="font-display text-5xl md:text-6xl text-white leading-none mb-4">Patrocinios & ROI</h2>
          <p className="text-white/40 text-lg max-w-2xl leading-relaxed mb-16">
            Categorías de integración orgánica para apropiarse de un pilar específico, garantizando alto ROI y asociación con un perfil UHNWI.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-6 mb-20">
          <TierCard letter="A" title="Stages & Headliners Partner" focus="Producción de Escenarios & Booking"
            contribution="Financiación directa para la producción técnica de cada stage y/o el booking de los Headliners internacionales. Naming rights absolutos en los 4 escenarios."
            benefits={[
              '"AIRA [Name] Stage presented by [Marca]" — naming rights absolutos.',
              'Asociación directa de la marca con los Headliners.',
              'Meet & Greet privado y accesos VIP con los artistas financiados.',
            ]} delay={0}/>

          <TierCard letter="B" title="Action & Sports Partner" focus="Pilar de Experiencias Deportivas"
            contribution="Patrocinio de jornadas de actividades náuticas (Días 2 y 3) y equipos. Branding en yates deportivos, motos de agua y zonas de embarque."
            benefits={[
              'Branding en yates deportivos, motos de agua y zonas de embarque.',
              'Branding en uniformes de instructores.',
              'Asociación ideal para marcas de energía, vehículos o ropa deportiva.',
            ]} delay={80}/>

          <TierCard letter="C" title="Sanctuary & Wellness Partner" focus="Pilar de Relajación y Meditación"
            contribution="Financiación de sesiones Wellness (Días 2 y 3), profesionales de salud/yoga y zonas de recuperación activa."
            benefits={[
              'Exclusividad en el área de bienestar.',
              'Branding en mats de yoga, toallas y estaciones de hidratación/detox.',
              'Fuerte asociación con la salud mental y física.',
            ]} delay={160}/>

          <TierCard letter="D" title="Premium Lifestyle & Beverage" focus="Eje de Lujo y Confort 5 Estrellas"
            contribution="Patrocinio de barras, mixología de alta gama y gastronomía. Exclusividad de consumo en su categoría."
            benefits={[
              'Exclusividad de consumo en su categoría.',
              'Diseño y oferta de cócteles insignia de la marca.',
              'Presencia destacada en los momentos de mayor celebración y networking B2B.',
            ]} delay={240}/>
        </div>

        {/* Estrategia de media */}
        <Reveal className="mb-20">
          <div className="relative p-10 md:p-14 rounded-3xl border border-white/8 bg-white/[0.02] overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] pointer-events-none" style={{ background: `${LIME}12` }}/>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Video className="w-6 h-6" style={{ color: LIME }}/>
                <h3 className="font-display text-3xl md:text-4xl text-white">Estrategia de Distribución & Media</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-10">
                <p className="text-white/50 text-base leading-relaxed">
                  El patrocinio no se limita a los 3 días del evento. Nuestro plan de media garantiza una presencia sostenida a través de una campaña en tres fases: <strong className="text-white">4 meses de expectativa previa, cobertura en tiempo real, y 1 mes de amplificación posterior.</strong>
                </p>
                <div className="space-y-3">
                  {[
                    { label: 'Fase 1 — Pre', value: '4 Meses', active: false },
                    { label: 'Fase 2 — Live', value: '3 Días', active: true },
                    { label: 'Fase 3 — Post', value: '1 Mes', active: false },
                  ].map((f, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-white/8">
                      <span className="font-mono-custom text-[10px] uppercase tracking-widest text-white/40">{f.label}</span>
                      <span className={`font-mono-custom text-[10px] uppercase tracking-widest font-bold ${f.active ? '' : 'text-white/60'}`}
                        style={f.active ? { color: LIME } : {}}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                {[
                  { pct: '35%', title: 'Acción & Exploración', desc: 'Deportes náuticos, paisajes impresionantes. El gatillo social de la aventura exclusiva.' },
                  { pct: '35%', title: 'Música & Celebración', desc: 'El poder de la pista de baile, Headliners y la estética de los 4 escenarios.' },
                  { pct: '30%', title: 'Lujo & Wellness', desc: 'Arquitectura 5 estrellas, gastronomía premium y el confort de la recuperación.' },
                ].map((m, i) => (
                  <div key={i} className="p-7 rounded-2xl border border-white/8 bg-white/[0.03] hover:border-aira-lime/20 transition-all">
                    <div className="font-display text-5xl mb-3" style={{ color: LIME }}>{m.pct}</div>
                    <h4 className="font-mono-custom text-[10px] uppercase tracking-widest text-white mb-3">{m.title}</h4>
                    <p className="text-white/40 text-sm leading-relaxed">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Métricas */}
        <Reveal className="mb-20">
          <div className="grid md:grid-cols-2 overflow-hidden rounded-3xl border border-white/8">
            <div className="p-10 md:p-14 bg-white/[0.03]">
              <h3 className="font-display text-3xl text-white mb-10">Métricas de Proyección</h3>
              <div className="space-y-10">
                {[
                  { value: '1,500+', label: 'Asistentes Proyectados', desc: '150 VIP Full Experience + 1,350+ Aforo General en escenarios flotantes.' },
                  { value: '500K+', label: 'Visualizaciones Digitales', desc: 'Contenido B2B de altísima calidad distribuido en 3 verticales.' },
                  { value: '3.5x',  label: 'ROI Estimado', desc: 'Retorno vía valor en medios (PR), posicionamiento Top Tier y networking B2B.' },
                ].map((m, i) => (
                  <div key={i}>
                    <div className="font-display text-5xl mb-1" style={{ color: LIME }}>{m.value}</div>
                    <p className="font-mono-custom text-[10px] uppercase tracking-widest text-white mb-1">{m.label}</p>
                    <p className="text-white/35 text-sm">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative min-h-[360px]">
              <img src="https://corpotur.com/wp-content/uploads/2023/08/majestic1.jpg" alt="Majestic"
                className="absolute inset-0 w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"/>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(3,6,18,0.8), transparent)' }}/>
            </div>
          </div>
        </Reveal>

        {/* CTA final */}
        <Reveal>
          <div className="relative rounded-3xl overflow-hidden p-12 md:p-20 text-center group cursor-pointer border border-white/8 hover:border-aira-lime/30 transition-all"
            style={{ background: 'rgba(225,254,82,0.04)' }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at center, ${LIME}10, transparent 70%)` }}/>
            <div className="relative z-10">
              <h3 className="font-display text-5xl md:text-7xl text-white leading-none mb-6">
                Let's Make<br/>it <span style={{ color: LIME }}>Happen</span>
              </h3>
              <p className="text-white/40 max-w-xl mx-auto mb-10 text-base leading-relaxed">
                Agende una presentación oficial y análisis de ROI personalizado. Los cupos de patrocinio son exclusivos por categoría.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-8 py-4 font-display text-sm uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 rounded-full"
                  style={{ background: LIME, color: DARK }}>
                  Contactar vía WhatsApp <ArrowRight className="w-4 h-4"/>
                </a>
                <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-8 py-4 border border-white/20 text-white font-display text-sm uppercase tracking-[0.2em] hover:bg-white/8 transition-all rounded-full">
                  <Globe className="w-4 h-4"/> Web Oficial
                </a>
              </div>
              <p className="font-mono-custom text-[10px] uppercase tracking-widest text-white/25">
                Manuel Franco · Representante Comercial · 300 306 2259
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-white/6 text-center">
        <div className="flex flex-col items-center gap-5">
          <p className="font-display text-2xl text-white">AIRA</p>
          <div className="flex flex-wrap justify-center gap-8">
            <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 font-mono-custom text-[10px] uppercase tracking-widest text-white/30 hover:text-aira-lime transition-colors">
              <Globe className="w-3.5 h-3.5"/> Sitio Oficial
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 font-mono-custom text-[10px] uppercase tracking-widest text-white/30 hover:text-aira-lime transition-colors">
              <Instagram className="w-3.5 h-3.5"/> @viveaira
            </a>
          </div>
          <p className="font-mono-custom text-[9px] uppercase tracking-widest text-white/20 max-w-md leading-loose">
            AIRA Experience © 15 – 17 Agosto 2026<br/>
            Elevando el espíritu a través del turismo, el deporte, el bienestar y el sonido.
          </p>
        </div>
      </footer>
    </div>
  );
}
