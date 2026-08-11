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
        const json = await res.json();
        if (cancelled) return;
        if (json.ok) {
          setAttendee(json.attendee);
          setStatus('authed');
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setStatus('anon');
        }
      } catch {
        // Sin conexión — no cerramos la sesión, solo no confirmamos datos frescos
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

  return { status, attendee, login, logout };
}
