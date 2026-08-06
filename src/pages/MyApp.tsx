import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './MyApp.css';

/**
 * MyApp — Webapp para asistentes al evento AIRA.
 * Menú principal: brújula/dial giratorio con detentes (como caja fuerte).
 * Cada sección "cae" en su diente con vibración + tick de audio,
 * y la imagen central hace zoom/crossfade circular al seleccionar
 * (mismo lenguaje visual que el círculo de plato en /mesa).
 *
 * La rueda vive centrada en pantalla y se puede arrastrar desde
 * cualquier punto de la pantalla, no solo tocando el aro.
 */

interface CompassSection {
  id: string;
  label: string;
  emoji: string;
  image: string;
  color: string; // acento por sección
}

const SECTIONS: CompassSection[] = [
  { id: 'boletas',   label: 'Mi Boleta',   emoji: '🎟️', image: '/AIRA.png',           color: '#22c55e' },
  { id: 'lineup',    label: 'Line-Up',     emoji: '🎧', image: '/dj-console.jpg',      color: '#a855f7' },
  { id: 'mapa',      label: 'Mapa',        emoji: '🗺️', image: '/guatape-aerial.jpg',  color: '#38bdf8' },
  { id: 'galeria',   label: 'Galería',     emoji: '📸', image: '/crowd-1.jpg',         color: '#f97316' },
  { id: 'vip',       label: 'VIP',         emoji: '👑', image: '/vip-area.jpg',        color: '#facc15' },
  { id: 'transporte',label: 'Transporte',  emoji: '🚌', image: '/yacht-party.jpg',     color: '#ef4444' },
  { id: 'perfil',    label: 'Mi Perfil',   emoji: '👤', image: '/dj-portrait.jpg',     color: '#ec4899' },
];

const N = SECTIONS.length;
const STEP = 360 / N;

/** Sintetiza un "tac" corto vía WebAudio — sin depender de archivos de audio */
function useTickSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const tick = useCallback((strength: number = 1) => {
    try {
      if (!ctxRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        ctxRef.current = new AC();
      }
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

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
  }, []);

  return tick;
}

function useHaptic() {
  return useCallback((ms: number | number[] = 12) => {
    try { navigator.vibrate?.(ms); } catch { /* no soportado */ }
  }, []);
}

export default function MyApp() {
  const [rotation, setRotation]   = useState(0);      // ángulo acumulado del aro
  const [activeIdx, setActiveIdx] = useState(0);
  const [dragging, setDragging]   = useState(false);
  const [snapping, setSnapping]   = useState(false);

  const ringRef        = useRef<HTMLDivElement>(null);
  const lastAngleRef    = useRef(0);
  const lastStepRef     = useRef(0);       // último "diente" cruzado, para no repetir tick
  const pointerIdRef    = useRef<number | null>(null);
  const rotationRef      = useRef(0);       // espejo síncrono de `rotation`, para el listener global

  const tick   = useTickSound();
  const haptic = useHaptic();

  // Ángulo del centro del aro hasta el puntero
  const getAngle = (clientX: number, clientY: number): number => {
    const el = ringRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  };

  const activeSection = SECTIONS[activeIdx];

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
      // Ignora toques sobre botones/controles (para no romper el tap directo)
      if ((e.target as HTMLElement)?.closest('[data-no-drag]')) return;
      pointerIdRef.current = e.pointerId;
      setDragging(true);
      setSnapping(false);
      lastAngleRef.current = getAngle(e.clientX, e.clientY);
      lastStepRef.current  = Math.round(-rotationRef.current / STEP);
    };

    const onMove = (e: PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      const angle = getAngle(e.clientX, e.clientY);
      let delta = angle - lastAngleRef.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      const next = rotationRef.current + delta;
      lastAngleRef.current = angle;
      rotationRef.current  = next;
      setRotation(next);

      const currentStep = Math.round(-next / STEP);
      if (currentStep !== lastStepRef.current) {
        lastStepRef.current = currentStep;
        const idx = (((currentStep % N) + N) % N);
        setActiveIdx(idx);
        tick(1);
        haptic(10);
      }
    };

    const onUp = (e: PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      pointerIdRef.current = null;
      setDragging(false);
      settleToStep(rotationRef.current);
      tick(1.4);
      haptic([0, 16, 40, 10]);
    };

    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [settleToStep, tick, haptic]);

  const goToIndex = (idx: number) => {
    if (idx === activeIdx) return;
    settleToStep(-idx * STEP);
    tick(1.4);
    haptic([0, 16, 40, 10]);
  };

  const sectionsWithAngle = useMemo(
    () => SECTIONS.map((s, i) => ({ ...s, angle: i * STEP })),
    []
  );

  useEffect(() => {
    document.title = 'AIRA · Menú';
  }, []);

  return (
    <div className="myapp-root">
      <div className="myapp-topbar">
        <img src="/AIRA BLANCO.png" alt="AIRA" className="myapp-logo" data-no-drag />
      </div>

      {/* Zona central — la rueda vive aquí, arrastrable desde toda la pantalla */}
      <div className="myapp-wheel-zone">
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
              <span className="myapp-tooth-emoji">{s.emoji}</span>
            </button>
          ))}
        </div>

        {/* Núcleo fijo (no rota) con la imagen de la sección activa */}
        <div className="myapp-core">
          <div className="myapp-preview-glow" style={{ background: activeSection.color }} />
          <div key={activeSection.id} className="myapp-preview-circle">
            <img src={activeSection.image} alt={activeSection.label} draggable={false} />
            <div className="myapp-preview-ring" style={{ boxShadow: `0 0 0 3px ${activeSection.color}` }} />
          </div>
        </div>

        {/* Puntero fijo arriba del aro — indica la sección seleccionada */}
        <div className="myapp-pointer" style={{ ['--accent' as any]: activeSection.color }}>▲</div>
      </div>

      <div className="myapp-footer">
        <div className="myapp-preview-label">
          <span className="myapp-preview-emoji">{activeSection.emoji}</span>
          <span className="myapp-preview-text">{activeSection.label}</span>
        </div>
        <div className="myapp-hint">Desliza en cualquier parte de la pantalla para girar</div>
      </div>
    </div>
  );
}
