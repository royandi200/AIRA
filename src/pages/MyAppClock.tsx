import { useEffect, useState } from 'react';
import { formatHM, useLiveSchedule, colorForPlace } from './MyAppSchedule';
import { getNow } from './timeDebug';

/**
 * Reloj en vivo — visible en el home (rueda) y encima de cualquier
 * sección abierta. Los dos puntos titilan cada segundo (real, no CSS
 * loop desincronizado) y debajo se muestra la actividad en curso del
 * itinerario, o la próxima si todavía no empieza nada.
 */
export default function MyAppClock() {
  const [now, setNow] = useState(() => getNow());
  useEffect(() => {
    const id = window.setInterval(() => setNow(getNow()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { currentList, next } = useLiveSchedule();
  const current = currentList[0] ?? null;
  const extraStages = currentList.length - 1;
  const h24 = now.getHours();
  const hh = String(h24 % 12 === 0 ? 12 : h24 % 12);
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const blink = now.getSeconds() % 2 === 0;

  return (
    <div className="myapp-clock" data-no-drag>
      <div className="myapp-clock-time">
        <span>{hh}</span>
        <span className="myapp-clock-colon" style={{ opacity: blink ? 1 : 0.25 }}>:</span>
        <span>{mm}</span>
        <span className="myapp-clock-ampm">{ampm}</span>
      </div>
      {current ? (
        <div className="myapp-clock-status myapp-clock-status--live" style={{ ['--card-color' as any]: colorForPlace(current.place) }}>
          <span className="myapp-clock-live-dot" />
          <span className="myapp-clock-status-text">
            {current.title} · {current.place}
            {extraStages > 0 ? ` +${extraStages} escenario${extraStages > 1 ? 's' : ''}` : ''}
          </span>
        </div>
      ) : next ? (
        <div className="myapp-clock-status">
          <span className="myapp-clock-status-text">Próximo · {formatHM(next.start)}</span>
        </div>
      ) : null}
    </div>
  );
}
