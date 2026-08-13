import { useCallback, useEffect, useState } from 'react';

/**
 * Sesión real de /myapp — respaldada por OTP verificado contra la
 * base de datos de boletas (api/myapp-auth-*.ts). El token vive en
 * localStorage; api/myapp-me.ts lo valida y devuelve los datos reales
 * del asistente cada vez que abre la app.
 */

const TOKEN_KEY = 'aira_myapp_session_token';

export interface Attendee {
  name: string;
  orderRef: string;
  isVip: boolean;
  qrToken: string | null;
  paquete: string | null;
  montoPendiente: number;
  consentAcceptedAt: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  medicalConditions: string | null;
}

export type SessionStatus = 'checking' | 'authed' | 'anon';

export function useMyAppSession() {
  const [token, setToken]       = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [status, setStatus]     = useState<SessionStatus>('checking');

  useEffect(() => {
    if (!token) { setStatus('anon'); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/myapp-me?token=${encodeURIComponent(token)}`);
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && json?.ok) {
          setAttendee(json.attendee);
          setStatus('authed');
        } else if (res.status === 401) {
          // Único caso real de "cerrar sesión" — token inválido o expirado.
          console.warn('[myapp] sesión inválida/expirada, cerrando sesión');
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setStatus('anon');
        } else {
          // Cualquier otro error (500, hiccup de DB, etc.) es transitorio —
          // NO cerramos la sesión por esto. Si ya había un attendee en
          // memoria (ej. recién logueado), lo dejamos como está.
          console.warn('[myapp] myapp-me falló de forma transitoria, se mantiene la sesión', res.status, json);
          setStatus(prev => (prev === 'checking' ? 'authed' : prev));
        }
      } catch (err) {
        // Sin conexión — no cerramos la sesión, solo no confirmamos datos frescos
        console.warn('[myapp] myapp-me sin conexión', err);
        if (!cancelled) setStatus(prev => (prev === 'checking' ? 'anon' : prev));
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const login = useCallback((newToken: string, newAttendee: Attendee) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setAttendee(newAttendee);
    setStatus('authed');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setAttendee(null);
    setStatus('anon');
  }, []);

  // Actualiza el attendee en memoria sin volver a pegarle al backend —
  // usado justo después de aceptar el consentimiento informado.
  const patchAttendee = useCallback((patch: Partial<Attendee>) => {
    setAttendee(prev => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return { status, attendee, token, login, logout, patchAttendee };
}
