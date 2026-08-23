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

const VIDEO_MAX_SECONDS = 10;
const VIDEO_MAX_BYTES = 35 * 1024 * 1024;

interface Photo { id: number; uploaded_by: string; file_url: string; is_video: number; created_at: string; }

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

async function checkLogin(user: string, pass: string): Promise<boolean> {
  const res = await fetch('/api/photos', { headers: { 'x-photos-user': user, 'x-photos-pass': pass } });
  return res.ok;
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
    checkLogin(user, pass).then(ok => {
      setAuthed(ok);
      if (ok) loadPhotos(user, pass);
      else { sessionStorage.removeItem(USER_KEY); sessionStorage.removeItem(PASS_KEY); }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !passInput.trim()) return;
    setLoggingIn(true);
    setLoginError('');
    const ok = await checkLogin(userInput.trim(), passInput.trim()).catch(() => false);
    if (ok) {
      sessionStorage.setItem(USER_KEY, userInput.trim());
      sessionStorage.setItem(PASS_KEY, passInput.trim());
      setUser(userInput.trim());
      setPass(passInput.trim());
      setAuthed(true);
      loadPhotos(userInput.trim(), passInput.trim());
    } else {
      setLoginError('Usuario o clave incorrectos');
    }
    setLoggingIn(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');

    if (file.type.startsWith('video/')) {
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

    setUploading(true);
    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'image/jpeg', 'x-photos-user': user, 'x-photos-pass': pass },
        body: file,
      });
      const json = await res.json();
      if (json.ok) loadPhotos(user, pass);
      else setUploadError(json.error || 'No se pudo subir el archivo');
    } catch {
      setUploadError('No se pudo conectar. Intenta de nuevo.');
    }
    setUploading(false);
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
        <label className={`photos-upload-btn ${uploading ? 'is-uploading' : ''}`}>
          {uploading ? 'Subiendo…' : '⬆️ Subir foto o video'}
          <input type="file" accept="image/*,video/*" onChange={handleUpload} disabled={uploading} hidden />
        </label>
        <p className="photos-hint">Fotos o videos cortos (máx {VIDEO_MAX_SECONDS}s)</p>
      </div>
      {uploadError && <p className="photos-upload-error">⚠️ {uploadError}</p>}

      <div className="photos-grid">
        {photos.map(p => (
          <button key={p.id} className="photos-thumb" onClick={() => setOpenItem(p)}>
            {p.is_video ? (
              <video src={p.file_url} muted playsInline preload="metadata" />
            ) : (
              <img src={p.file_url} alt="" loading="lazy" />
            )}
            {!!p.is_video && <span className="photos-thumb-play">▶</span>}
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
        </div>
      )}
    </div>
  );
}
