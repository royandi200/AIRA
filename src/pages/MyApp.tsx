import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './MyApp.css';
import { SECTIONS, renderSectionContent, type CompassSection } from './MyAppSections';
import MyAppClock from './MyAppClock';
import MyAppLogin from './MyAppLogin';
import MyAppConsent from './MyAppConsent';
import { useMyAppSession, type Attendee } from './MyAppAuth';
import { usePullToRefresh } from './usePullToRefresh';
import PullIndicator from './PullIndicator';

/**
 * MyApp — Webapp para asistentes al evento AIRA.
 * Menú principal: tornamesa de DJ — un vinilo giratorio con detentes
 * (misma mecánica de caja fuerte de siempre, look de set de DJ encima).
 * Cada sección "cae" en su diente con vibración + tick de audio,
 * y la imagen central (el "label" del disco) hace zoom/crossfade
 * circular al seleccionar (mismo lenguaje visual que /mesa).
 *
 * La rueda vive centrada en pantalla y se puede arrastrar desde
 * cualquier punto de la pantalla, no solo tocando el aro.
 *
 * Al tocar el círculo central, la sección se abre con una transición
 * de "el círculo se transforma en la pantalla" (clip-path circular
 * que crece desde el punto exacto donde estaba el círculo).
 */

const N = SECTIONS.length;
const STEP = 360 / N;

/** Sintetiza un "scratch" corto de DJ vía WebAudio — sin depender de archivos de audio */
function useTickSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);

  const ensureCtx = useCallback((): AudioContext | null => {
    try {
      if (!ctxRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        ctxRef.current = new AC();
      }
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
      return ctxRef.current;
    } catch { return null; }
  }, []);

  // Ruido base para la "textura" del scratch (aguja + surco) — se genera
  // una sola vez y se reutiliza en cada tick, no hay que recalcularlo.
  const ensureNoise = useCallback((ctx: AudioContext): AudioBuffer => {
    if (!noiseBufferRef.current) {
      const len = Math.floor(ctx.sampleRate * 0.09);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      noiseBufferRef.current = buffer;
    }
    return noiseBufferRef.current;
  }, []);

  // Se llama en el primer toque de la pantalla, ANTES de que se necesite el
  // primer tick — así el costo de crear/despertar el AudioContext no se
  // siente como un salto justo cuando cruza el primer diente.
  const warm = useCallback(() => { const ctx = ensureCtx(); if (ctx) ensureNoise(ctx); }, [ensureCtx, ensureNoise]);

  /**
   * Cada diente cruzado suena como un scratch de vinilo real: ruido
   * filtrado en banda (la "textura" del surco bajo la aguja) + un tono
   * sawtooth barrido en pitch (el "wiii" característico) — ambos van de
   * grave a agudo o agudo a grave según hacia dónde se está girando el
   * disco, igual que un DJ moviendo el brazo adelante/atrás.
   */
  const tick = useCallback((strength: number = 1, direction: 1 | -1 = 1) => {
    try {
      const ctx = ensureCtx();
      if (!ctx) return;
      const noiseBuffer = ensureNoise(ctx);

      const now = ctx.currentTime;
      const dur = 0.05 + 0.02 * Math.min(strength, 1.4);

      // Textura de ruido/surco, pasada por un filtro de banda barrido
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = 5;
      const bandFrom = direction > 0 ? 350 : 2800;
      const bandTo   = direction > 0 ? 2800 : 350;
      band.frequency.setValueAtTime(bandFrom, now);
      band.frequency.exponentialRampToValueAtTime(bandTo, now + dur);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.1 * strength, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      noise.connect(band).connect(noiseGain).connect(ctx.destination);

      // Tono barrido — el cuerpo melódico del scratch
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      const pitchFrom = direction > 0 ? 200 : 780;
      const pitchTo   = direction > 0 ? 780 : 200;
      osc.frequency.setValueAtTime(pitchFrom, now);
      osc.frequency.exponentialRampToValueAtTime(pitchTo, now + dur);
      const oscLp = ctx.createBiquadFilter();
      oscLp.type = 'lowpass';
      oscLp.frequency.value = 2400;
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.05 * strength, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(oscLp).connect(oscGain).connect(ctx.destination);

      noise.start(now); noise.stop(now + dur);
      osc.start(now);   osc.stop(now + dur);
    } catch { /* audio no soportado — degrada silenciosamente */ }
  }, [ensureCtx, ensureNoise]);

  return { tick, warm };
}

function useHaptic() {
  return useCallback((ms: number | number[] = 12) => {
    try { navigator.vibrate?.(ms); } catch { /* no soportado */ }
  }, []);
}

interface SheetOrigin { x: number; y: number; r: number; }

const SHEET_CLOSE_MS = 420;

/**
 * Panel que se abre con el círculo "transformándose" en pantalla completa.
 * Se puede cerrar de 3 formas: botón X, botón/gesto "atrás" del navegador
 * o celular (sin salir de /myapp — solo cierra la sección), y deslizando
 * desde el borde izquierdo hacia la derecha (gesto tipo iOS).
 */
function SectionSheet({ section, origin, onClose, attendee, token, onLogout }: {
  section: CompassSection; origin: SheetOrigin; onClose: () => void;
  attendee: Attendee | null; token: string | null; onLogout: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const haptic = useHaptic();
  const closingRef = useRef(false);
  const swipeRef = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { pull, refreshing, progress, handlers: pullHandlers } = usePullToRefresh(sheetRef);

  useEffect(() => {
    const t = window.setTimeout(() => setExpanded(true), 20);
    haptic(14);

    // Empuja una entrada de historial — así "atrás" cierra la sección
    // en vez de salir de /myapp.
    window.history.pushState({ myappSheet: true }, '');

    const onPopState = () => {
      if (closingRef.current) return;
      closingRef.current = true;
      setExpanded(false);
      window.setTimeout(onClose, SHEET_CLOSE_MS);
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('popstate', onPopState);
    };
  }, [haptic, onClose]);

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setExpanded(false);
    haptic(10);
    window.setTimeout(onClose, SHEET_CLOSE_MS);
    // Consume la entrada de historial que empujamos al abrir, para que
    // el siguiente "atrás" no quede apuntando a un estado fantasma.
    window.history.back();
  };

  // Gesto: deslizar desde el borde izquierdo hacia la derecha para cerrar
  const onPointerDown = (e: React.PointerEvent) => {
    swipeRef.current = e.clientX < 28 ? { x: e.clientX, y: e.clientY, active: true } : null;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = swipeRef.current;
    if (!s?.active) return;
    const dx = e.clientX - s.x;
    const dy = Math.abs(e.clientY - s.y);
    if (dx > 90 && dy < 60) {
      s.active = false;
      handleClose();
    }
  };

  const clip = expanded
    ? `circle(150% at ${origin.x}px ${origin.y}px)`
    : `circle(${origin.r}px at ${origin.x}px ${origin.y}px)`;

  // El mapa usa el mismo gesto de arrastrar para orbitar la cámara 3D —
  // el pull-to-refresh no aplica ahí, chocaría con eso.
  const isMapa = section.id === 'mapa';

  return (
    <div
      ref={sheetRef}
      className="myapp-sheet"
      style={{
        clipPath: clip,
        WebkitClipPath: clip,
        transitionDuration: expanded ? '820ms' : `${SHEET_CLOSE_MS}ms`,
        ['--accent' as any]: section.color,
      }}
      data-no-drag
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      {...(isMapa ? {} : pullHandlers)}
    >
      {!isMapa && <PullIndicator pull={pull} progress={progress} refreshing={refreshing} />}

      {section.id !== 'mapa' && (
        <>
          <div className="myapp-sheet-bg" style={{ backgroundImage: `url(${section.image})` }} />
          <div className="myapp-sheet-scrim" />
        </>
      )}

      <div className={`myapp-sheet-header ${section.id === 'mapa' ? 'myapp-sheet-header--floating' : ''}`}>
        <button className="myapp-sheet-close" onClick={handleClose} aria-label="Cerrar">✕</button>
        <span className="myapp-sheet-title">
          <section.Icon size={19} strokeWidth={1.6} />
          {section.label}
        </span>
      </div>

      <div className={`myapp-sheet-content ${section.id === 'mapa' ? 'myapp-sheet-content--flush' : ''}`}>
        {renderSectionContent(section, attendee, onLogout, token)}
      </div>
    </div>
  );
}

export default function MyApp() {
  const { status: sessionStatus, attendee, token, login, logout, patchAttendee } = useMyAppSession();

  // Manifest de /myapp + botón "instalar" — antes vivía SOLO en MyAppLogin,
  // pero con sesión de 7 días la mayoría de las veces el usuario nunca pasa
  // por el login (queda logueado), así que el manifest nunca se inyectaba
  // y el botón de instalar era invisible en la práctica. Ahora vive acá,
  // a nivel de toda /myapp, sin importar si está logueado o no.
  useEffect(() => {
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest-myapp.json';
    document.head.appendChild(manifestLink);

    const prevAppleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    const prevHref = prevAppleIcon?.href;
    if (prevAppleIcon) prevAppleIcon.href = '/AIRA.png';

    return () => {
      manifestLink.remove();
      if (prevAppleIcon && prevHref) prevAppleIcon.href = prevHref;
    };
  }, []);

  const [rotation, setRotation]   = useState(0);      // ángulo acumulado del aro
  const [activeIdx, setActiveIdx] = useState(0);
  const [dragging, setDragging]   = useState(false);
  const [snapping, setSnapping]   = useState(false);
  const [openSection, setOpenSection] = useState<{ section: CompassSection; origin: SheetOrigin } | null>(null);

  const rootRef         = useRef<HTMLDivElement>(null);
  const ringRef          = useRef<HTMLDivElement>(null);
  const circleRef         = useRef<HTMLButtonElement>(null);
  const lastAngleRef    = useRef(0);
  const lastStepRef     = useRef(0);       // último "diente" cruzado, para no repetir tick
  const pointerIdRef    = useRef<number | null>(null);
  const rotationRef      = useRef(0);       // espejo síncrono de `rotation`, para el listener global
  const openRef           = useRef(false);  // espejo síncrono — bloquea el drag mientras hay sección abierta
  const centerRef         = useRef({ cx: 0, cy: 0 }); // centro del aro, cacheado 1 vez por arrastre
  const rafRef             = useRef<number | null>(null); // limita los renders a 1 por frame

  const { tick, warm } = useTickSound();
  const haptic = useHaptic();

  // Cachea el centro del aro UNA vez al empezar a arrastrar — evita forzar
  // un reflow (getBoundingClientRect) en cada pixel de movimiento, que era
  // el principal cuello de botella de la rueda sintiéndose lenta.
  const cacheCenter = () => {
    const el = ringRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    centerRef.current = { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
  };

  const getAngle = (clientX: number, clientY: number): number => {
    const { cx, cy } = centerRef.current;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  };

  const activeSection = SECTIONS[activeIdx];

  // Vibración visual sutil de pantalla — manipula el DOM directo (sin rAF/estado)
  // para que se reinicie de forma confiable en cada diente, aunque se disparen
  // varios seguidos mientras se arrastra rápido.
  const pulseSettle = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    el.classList.remove('is-settled');
    void el.offsetWidth; // fuerza reflow para poder reiniciar la animación
    el.classList.add('is-settled');
  }, []);

  const settleToStep = useCallback((rot: number) => {
    // La sección activa es la más cercana a "arriba" (0°) del aro
    const idx = (((Math.round(-rot / STEP) % N) + N) % N);
    const target = -idx * STEP;
    setSnapping(true);
    setRotation(target);
    rotationRef.current = target;
    setActiveIdx(idx);
    window.setTimeout(() => setSnapping(false), 260);
  }, []);

  // ── Drag desde cualquier punto de la pantalla ──────────────────────────
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      warm(); // precalienta el AudioContext en el primer toque, sea donde sea
      if (openRef.current) return; // no arrastrar con una sección abierta
      // Ignora toques sobre botones/controles (para no romper el tap directo)
      if ((e.target as HTMLElement)?.closest('[data-no-drag]')) return;
      pointerIdRef.current = e.pointerId;
      cacheCenter();
      setDragging(true);
      setSnapping(false);
      lastAngleRef.current = getAngle(e.clientX, e.clientY);
      lastStepRef.current  = Math.round(-rotationRef.current / STEP);
    };

    const onMove = (e: PointerEvent) => {
      if (openRef.current) return;
      if (pointerIdRef.current !== e.pointerId) return;
      const angle = getAngle(e.clientX, e.clientY);
      let delta = angle - lastAngleRef.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      const next = rotationRef.current + delta;
      lastAngleRef.current = angle;
      rotationRef.current  = next;

      // Un solo setState por frame — el dedo/mouse puede disparar
      // pointermove muchas más veces por segundo de lo que React necesita
      // re-renderizar; sin esto cada pixel recalculaba las 8 posiciones
      // del aro y se sentía "pesado".
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setRotation(rotationRef.current);
        });
      }

      const currentStep = Math.round(-next / STEP);
      if (currentStep !== lastStepRef.current) {
        const direction: 1 | -1 = currentStep > lastStepRef.current ? 1 : -1;
        lastStepRef.current = currentStep;
        const idx = (((currentStep % N) + N) % N);
        setActiveIdx(idx);
        tick(1, direction);
        haptic(10);
        pulseSettle();
      }
    };

    const onUp = (e: PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      pointerIdRef.current = null;
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      setDragging(false);
      if (openRef.current) return;
      settleToStep(rotationRef.current);
      tick(1.4);
      haptic([0, 16, 40, 10]);
      pulseSettle();
    };

    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [settleToStep, tick, haptic, pulseSettle, warm]);

  const goToIndex = (idx: number) => {
    if (idx === activeIdx) return;
    settleToStep(-idx * STEP);
    tick(1.4);
    haptic([0, 16, 40, 10]);
    pulseSettle();
  };

  const openActiveSection = () => {
    const el = circleRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const origin: SheetOrigin = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      r: rect.width / 2,
    };
    openRef.current = true;
    setOpenSection({ section: activeSection, origin });
  };

  const closeSection = () => {
    openRef.current = false;
    setOpenSection(null);
  };

  const sectionsWithAngle = useMemo(
    () => SECTIONS.map((s, i) => ({ ...s, angle: i * STEP })),
    []
  );

  useEffect(() => {
    document.title = 'AIRA · Menú';
  }, []);

  // Al volver de pagar un pedido de Joinn (Bold redirige a
  // /myapp?order=<id>), abre directo "Bar" → "Mi cuenta" en vez de dejar
  // al usuario en el inicio sin saber qué pasó con su pedido.
  useEffect(() => {
    if (sessionStatus !== 'authed') return;
    if (!new URLSearchParams(window.location.search).has('order')) return;
    const pedidosIdx = SECTIONS.findIndex(s => s.id === 'pedidos');
    if (pedidosIdx < 0) return;
    // Sin un círculo tocado de verdad, se usa el centro de pantalla como
    // origen de la animación — se ve bien igual, solo cambia desde dónde
    // "explota" la hoja al abrirse.
    const origin: SheetOrigin = { x: window.innerWidth / 2, y: window.innerHeight / 2, r: 90 };
    openRef.current = true;
    setActiveIdx(pedidosIdx);
    setOpenSection({ section: SECTIONS[pedidosIdx], origin });
    // Limpia el ?order= de la URL para que un refresh no vuelva a abrirlo
    // solo — con delay a propósito: MyAppOrders.tsx (el hijo que se monta
    // con setOpenSection de arriba) todavía necesita leer ese mismo query
    // param en su primer render para saber que debe arrancar en "Mi
    // cuenta" en vez de la carta. Si se limpia ya, ese hijo nunca la ve.
    window.setTimeout(() => window.history.replaceState({}, '', window.location.pathname), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  // Puerta de sesión — sin OTP verificado no se ve el menú real
  if (sessionStatus === 'checking') {
    return (
      <div className="myapp-splash">
        <img src="/AIRA BLANCO.png" alt="AIRA" className="myapp-splash-logo" />
      </div>
    );
  }
  if (sessionStatus === 'anon') {
    return <MyAppLogin onLogin={login} />;
  }

  // Consentimiento informado — obligatorio una sola vez, después del OTP
  // y antes de ver el menú real. Se consulta después en Mi Perfil.
  if (attendee && token && !attendee.consentAcceptedAt) {
    return (
      <MyAppConsent
        attendee={attendee}
        token={token}
        onAccepted={(consentAcceptedAt) => patchAttendee({ consentAcceptedAt })}
      />
    );
  }

  return (
    <>
    <div
      ref={rootRef}
      className="myapp-root"
      onAnimationEnd={(e) => { if (e.animationName === 'myapp-settle-shake') rootRef.current?.classList.remove('is-settled'); }}
    >
      {/* Fondo — imagen de la sección activa, borrosa y oscurecida (igual que /mesa) */}
      <div
        key={`bg-${activeSection.id}`}
        className="myapp-bg"
        style={{ backgroundImage: `url(${activeSection.image})` }}
      />
      <div className="myapp-bg-scrim" />

      <div className="myapp-topbar">
        <img src="/AIRA BLANCO.png" alt="AIRA" className="myapp-logo" data-no-drag />
      </div>

      {/* Nombre de la sección activa — como la pantallita del canal en una
          consola de DJ (Pioneer/Denon): bisel + display oscuro con el
          nombre, LED de color a juego con la sección. Cambia con key
          para que haga fade al girar. */}
      <div className="myapp-current-label" data-no-drag>
        <div className="myapp-current-screen" style={{ ['--accent' as any]: activeSection.color }}>
          <span className="myapp-current-screen-led" />
          <span key={activeSection.id} className="myapp-current-label-text">{activeSection.label}</span>
        </div>
      </div>

      {/* Zona central — la rueda vive aquí, arrastrable desde toda la pantalla */}
      <div className="myapp-wheel-zone">
        <div className="myapp-ring-contact-shadow" />
        {/* Plato de la tornamesa — carcasa fija detrás del vinilo, no rota */}
        <div className="myapp-plinth">
          <span className="myapp-plinth-screw myapp-plinth-screw--tl" />
          <span className="myapp-plinth-screw myapp-plinth-screw--tr" />
          <span className="myapp-plinth-screw myapp-plinth-screw--bl" />
          <span className="myapp-plinth-screw myapp-plinth-screw--br" />
        </div>
        <div
          ref={ringRef}
          className={`myapp-ring ${dragging ? 'is-dragging' : ''} ${snapping ? 'is-snapping' : ''}`}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {sectionsWithAngle.map((s, i) => (
            <button
              key={s.id}
              data-no-drag
              className={`myapp-tooth ${i === activeIdx ? 'is-active' : ''}`}
              style={{
                transform: `rotate(${s.angle}deg) translateY(-150px) rotate(${-s.angle - rotation}deg)`,
                ['--accent' as any]: s.color,
              }}
              onClick={(e) => { e.stopPropagation(); goToIndex(i); }}
              aria-label={s.label}
            >
              <s.Icon className="myapp-tooth-icon" size={20} strokeWidth={1.6} />
            </button>
          ))}
        </div>

        {/* Núcleo fijo (no rota) con la imagen de la sección activa — tocar para abrir */}
        <div className="myapp-core">
          <div className="myapp-preview-glow" style={{ background: activeSection.color }} />
          {/* Pulso tipo radar — señala que el círculo es tocable */}
          <span className="myapp-tap-ping" style={{ borderColor: activeSection.color }} />
          <span className="myapp-tap-ping myapp-tap-ping--delay" style={{ borderColor: activeSection.color }} />
          <button
            ref={circleRef}
            key={activeSection.id}
            className="myapp-preview-circle"
            data-no-drag
            onClick={openActiveSection}
            aria-label={`Abrir ${activeSection.label}`}
          >
            <img src={activeSection.image} alt={activeSection.label} draggable={false} />
            <div className="myapp-preview-ring" style={{ boxShadow: `0 0 0 3px ${activeSection.color}` }} />
          </button>
        </div>

        {/* Brazo/aguja fijo arriba del aro — indica la sección seleccionada,
            como el cabezal de una tornamesa apuntando al disco */}
        <div className="myapp-pointer" style={{ ['--accent' as any]: activeSection.color }}>
          <span className="myapp-pointer-arm" />
          <span className="myapp-pointer-tip" />
        </div>
      </div>

      <div className="myapp-footer">
        <div className="myapp-hint">Toca el vinilo para abrir · Gira la tornamesa para cambiar</div>
      </div>

      {openSection && (
        <SectionSheet
          section={openSection.section}
          origin={openSection.origin}
          onClose={closeSection}
          attendee={attendee}
          token={token}
          onLogout={logout}
        />
      )}
    </div>

    {/* Reloj en vivo — fuera de .myapp-root a propósito: ese contenedor
        anima su transform en cada "tac" (pulseSettle) y cualquier
        transform en un ancestro rompe el position:fixed de sus hijos. */}
    <MyAppClock />
    </>
  );
}
