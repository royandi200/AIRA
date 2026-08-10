import { useEffect, useState } from 'react';
import { formatHM, useLiveSchedule } from './MyAppSchedule';

/**
 * Reloj en vivo — visible en el home (rueda) y encima de cualquier
 * sección abierta. Los dos puntos titilan cada segundo (real, no CSS
 * loop desincronizado) y debajo se muestra la actividad en curso del
 * itinerario, o la próxima si todavía no empieza nada.
 */
export default function MyAppClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { current, next } = useLiveSchedule();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const blink = now.getSeconds() % 2 === 0;

  return (
    <div className="myapp-clock" data-no-drag>
      <div className="myapp-clock-time">
        <span>{hh}</span>
        <span className="myapp-clock-colon" style={{ opacity: blink ? 1 : 0.25 }}>:</span>
        <span>{mm}</span>
      </div>
      {current ? (
        <div className="myapp-clock-status myapp-clock-status--live">
          <span className="myapp-clock-live-dot" />
          <span className="myapp-clock-status-text">{current.title}</span>
        </div>
      ) : next ? (
        <div className="myapp-clock-status">
          <span className="myapp-clock-status-text">Próximo · {formatHM(next.start)}</span>
        </div>
      ) : null}
    </div>
  );
}
