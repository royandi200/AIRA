import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './MyApp.css';

/**
 * MyApp — Webapp para asistentes al evento AIRA.
 * Menú principal: brújula/dial giratorio con detentes (como caja fuerte).
 * Cada sección "cae" en su diente con vibración + tick de audio,
 * y la imagen central hace zoom/crossfade circular al seleccionar
 * (mismo lenguaje visual que el círculo de plato en /mesa).
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

  const ringRef       = useRef<HTMLDivElement>(null);
  const lastAngleRef   = useRef(0);
  const startRotRef    = useRef(0);
  const lastStepRef    = useRef(0);       // último "diente" cruzado, para no repetir tick
  const pointerIdRef   = useRef<number | null>(null);

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
    setActiveIdx(idx);
    window.setTimeout(() => setSnapping(false), 260);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointerIdRef.current = e.pointerId;
    setDragging(true);
    setSnapping(false);
    lastAngleRef.current = getAngle(e.clientX, e.clientY);
    startRotRef.current  = rotation;
    lastStepRef.current  = Math.round(-rotation / STEP);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || pointerIdRef.current !== e.pointerId) return;
    const angle = getAngle(e.clientX, e.clientY);
    let delta = angle - lastAngleRef.current;
    // corrige el salto de -180/180
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const next = rotation + delta;
    lastAngleRef.current = angle;
    setRotation(next);

    // Detectar cruce de diente → tac + vibración + actualizar preview central
    const currentStep = Math.round(-next / STEP);
    if (currentStep !== lastStepRef.current) {
      lastStepRef.current = currentStep;
      const idx = (((currentStep % N) + N) % N);
      setActiveIdx(idx);
      tick(1);
      haptic(10);
    }
  };

  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    settleToStep(rotation);
    tick(1.4);
    haptic([0, 16, 40, 10]);
  };

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
        <span className="myapp-brand">AIRA</span>
        <span className="myapp-brand-sub">Asistentes</span>
      </div>

      {/* Preview central — mismo lenguaje visual del círculo de /mesa */}
      <div className="myapp-preview">
        <div className="myapp-preview-glow" style={{ background: activeSection.color }} />
        <div key={activeSection.id} className="myapp-preview-circle">
          <img src={activeSection.image} alt={activeSection.label} draggable={false} />
          <div className="myapp-preview-ring" style={{ boxShadow: `0 0 0 3px ${activeSection.color}` }} />
        </div>
        <div className="myapp-preview-label">
          <span className="myapp-preview-emoji">{activeSection.emoji}</span>
          <span className="myapp-preview-text">{activeSection.label}</span>
        </div>
      </div>

      {/* Aro giratorio */}
      <div className="myapp-wheel-zone">
        <div
          ref={ringRef}
          className={`myapp-ring ${dragging ? 'is-dragging' : ''} ${snapping ? 'is-snapping' : ''}`}
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {sectionsWithAngle.map((s, i) => (
            <button
              key={s.id}
              className={`myapp-tooth ${i === activeIdx ? 'is-active' : ''}`}
              style={{
                transform: `rotate(${s.angle}deg) translateY(-140px) rotate(${-s.angle - rotation}deg)`,
                ['--accent' as any]: s.color,
              }}
              onClick={(e) => { e.stopPropagation(); goToIndex(i); }}
              aria-label={s.label}
            >
              <span className="myapp-tooth-emoji">{s.emoji}</span>
            </button>
          ))}
          <div className="myapp-ring-core" />
        </div>

        {/* Puntero fijo arriba — indica la sección seleccionada */}
        <div className="myapp-pointer" style={{ ['--accent' as any]: activeSection.color }}>▲</div>
      </div>

      <div className="myapp-hint">Gira el aro para explorar</div>
    </div>
  );
}
