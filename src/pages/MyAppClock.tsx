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
        // Una sola línea siempre — con 2+ escenarios simultáneos cada uno
        // aparece en su color dentro de la misma línea (separados por ·),
        // y si no cabe todo se recorta con ellipsis en vez de tapar la
        // pantalla o el botón de cerrar de la sección abierta.
        <div className="myapp-clock-status myapp-clock-status--live">
          <span className="myapp-clock-status-text">
            {currentList.map((item, i) => (
              <span key={i}>
                {i > 0 && <span className="myapp-clock-live-sep"> · </span>}
                <span className="myapp-clock-live-item" style={{ color: colorForPlace(item.place) }}>
                  ● {item.title} · {item.place}
                </span>
              </span>
            ))}
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
