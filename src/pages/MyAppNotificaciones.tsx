import { useEffect, useState } from 'react';
import { Send, Bell } from 'lucide-react';
import './MyAppAdmin.css';
import './MyAppNotificaciones.css';

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

  useEffect(() => { document.title = 'AIRA · Notificaciones'; }, []);

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

  useEffect(() => { if (adminKey) loadTotal(adminKey); }, [adminKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
      </div>
    </div>
  );
}
