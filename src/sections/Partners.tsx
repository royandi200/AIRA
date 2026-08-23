import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight, Users, Target, MapPin, Anchor,
  Menu, X, Shield, Calendar,
  Waves, Building2, Briefcase,
  Video, Globe, Instagram,
} from 'lucide-react';

// ─── Global styles
const GLOBAL_STYLE = `
@keyframes fadeIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
@keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
`;

// ─── Brand colors ──────────────────────────────────────────────────────────────
const LIME  = '#e1fe52';
const DARK  = '#00164c';
const BLACK = '#030612';

const WHATSAPP_URL  = 'https://wa.me/573204936158';
const MAILTO_URL    = 'mailto:gerencia@viveaira.co';
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
    { href: '#itinerario',   label: 'Itinerario' },
    { href: '#difusion',     label: 'Alcance' },
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

// ─── Detect touch device ──────────────────────────────────────────────────────
function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

// ─── Image hover tooltip (desktop) + tap strip (mobile) ──────────────────────
function ImageHover({ src, children, href, className = '' }: {
  src: string; children: React.ReactNode; href?: string; className?: string;
}) {
  const [hov, setHov]         = useState(false);
  const [pos, setPos]         = useState({ x: 0, y: 0 });
  const [tapped, setTapped]   = useState(false);
  const dismissRef            = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouch               = isTouchDevice();
  const W = 380, H = 240;

  // Clean up dismiss timer on unmount
  useEffect(() => () => { if (dismissRef.current) clearTimeout(dismissRef.current); }, []);

  const onMove = (e: React.MouseEvent) => {
    setPos({ x: e.clientX, y: e.clientY });
  };

  // ── Mobile tap handler ────────────────────────────────────────────────────
  const handleTap = (e: React.TouchEvent) => {
    if (!isTouch) return;
    e.preventDefault(); // prevent ghost click
    setTapped(true);
    if (dismissRef.current) clearTimeout(dismissRef.current);
    dismissRef.current = setTimeout(() => setTapped(false), 2000);
  };

  // ── Desktop tooltip (portal, absolute positioned) ────────────────────────
  const vw   = typeof window !== 'undefined' ? window.innerWidth  : 1200;
  const vh   = typeof window !== 'undefined' ? window.innerHeight : 800;
  const left = pos.x + W + 20 > vw ? pos.x - W - 12 : pos.x + 12;
  const top  = pos.y + H / 2  > vh ? vh - H - 8      : Math.max(8, pos.y - H / 2);

  const desktopTooltip = (!isTouch && hov) ? createPortal(
    <div className="pointer-events-none rounded-2xl overflow-hidden shadow-2xl"
      style={{
        position: 'fixed', left, top,
        width: W, height: H,
        zIndex: 99999,
        border: '1px solid rgba(225,254,82,0.25)',
        animation: 'fadeIn .12s ease',
      }}>
      <img src={src} alt="" className="w-full h-full object-cover"/>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,6,18,0.5), transparent)' }}/>
    </div>,
    document.body
  ) : null;

  // ── Mobile bottom strip (inline, below children) ─────────────────────────
  const mobileStrip = (isTouch && tapped) ? (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 140,
        borderRadius: '0 0 16px 16px',
        overflow: 'hidden',
        marginTop: 4,
        border: '1px solid rgba(225,254,82,0.2)',
        animation: 'fadeInUp .2s ease',
      }}>
      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,6,18,0.55), transparent)' }}/>
    </div>
  ) : null;

  // ── Mobile hint (visible when not tapped) ────────────────────────────────
  const mobileHint = isTouch ? (
    <p style={{
      fontSize: 10,
      color: 'rgba(225,254,82,0.45)',
      textAlign: 'center',
      marginTop: 4,
      letterSpacing: '0.08em',
      fontFamily: 'monospace',
      textTransform: 'uppercase',
      opacity: tapped ? 0 : 1,
      transition: 'opacity .2s',
      pointerEvents: 'none',
    }}>Toca para ver imagen</p>
  ) : null;

  const Tag = href ? 'a' : 'div';
  const tagProps = href
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <Tag
      {...tagProps as any}
      className={`cursor-pointer ${className}`}
      onMouseEnter={() => { if (!isTouch) setHov(true); }}
      onMouseLeave={() => { if (!isTouch) setHov(false); }}
      onMouseMove={onMove}
      onTouchEnd={handleTap}
    >
      {children}
      {desktopTooltip}
      {mobileStrip}
      {mobileHint}
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
// ─── Ecosistema/Aliados eliminados — ver sección "Alcance y Difusión" ────────

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Partners() {


  useEffect(() => {
    // Stop lenis if active
    const lenis = (window as any).__lenis;
    if (lenis) lenis.start();
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
            Propuesta de Alianza Estratégica
          </p>
          <p className="text-white/60 text-lg md:text-xl max-w-2xl leading-relaxed mb-12 font-light italic">
            "Su marca no necesita más visibilidad. Necesita el contexto correcto."
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="#patrocinios"
              className="flex items-center gap-2 px-8 py-4 font-display text-sm uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95"
              style={{ background: LIME, color: DARK }}>
              Ver oportunidades <ArrowRight className="w-4 h-4"/>
            </a>
            <a href="#resumen"
              className="flex items-center gap-2 px-8 py-4 border border-white/20 text-white font-display text-sm uppercase tracking-[0.2em] hover:bg-white/8 transition-all">
              Resumen ejecutivo
            </a>
          </div>
        </div>
      </section>

      {/* ── MAGNITUD DEL EVENTO ── */}
      <section className="py-16 md:py-20 px-6 border-y border-white/8" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
          {[
            { value: '1.000–1.500', label: 'Asistentes rotando por escenarios' },
            { value: '150', label: 'Huéspedes VIP · 72h continuas en Joinn Houtel' },
            { value: '3 días', label: 'Formato Destination Event' },
            { value: '30+', label: 'Artistas nacionales e internacionales' },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 80} className="text-center md:text-left">
              <div className="font-display text-4xl md:text-5xl mb-2" style={{ color: LIME }}>{s.value}</div>
              <p className="text-white/45 text-xs md:text-sm leading-snug">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── PERFIL DE AUDIENCIA ── */}
      <section className="py-24 md:py-32 px-6 max-w-7xl mx-auto">
        <Reveal className="mb-14 text-center max-w-2xl mx-auto">
          <Label>Audience Snapshot</Label>
          <h2 className="font-display text-3xl md:text-5xl text-white mt-4">Quién asiste a AÏRA</h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: <Target className="w-5 h-5"/>, title: '25 – 45 años', desc: 'Adultos contemporáneos. No es un evento para adolescentes.' },
            { icon: <Building2 className="w-5 h-5"/>, title: 'Estratos 5 y 6', desc: 'Nivel socioeconómico medio-alto y alto.' },
            { icon: <Briefcase className="w-5 h-5"/>, title: 'Tomadores de decisión', desc: 'Líderes de opinión, consumidores de experiencias premium.' },
            { icon: <Waves className="w-5 h-5"/>, title: 'Afinidades', desc: 'Bienestar, hotelería boutique, gastronomía, Progressive & Tech House.' },
          ].map((c, i) => (
            <Reveal key={i} delay={i * 90}
              className="p-7 rounded-3xl border border-white/8 bg-white/[0.03] hover:border-aira-lime/30 transition-all duration-500">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: `${LIME}15`, color: LIME }}>
                {c.icon}
              </div>
              <h3 className="font-display text-xl text-white mb-2">{c.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{c.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <section id="resumen" className="py-28 md:py-36 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <Reveal>
              <Label>El Respaldo Corporativo</Label>
              <h2 className="font-display text-5xl md:text-6xl text-white leading-none mb-6">Quiénes Somos</h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                VIVE AIRA S.A.S. no nació para llenar calendarios de eventos. Nació para demostrar que Colombia tiene el criterio, el talento y la visión para crear experiencias que compiten con cualquier referente global.
              </p>
            </Reveal>

            <div className="space-y-5">
              {[
                { icon: <Users className="w-5 h-5"/>, title: 'Equipo Multidisciplinario', desc: 'Cada detalle tiene un autor. Diseño, curaduría, logística y estrategia financiera trabajando como un solo organismo.' },
                { icon: <Briefcase className="w-5 h-5"/>, title: 'Estética & Precisión', desc: 'No decoramos espacios. Componemos atmósferas donde cada elemento, incluyendo su marca, tiene una razón de ser.' },
                { icon: <Shield className="w-5 h-5"/>, title: 'Respaldo Corporativo', desc: 'Detrás de cada experiencia, una estructura sólida que garantiza que nada se deja al azar.' },
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
              {/* Video con toggle de sonido */}
              {(() => {
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const [muted, setMuted] = useState(true);
                return (
                  <>
                    <video
                      className="w-full h-full object-cover"
                      autoPlay loop muted={muted} playsInline preload="auto"
                    >
                      <source src="https://res.cloudinary.com/dqfpxf3zq/video/upload/f_mp4,q_auto,vc_h264/v1777679736/PUSH_REDES_AIRA_1_vortl2" type="video/mp4" />
                      <source src="https://res.cloudinary.com/dqfpxf3zq/video/upload/f_webm,q_auto/v1777679736/PUSH_REDES_AIRA_1_vortl2" type="video/webm" />
                    </video>
                    <button
                      onClick={() => setMuted(m => !m)}
                      className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono-custom text-[9px] uppercase tracking-widest transition-all hover:opacity-90"
                      style={{ background:'rgba(0,0,0,0.55)', border:`1px solid ${muted ? 'rgba(255,255,255,0.15)' : LIME+'60'}`, color: muted ? 'rgba(255,255,255,0.5)' : LIME, backdropFilter:'blur(8px)' }}
                    >
                      {muted
                        ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg> Sin sonido</>
                        : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Sonido</>
                      }
                    </button>
                  </>
                );
              })()}
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

      {/* ── ITINERARIO ── */}
      <section id="itinerario" className="py-28 md:py-36 px-6 max-w-7xl mx-auto">
        <Reveal>
          <Label>Arquitectura de la Experiencia</Label>
          <h2 className="font-display text-5xl md:text-6xl text-white leading-none mb-4">Ruta de Inmersión</h2>
          <p className="text-white/40 text-lg max-w-2xl leading-relaxed mb-16">
            Cada momento del itinerario fue construido con un criterio doble: que el asistente viva algo inolvidable, y que su marca aparezca exactamente donde la atención está.
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
              { title: 'Japi Stage',     desc: 'Plataforma en la mitad de la represa.',                 icon: <Target className="w-6 h-6"/>, img: '/beach-party.jpg' },
              { title: 'AIRA Stage',     desc: 'Ubicado en la playa del hotel.',                         icon: <Waves className="w-6 h-6"/>,  img: '/main-stage.jpg'  },
              { title: 'Joinn Stage',   desc: 'Epicentro de bienvenida en el hotel.',                   icon: <Building2 className="w-6 h-6"/>, img: '/celebration.jpg' },
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
            { day: 'Día 1', title: 'Inmersión & Comunidad', desc: 'Activación en el Joinn Stage, tarde de Yacht Party en el Japi Stage y noche de inmersión en el AIRA Stage.' },
            { day: 'Día 2', title: 'Equilibrio & Adrenalina', desc: 'Meditación y deportes náuticos. Al anochecer, catarsis absoluta a bordo del "Majestic", el yate más grande de Latinoamérica.' },
            { day: 'Día 3', title: 'Wellness & Descubrimiento', desc: 'Recuperación integral y relajación. Cierre de experiencia con Open Deck: nuevos talentos y sonidos emergentes.' },
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

      {/* ── ALCANCE Y DIFUSIÓN ── */}
      <section id="difusion" className="py-28 border-y border-white/6" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="px-6 max-w-7xl mx-auto">
          <Reveal>
            <Label>Amplificación Digital</Label>
            <h2 className="font-display text-5xl md:text-6xl text-white leading-none mb-4">Alcance & Difusión</h2>
            <p className="text-white/40 text-lg max-w-2xl leading-relaxed mb-16">
              Dónde se promociona AIRA y cómo su marca queda documentada dentro de ese contenido, antes, durante y después del evento.
            </p>
          </Reveal>

          {/* Red de amplificación */}
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <Users className="w-5 h-5" style={{ color: LIME }}/>
              <h3 className="font-display text-3xl text-white">Red de Amplificación</h3>
            </div>
            <div className="p-8 rounded-2xl border border-white/8 bg-white/[0.02]">
              <p className="text-white/55 text-lg leading-relaxed">
                <span className="font-display text-4xl mr-2" style={{ color: LIME }}>30+</span>
                artistas nacionales e internacionales actúan como embajadores orgánicos del evento, compartiendo contenido hacia sus propias comunidades — una caja de resonancia que la pauta paga no puede comprar por sí sola.
              </p>
            </div>
          </Reveal>

          {/* Timeline de contenido */}
          <Reveal>
            <div className="flex items-center gap-3 mb-8">
              <Video className="w-5 h-5" style={{ color: LIME }}/>
              <h3 className="font-display text-3xl text-white">Campaña de Contenido <span className="text-white/30 font-light text-2xl">(1 mes)</span></h3>
            </div>
            <div className="grid md:grid-cols-3 gap-5 relative">
              {[
                { tag: 'Semanas 1 – 2', title: 'Pre-Evento', icon: <Globe className="w-6 h-6"/>,
                  desc: 'Pauta digital segmentada por perfil de audiencia y playlists oficiales patrocinadas.' },
                { tag: 'Días del Evento', title: 'Live-Action', icon: <Instagram className="w-6 h-6"/>,
                  desc: 'Cobertura profesional en tiempo real en redes durante los 3 días del evento.' },
                { tag: 'Semanas 3 – 4', title: 'Post-Evento', icon: <Video className="w-6 h-6"/>,
                  desc: 'Sets grabados formato Boiler Room/Cercle + aftermovie cinematográfico.' },
              ].map((c, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className="p-7 rounded-2xl border border-white/8 bg-white/[0.02] hover:border-aira-lime/20 transition-all h-full">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ background: `${LIME}12`, color: LIME }}>
                      {c.icon}
                    </div>
                    <span className="font-mono-custom text-[9px] uppercase tracking-widest block mb-2" style={{ color: LIME }}>{c.tag}</span>
                    <h4 className="font-display text-xl text-white mb-3">{c.title}</h4>
                    <p className="text-white/40 text-sm leading-relaxed">{c.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="mt-5 p-5 rounded-2xl border text-center" style={{ background: `${LIME}08`, borderColor: `${LIME}20` }}>
              <p className="text-sm italic" style={{ color: `${LIME}cc` }}>Métricas de alcance de campañas anteriores disponibles bajo solicitud.</p>
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
                  El patrocinio no se limita a los 3 días del evento. Nuestro plan de media garantiza una presencia sostenida a través de una campaña de <strong className="text-white">1 mes</strong>, distribuida en tres fases: expectativa previa, cobertura en tiempo real, y amplificación posterior.
                </p>
                <div className="space-y-3">
                  {[
                    { label: 'Fase 1 — Pre', value: '2 Semanas', active: false },
                    { label: 'Fase 2 — Live', value: '3 Días', active: true },
                    { label: 'Fase 3 — Post', value: '2 Semanas', active: false },
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

        {/* ── PROPUESTA COMERCIAL ── */}
        <Reveal className="mb-20">
          <div className="text-center mb-12">
            <Label>Propuesta Comercial</Label>
            <h3 className="font-display text-3xl md:text-5xl text-white mt-4">Niveles de Inversión</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { name: 'Diamond Sponsor', price: '$40M – $50M', unit: 'COP',
                items: ['Naming del evento', 'Presencia estelar en Yate Majestic', '2 cabañas VIP incluidas'] },
              { name: 'Stage Presenter', price: '$20M – $25M', unit: 'COP',
                items: ['Naming de 1 escenario secundario', 'Branding dominante', '1 suite/cabaña'] },
              { name: 'Experience Partner', price: '$10M – $15M', unit: 'COP',
                items: ['Patrocinio de 1 actividad', 'Sampling directo con asistentes'] },
              { name: 'Brand Placement', price: '$5M – $8M', unit: 'COP',
                items: ['Presencia física en zonas comunes', 'Exhibición de producto'] },
            ].map((tier, i) => (
              <div key={i}
                className="flex flex-col p-7 rounded-3xl border border-white/8 bg-white/[0.03] hover:border-aira-lime/30 hover:bg-white/[0.05] transition-all duration-500">
                <p className="font-mono-custom text-[10px] uppercase tracking-widest mb-4" style={{ color: LIME }}>{tier.name}</p>
                <div className="mb-6">
                  <span className="font-display text-3xl text-white">{tier.price}</span>
                  <span className="text-white/35 text-xs ml-1">{tier.unit}</span>
                </div>
                <div className="border-t border-white/8 pt-4 space-y-2.5 flex-1">
                  {tier.items.map((it, j) => (
                    <div key={j} className="flex items-start gap-2.5">
                      <div className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: LIME }}/>
                      <p className="text-sm text-white/55 leading-snug">{it}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-white/40 text-sm italic mt-8">
            Construimos propuestas a la medida de los objetivos específicos de su marca.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 mt-8">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-4 font-display text-sm uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95"
              style={{ background: LIME, color: DARK }}>
              Hablemos de su participación <ArrowRight className="w-4 h-4"/>
            </a>
            <a href={MAILTO_URL}
              className="font-mono-custom text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors">
              o escríbanos por correo
            </a>
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
                Alexander Sánchez Bedoya · Gerencia VIVE AIRA S.A.S. · gerencia@viveaira.co · 320 493 6158
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
