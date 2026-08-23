import { useEffect, useState } from 'react';
import './Photos.css';

/**
 * /photos — herramienta interna (usuario/clave compartidos, NO es una
 * cuenta por asistente) para que el equipo del evento suba fotos/videos
 * sueltos directo a la galería. Usa la misma optimización de imágenes
 * (sharp -> WebP) que la galería de /myapp — ver api/photos.ts.
 */

const USER_KEY = 'aira_photos_user';
const PASS_KEY = 'aira_photos_pass';
const NAME_KEY = 'aira_photos_lastname';

const VIDEO_MAX_SECONDS = 10;
const VIDEO_MAX_BYTES = 35 * 1024 * 1024;

// Mismas 5 secciones de "La Experiencia" del sitio (ver config.ts) —
// "Lobby" pasó a llamarse "Joinn Stage" acá también.
const CATEGORIES = ['AIRA Stage', 'Japi Stage', 'Cabañas', 'Majestic', 'Joinn Stage'];
const SIN_CLASIFICAR = 'Sin clasificar';

interface Photo { id: number; uploaded_by: string; uploaded_name: string | null; file_url: string; is_video: number; category: string | null; created_at: string; }
interface PendingFile { file: File; previewUrl: string; isVideo: boolean; }

/** Lee la duración de un video local antes de subirlo, sin tocar el servidor. */
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve(video.duration); };
    video.onerror = () => { URL.revokeObjectURL(video.src); reject(new Error('No se pudo leer el video')); };
    video.src = URL.createObjectURL(file);
  });
}

/** Devuelve el detalle del intento — antes solo se sabía "falló", sin
 * poder distinguir clave mala de un 500 (ej. env vars sin configurar
 * en Vercel) o un problema de red. */
async function checkLogin(user: string, pass: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch('/api/photos', { headers: { 'x-photos-user': user, 'x-photos-pass': pass } });
    if (res.ok) return { ok: true, detail: '' };
    const json = await res.json().catch(() => ({}));
    return { ok: false, detail: `HTTP ${res.status}${json.error ? ` — ${json.error}` : ''}` };
  } catch {
    return { ok: false, detail: 'No se pudo conectar con el servidor' };
  }
}

export default function Photos() {
  const [user, setUser] = useState(() => sessionStorage.getItem(USER_KEY) || '');
  const [pass, setPass] = useState(() => sessionStorage.getItem(PASS_KEY) || '');
  const [authed, setAuthed] = useState<boolean | null>(null); // null = todavía no se sabe
  const [userInput, setUserInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [openItem, setOpenItem] = useState<Photo | null>(null);
  // Archivo ya validado (tamaño/duración) esperando a que se elija la
  // sección antes de subirlo de verdad.
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [nameInput, setNameInput] = useState(() => sessionStorage.getItem(NAME_KEY) || '');
  const [clearing, setClearing] = useState(false);

  const loadPhotos = async (u: string, p: string) => {
    try {
      const res = await fetch('/api/photos', { headers: { 'x-photos-user': u, 'x-photos-pass': p } });
      const json = await res.json();
      if (json.ok) setPhotos(json.photos);
    } catch { /* silencioso */ }
  };

  // Sesión guardada de una visita anterior — se revalida contra el server
  // en vez de confiar ciegamente en lo que quedó en sessionStorage.
  useEffect(() => {
    if (!user || !pass) { setAuthed(false); return; }
    checkLogin(user, pass).then(({ ok, detail }) => {
      setAuthed(ok);
      if (ok) loadPhotos(user, pass);
      else {
        sessionStorage.removeItem(USER_KEY); sessionStorage.removeItem(PASS_KEY);
        if (detail) setLoginError(detail);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !passInput.trim()) return;
    setLoggingIn(true);
    setLoginError('');
    const { ok, detail } = await checkLogin(userInput.trim(), passInput.trim());
    if (ok) {
      sessionStorage.setItem(USER_KEY, userInput.trim());
      sessionStorage.setItem(PASS_KEY, passInput.trim());
      setUser(userInput.trim());
      setPass(passInput.trim());
      setAuthed(true);
      loadPhotos(userInput.trim(), passInput.trim());
    } else {
      setLoginError(detail === 'HTTP 401 — Usuario o clave incorrectos' ? 'Usuario o clave incorrectos' : detail);
    }
    setLoggingIn(false);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');

    const isVideo = file.type.startsWith('video/');
    if (isVideo) {
      if (file.size > VIDEO_MAX_BYTES) {
        setUploadError(`El video pesa demasiado (máx ${VIDEO_MAX_BYTES / 1024 / 1024}MB)`);
        return;
      }
      try {
        const duration = await readVideoDuration(file);
        if (duration > VIDEO_MAX_SECONDS) {
          setUploadError(`El video dura ${duration.toFixed(1)}s — máximo ${VIDEO_MAX_SECONDS}s`);
          return;
        }
      } catch {
        setUploadError('No se pudo leer ese video, intenta con otro');
        return;
      }
    }

    // Archivo validado — ahora se pide la sección antes de subir de verdad.
    setPending({ file, previewUrl: URL.createObjectURL(file), isVideo });
  };

  const confirmUpload = async (category: string) => {
    if (!pending || !nameInput.trim()) return;
    const { file } = pending;
    sessionStorage.setItem(NAME_KEY, nameInput.trim());
    setUploading(true);
    setUploadError('');
    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'image/jpeg',
          'x-photos-user': user, 'x-photos-pass': pass,
          'x-photos-category': category === SIN_CLASIFICAR ? '' : category,
          'x-photos-name': nameInput.trim(),
        },
        body: file,
      });
      const json = await res.json();
      if (json.ok) {
        loadPhotos(user, pass);
        URL.revokeObjectURL(pending.previewUrl);
        setPending(null);
      } else {
        setUploadError(json.error || 'No se pudo subir el archivo');
      }
    } catch {
      setUploadError('No se pudo conectar. Intenta de nuevo.');
    }
    setUploading(false);
  };

  const cancelPending = () => {
    if (pending) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
    setUploadError('');
  };

  const handleClearAll = async () => {
    if (!window.confirm(`¿Borrar las ${photos.length} fotos/videos que están mostrándose ahora mismo? No se puede deshacer.`)) return;
    setClearing(true);
    try {
      const res = await fetch('/api/photos', {
        method: 'DELETE',
        headers: { 'x-photos-user': user, 'x-photos-pass': pass },
      });
      const json = await res.json();
      if (json.ok) loadPhotos(user, pass);
      else setUploadError(json.error || 'No se pudo borrar');
    } catch {
      setUploadError('No se pudo conectar. Intenta de nuevo.');
    }
    setClearing(false);
  };

  if (authed === null) {
    return <div className="photos-page photos-loading"><div className="photos-spinner" /></div>;
  }

  if (!authed) {
    return (
      <div className="photos-page photos-login-wrap">
        <form className="photos-login-card" onSubmit={handleLogin}>
          <h1>📸 AIRA Photos</h1>
          <p>Acceso solo para el equipo del evento</p>
          <input
            type="text" placeholder="Usuario" value={userInput}
            onChange={e => setUserInput(e.target.value)} autoComplete="username"
          />
          <input
            type="password" placeholder="Clave" value={passInput}
            onChange={e => setPassInput(e.target.value)} autoComplete="current-password"
          />
          {loginError && <p className="photos-login-error">⚠️ {loginError}</p>}
          <button type="submit" disabled={loggingIn}>{loggingIn ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="photos-page">
      <header className="photos-header">
        <h1>📸 AIRA Photos</h1>
        <button
          className="photos-logout"
          onClick={() => { sessionStorage.removeItem(USER_KEY); sessionStorage.removeItem(PASS_KEY); setAuthed(false); }}
        >
          Salir
        </button>
      </header>

      <div className="photos-upload-row">
        <label className="photos-upload-btn">
          ⬆️ Subir foto o video
          <input type="file" accept="image/*,video/*" onChange={handleFileSelected} hidden />
        </label>
        <p className="photos-hint">Fotos o videos cortos (máx {VIDEO_MAX_SECONDS}s)</p>
        {photos.length > 0 && (
          <button className="photos-clear-btn" onClick={handleClearAll} disabled={clearing}>
            {clearing ? 'Borrando…' : '🗑️ Borrar fotos anteriores'}
          </button>
        )}
      </div>
      {uploadError && !pending && <p className="photos-upload-error">⚠️ {uploadError}</p>}

      <div className="photos-grid">
        {photos.map(p => (
          <button key={p.id} className="photos-thumb" onClick={() => setOpenItem(p)}>
            {p.is_video ? (
              <video src={p.file_url} muted playsInline preload="metadata" />
            ) : (
              <img src={p.file_url} alt="" loading="lazy" />
            )}
            {!!p.is_video && <span className="photos-thumb-play">▶</span>}
            <span className="photos-thumb-category">{p.category || SIN_CLASIFICAR}</span>
          </button>
        ))}
        {photos.length === 0 && <p className="photos-empty">Todavía no hay nada subido.</p>}
      </div>

      {openItem && (
        <div className="photos-lightbox" onClick={() => setOpenItem(null)}>
          <button className="photos-lightbox-close" onClick={() => setOpenItem(null)}>✕</button>
          {openItem.is_video ? (
            <video src={openItem.file_url} controls autoPlay playsInline onClick={e => e.stopPropagation()} />
          ) : (
            <img src={openItem.file_url} alt="" onClick={e => e.stopPropagation()} />
          )}
          <div className="photos-lightbox-info">
            {openItem.uploaded_name && <p className="photos-lightbox-name">{openItem.uploaded_name}</p>}
            <p className="photos-lightbox-category">{openItem.category || SIN_CLASIFICAR}</p>
          </div>
        </div>
      )}

      {/* Picker de nombre + sección — aparece después de elegir el archivo,
          antes de que se suba de verdad. */}
      {pending && (
        <div className="photos-category-overlay" onClick={cancelPending}>
          <div className="photos-category-card" onClick={e => e.stopPropagation()}>
            {pending.isVideo ? (
              <video src={pending.previewUrl} muted playsInline autoPlay loop className="photos-category-preview" />
            ) : (
              <img src={pending.previewUrl} alt="" className="photos-category-preview" />
            )}
            <input
              className="photos-category-name-input"
              type="text"
              placeholder="Tu nombre (se muestra al abrir la foto)"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              autoFocus
            />
            <p className="photos-category-title">¿De qué sección es?</p>
            {uploadError && <p className="photos-upload-error">⚠️ {uploadError}</p>}
            <div className="photos-category-options">
              {[SIN_CLASIFICAR, ...CATEGORIES].map(cat => (
                <button
                  key={cat}
                  className="photos-category-option"
                  disabled={uploading || !nameInput.trim()}
                  onClick={() => confirmUpload(cat)}
                >
                  {uploading ? 'Subiendo…' : cat}
                </button>
              ))}
            </div>
            {!nameInput.trim() && <p className="photos-hint">Escribe tu nombre para poder subir</p>}
            <button className="photos-category-cancel" onClick={cancelPending} disabled={uploading}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
