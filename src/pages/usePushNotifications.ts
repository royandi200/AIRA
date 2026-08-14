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
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    ).catch(() => {});
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || !token || iosNeedsInstall) return;
    setBusy(true);
    setError('');
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setBusy(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const res = await fetch(`/api/myapp-push-subscribe?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      const json = await res.json();
      if (json.ok) setSubscribed(true);
      else setError(json.error || 'No se pudo activar');
    } catch {
      setError('No se pudo activar. Intenta de nuevo.');
    }
    setBusy(false);
  }, [supported, token, iosNeedsInstall]);

  return { supported, permission, subscribed, busy, error, iosNeedsInstall, subscribe };
}
