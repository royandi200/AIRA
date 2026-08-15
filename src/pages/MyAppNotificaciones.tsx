import { useEffect, useState } from 'react';
import { Send, Bell, AlertTriangle, RefreshCw } from 'lucide-react';
import './MyAppAdmin.css';
import './MyAppNotificaciones.css';

interface PushFailure {
  id: number;
  order_ref: string | null;
  nombre: string | null;
  stage: string;
  error_name: string | null;
  error_message: string | null;
  user_agent: string | null;
  created_at: string;
}

// Extrae "Android 14 · Chrome 128" o similar de un user-agent crudo, sin
// pretender parsearlo perfecto — solo lo suficiente para reconocer el
// dispositivo/navegador de un vistazo en la lista.
function shortDevice(ua: string | null): string {
  if (!ua) return 'Dispositivo desconocido';
  const os = /iphone|ipad/i.test(ua) ? 'iOS' : /android\s*([\d.]+)?/i.exec(ua)?.[0].replace(/android/i, 'Android') || (/windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : 'Otro');
  const browser = /edg\//i.test(ua) ? 'Edge' : /chrome\/[\d.]+/i.exec(ua)?.[0].replace('/', ' ') || (/firefox\/[\d.]+/i.exec(ua)?.[0].replace('/', ' ')) || (/safari\//i.test(ua) ? 'Safari' : 'navegador');
  return `${os} · ${browser}`;
}

/**
 * /myapp-notificaciones — panel para mandar un push a TODOS los
 * asistentes suscritos (broadcast). Misma clave que /myapp-admin
 * (comparten localStorage) porque es la misma operación administrativa.
 */
const KEY_STORAGE = 'aira_myapp_admin_key';

export default function MyAppNotificaciones() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(KEY_STORAGE) || '');
  const [keyInput, setKeyInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [total, setTotal] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/myapp');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [failures, setFailures] = useState<PushFailure[] | null>(null);
  const [loadingFailures, setLoadingFailures] = useState(false);

  useEffect(() => { document.title = 'AIRA · Notificaciones'; }, []);

  const loadFailures = async (key: string) => {
    setLoadingFailures(true);
    try {
      const res = await fetch('/api/myapp-push-log-error', { headers: { 'x-admin-key': key } });
      const json = await res.json();
      if (json.ok) setFailures(json.failures);
    } catch { /* silencioso, hay boton de refrescar */ }
    setLoadingFailures(false);
  };

  const loadTotal = async (key: string) => {
    try {
      const res = await fetch('/api/myapp-push-send', { headers: { 'x-admin-key': key } });
      if (res.status === 401) {
        setAuthError('Clave incorrecta');
        localStorage.removeItem(KEY_STORAGE);
        setAdminKey('');
        return;
      }
      const json = await res.json();
      if (json.ok) setTotal(json.total);
    } catch { /* silencioso, se puede reintentar */ }
  };

  useEffect(() => { if (adminKey) { loadTotal(adminKey); loadFailures(adminKey); } }, [adminKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveKey = () => {
    if (!keyInput.trim()) return;
    localStorage.setItem(KEY_STORAGE, keyInput.trim());
    setAdminKey(keyInput.trim());
  };

  const send = async () => {
    if (!title.trim() || !body.trim() || sending) return;
    setSending(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/myapp-push-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ title, body, url }),
      });
      const json = await res.json();
      if (json.ok) {
        setResult({ sent: json.sent, failed: json.failed, total: json.total });
        setTitle('');
        setBody('');
      } else {
        setError(json.error || 'No se pudo enviar');
      }
    } catch {
      setError('No se pudo conectar. Intenta de nuevo.');
    }
    setSending(false);
  };

  if (!adminKey) {
    return (
      <div className="madm-gate">
        <img src="/AIRA BLANCO.png" alt="AIRA" className="madm-gate-logo" />
        <h1 className="madm-gate-title">🔔 AIRA · Notificaciones</h1>
        <p className="madm-gate-sub">Ingresa la clave de administrador</p>
        <input
          className="madm-gate-input"
          type="password"
          placeholder="Clave"
          value={keyInput}
          onChange={e => setKeyInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveKey()}
          autoFocus
        />
        {authError && <p className="madm-gate-error">{authError}</p>}
        <button className="madm-gate-btn" onClick={saveKey}>Entrar</button>
      </div>
    );
  }

  return (
    <div className="mnot-root">
      <div className="madm-header">
        <span className="madm-header-title">🔔 AIRA · Notificaciones</span>
        <button className="madm-logout" onClick={() => { localStorage.removeItem(KEY_STORAGE); setAdminKey(''); }}>Salir</button>
      </div>

      <div className="mnot-body">
        <p className="mnot-audience">
          <Bell size={14} /> Se enviará a <strong>{total ?? '…'}</strong> asistente{total === 1 ? '' : 's'} suscrito{total === 1 ? '' : 's'}
        </p>

        <label className="mnot-label">Título</label>
        <input
          className="mnot-input"
          placeholder="🎶 ¡Ya empieza el line-up!"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={60}
        />

        <label className="mnot-label">Mensaje</label>
        <textarea
          className="mnot-textarea"
          placeholder="El DJ sube a tarima en 15 minutos en Japi Stage 🔥"
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={160}
          rows={3}
        />

        <label className="mnot-label">Al tocarla, abre (opcional)</label>
        <input
          className="mnot-input"
          placeholder="/myapp"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />

        {error && <p className="mnot-error">⚠️ {error}</p>}
        {result && (
          <p className="mnot-result">
            ✅ Enviado a {result.sent} de {result.total} {result.failed > 0 ? `(${result.failed} fallaron o ya no estaban activos)` : ''}
          </p>
        )}

        <button className="mnot-send" onClick={send} disabled={sending || !title.trim() || !body.trim()}>
          <Send size={15} /> {sending ? 'Enviando…' : 'Enviar a todos'}
        </button>

        {/* Fallos de activación — lo que antes solo se veía en la consola
            del celular de cada persona (ej. "Registration failed - push
            service error" en algunos Android), ahora queda acá. */}
        <div className="mnot-failures">
          <div className="mnot-failures-head">
            <span><AlertTriangle size={14} /> Fallos al activar notificaciones</span>
            <button onClick={() => loadFailures(adminKey)} disabled={loadingFailures} aria-label="Refrescar">
              <RefreshCw size={13} className={loadingFailures ? 'is-spinning' : ''} />
            </button>
          </div>
          {failures === null && <p className="mnot-failures-empty">Cargando…</p>}
          {failures?.length === 0 && <p className="mnot-failures-empty">Sin fallos registrados 🎉</p>}
          {failures && failures.length > 0 && (
            <div className="mnot-failures-list">
              {failures.map(f => (
                <div key={f.id} className="mnot-failure-row">
                  <div className="mnot-failure-top">
                    <span className="mnot-failure-who">{f.nombre || f.order_ref || 'Anónimo'}</span>
                    <span className="mnot-failure-when">{new Date(f.created_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="mnot-failure-device">{shortDevice(f.user_agent)}</p>
                  <p className="mnot-failure-error">
                    <span className="mnot-failure-stage">{f.stage}</span>
                    {f.error_name ? ` ${f.error_name}` : ''}{f.error_message ? `: ${f.error_message}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
