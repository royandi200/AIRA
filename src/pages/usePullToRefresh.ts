import { useCallback, useRef, useState, type RefObject, type TouchEvent } from 'react';

/**
 * Deslizar hacia abajo para refrescar — patrón estándar de apps móviles.
 * Las PWA instaladas (standalone, sin barra del navegador) no lo traen
 * gratis como una pestaña normal, así que se arma a mano.
 *
 * Solo se activa cuando el elemento ya está scrolleado hasta arriba
 * (scrollTop === 0), para no pelear con el scroll normal del contenido.
 * Por defecto, soltar recarga la página entera — resuelve de paso
 * cualquier caché vieja del navegador, que es lo que la mayoría espera
 * de un "refresh".
 */
const THRESHOLD = 70;   // px que hay que jalar para soltar y refrescar
const MAX_PULL  = 100;  // tope visual

export function usePullToRefresh<T extends HTMLElement>(scrollRef: RefObject<T | null>, onRefresh?: () => void | Promise<void>) {
  const [pull, setPull]             = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY  = useRef(0);
  const pulling = useRef(false);
  const busy    = useRef(false);

  const doRefresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    try {
      if (onRefresh) await onRefresh();
      else { window.location.reload(); return; }
    } finally {
      setTimeout(() => { setRefreshing(false); setPull(0); busy.current = false; }, 350);
    }
  }, [onRefresh]);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (refreshing || busy.current) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) { pulling.current = false; return; }
    pulling.current = true;
    startY.current = e.touches[0].clientY;
  }, [refreshing, scrollRef]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) { setPull(0); return; }
    setPull(Math.min(MAX_PULL, dy * 0.5));
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    pulling.current = false;
    setPull(p => {
      if (p >= THRESHOLD) doRefresh();
      else return 0;
      return p;
    });
  }, [doRefresh]);

  return {
    pull, refreshing,
    progress: Math.min(1, pull / THRESHOLD),
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
