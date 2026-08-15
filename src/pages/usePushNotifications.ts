import { useCallback, useEffect, useState } from 'react';

/**
 * Notificaciones push (Web Push nativo) — se activan desde un botón en
 * Perfil. En iOS solo funcionan si la app ya está instalada en la
 * pantalla de inicio (limitación de Apple, no hay forma de saltarla).
 */

// Clave pública VAPID — es pública por diseño (así funciona Web Push),
// no es un secreto; la privada vive solo en las env vars de Vercel.
const VAPID_PUBLIC_KEY = 'BOSmeLbMOrkyF9UIBU57VS7Iqod_qw6j4B3r8s_CNJaKeBC1p85z2UK19gokZEfC8yumalEuQVCBLBLgvTuiBpQ';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}
function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Manda el fallo al servidor (fire-and-forget, nunca bloquea ni rompe la
 * UX si esto mismo falla) — antes un error como "Registration failed -
 * push service error" solo quedaba en la consola del celular de la
 * persona, imposible de ver a distancia. Con esto queda guardado con el
 * dispositivo (user-agent) y en qué paso pasó, revisable desde
 * /myapp-notificaciones.
 */
function logPushFailure(stage: string, err: unknown) {
  try {
    const e = err as { name?: string; message?: string } | undefined;
    fetch('/api/myapp-push-log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage,
        errorName: e?.name,
        errorMessage: e?.message,
        userAgent: navigator.userAgent,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* nunca romper la UX por el logging en sí */ }
}

export function usePushNotifications(token: string | null) {
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // iOS solo soporta push si la app está instalada (standalone)
  const iosNeedsInstall = isIOS() && !isStandalone();

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('[push] no se pudo registrar el service worker:', err);
      logPushFailure('sw-register', err);
    });
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    ).catch(err => console.error('[push] no se pudo leer la suscripción existente:', err));
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || !token || iosNeedsInstall) return;
    setBusy(true);
    setError('');
    let stage = 'permiso';
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setBusy(false); return; }

      stage = 'service-worker';
      const reg = await navigator.serviceWorker.ready;

      stage = 'push-subscribe'; // acá cae el "Registration failed - push service error"
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      stage = 'guardar-suscripcion';
      const res = await fetch(`/api/myapp-push-subscribe?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      const json = await res.json();
      if (json.ok) setSubscribed(true);
      else { setError(json.error || 'No se pudo activar'); logPushFailure(stage, { message: json.error }); }
    } catch (err: any) {
      // Antes tragaba el error real y siempre mostraba el mismo mensaje
      // generico — sin saber en qué paso ni por qué, era imposible
      // diagnosticar a distancia (ej. el "Registration failed - push
      // service error" que solo pasa en algunos celulares Android).
      console.error(`[push] subscribe falló en "${stage}":`, err);
      logPushFailure(stage, err);
      const detail = err?.message ? `: ${err.message}` : '';
      setError(`No se pudo activar${detail}. Intenta de nuevo.`);
    }
    setBusy(false);
  }, [supported, token, iosNeedsInstall]);

  return { supported, permission, subscribed, busy, error, iosNeedsInstall, subscribe };
}
