import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './MyApp.css';
import { SECTIONS, renderSectionContent, type CompassSection } from './MyAppSections';

/**
 * MyApp — Webapp para asistentes al evento AIRA.
 * Menú principal: brújula/dial giratorio con detentes (como caja fuerte).
 * Cada sección "cae" en su diente con vibración + tick de audio,
 * y la imagen central hace zoom/crossfade circular al seleccionar
 * (mismo lenguaje visual que el círculo de plato en /mesa).
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

/** Sintetiza un "tac" corto vía WebAudio — sin depender de archivos de audio */
function useTickSound() {
  const ctxRef = useRef<AudioContext | null>(null);

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

  // Se llama en el primer toque de la pantalla, ANTES de que se necesite el
  // primer tick — así el costo de crear/despertar el AudioContext no se
  // siente como un salto justo cuando cruza el primer diente.
  const warm = useCallback(() => { ensureCtx(); }, [ensureCtx]);

  const tick = useCallback((strength: number = 1) => {
    try {
      const ctx = ensureCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const hp   = ctx.createBiquadFilter();

      hp.type = 'highpass';
      hp.frequency.value = 800;

      osc.type = 'square';
      osc.frequency.setValueAtTime(1400 + strength * 400, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.025);

      gain.gain.setValueAtTime(0.18 * strength, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(hp).connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch { /* audio no soportado — degrada silenciosamente */ }
  }, [ensureCtx]);

  return { tick, warm };
}

function useHaptic() {
  return useCallback((ms: number | number[] = 12) => {
    try { navigator.vibrate?.(ms); } catch { /* no soportado */ }
  }, []);
}

interface SheetOrigin { x: number; y: number; r: number; }

/** Panel que se abre con el círculo "transformándose" en pantalla completa */
function SectionSheet({ section, origin, onClose }: {
  section: CompassSection; origin: SheetOrigin; onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const haptic = useHaptic();

  useEffect(() => {
    const t = window.setTimeout(() => setExpanded(true), 20);
    haptic(14);
    return () => window.clearTimeout(t);
  }, [haptic]);

  const CLOSE_MS = 420;

  const handleClose = () => {
    setExpanded(false);
    haptic(10);
    window.setTimeout(onClose, CLOSE_MS);
  };

  const clip = expanded
    ? `circle(150% at ${origin.x}px ${origin.y}px)`
    : `circle(${origin.r}px at ${origin.x}px ${origin.y}px)`;

  return (
    <div
      className="myapp-sheet"
      style={{
        clipPath: clip,
        WebkitClipPath: clip,
        transitionDuration: expanded ? '820ms' : `${CLOSE_MS}ms`,
        ['--accent' as any]: section.color,
      }}
      data-no-drag
    >
      <div className="myapp-sheet-bg" style={{ backgroundImage: `url(${section.image})` }} />
      <div className="myapp-sheet-scrim" />

      <div className="myapp-sheet-header">
        <button className="myapp-sheet-close" onClick={handleClose} aria-label="Cerrar">✕</button>
        <span className="myapp-sheet-title">
          <section.Icon size={19} strokeWidth={1.6} />
          {section.label}
        </span>
      </div>

      <div className="myapp-sheet-content">
        {renderSectionContent(section)}
      </div>
    </div>
  );
}

export default function MyApp() {
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
        lastStepRef.current = currentStep;
        const idx = (((currentStep % N) + N) % N);
        setActiveIdx(idx);
        tick(1);
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

  return (
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

      {/* Zona central — la rueda vive aquí, arrastrable desde toda la pantalla */}
      <div className="myapp-wheel-zone">
        <div className="myapp-ring-contact-shadow" />
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

        {/* Puntero fijo arriba del aro — indica la sección seleccionada */}
        <div className="myapp-pointer" style={{ ['--accent' as any]: activeSection.color }}>▲</div>
      </div>

      <div className="myapp-footer">
        <div className="myapp-preview-label">
          <activeSection.Icon className="myapp-preview-icon" size={16} strokeWidth={1.6} />
          <span className="myapp-preview-text">{activeSection.label}</span>
        </div>
        <div className="myapp-hint">Toca el círculo para abrir · Desliza para girar</div>
      </div>

      {openSection && (
        <SectionSheet
          section={openSection.section}
          origin={openSection.origin}
          onClose={closeSection}
        />
      )}
    </div>
  );
}
