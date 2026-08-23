import { useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';
import './Photos.css';

/**
 * /photos — herramienta interna (usuario/clave compartidos, NO es una
 * cuenta por asistente) para que el equipo del evento suba fotos/videos
 * sueltos directo a la galería.
 *
 * Vercel Functions tienen un límite DURO de 4.5MB por request body (no
 * configurable) — por eso las fotos y los videos van por caminos
 * distintos:
 *  - Fotos: se comprimen ACÁ en el navegador (canvas, ~1600px, JPEG 82%)
 *    antes de subir — casi siempre quedan bien por debajo de 4.5MB, así
 *    que siguen pasando por api/photos.ts (que además las vuelve a
 *    optimizar con sharp del lado del servidor, doble seguro).
 *  - Videos: NO se pueden comprimir de forma confiable en el navegador
 *    (no hay ffmpeg acá), y un clip de 10s fácil pesa más de 4.5MB — van
 *    DIRECTO del navegador a Vercel Blob (api/photos-blob-token.ts solo
 *    entrega un token, nunca ve el archivo).
 */

const USER_KEY = 'aira_photos_user';
const PASS_KEY = 'aira_photos_pass';
const NAME_KEY = 'aira_photos_lastname';

// Los headers HTTP solo aceptan ISO-8859-1 — un nombre con una comilla
// curva, un emoji o cualquier carácter fuera de ese rango (comunes en
// teclados de celular) hacía que fetch() tirara "String contains non
// ISO-8859-1 code point" y todo pareciera "no se pudo conectar" (el
// error real quedaba enterrado en la excepción). encodeURIComponent
// deja el valor en ASCII puro, siempre válido como header.
const enc = (s: string) => encodeURIComponent(s);

const VIDEO_MAX_SECONDS = 10;
// Ya no limita la función serverless (los videos van directo a Blob) —
// este tope es solo para no dejar subir algo absurdo por error; debe
// coincidir con maximumSizeInBytes en api/photos-blob-token.ts.
const VIDEO_MAX_BYTES = 60 * 1024 * 1024;
// Un video más largo que esto no se corta — se rechaza directo. Cortarlo
// implica reproducirlo completo en el navegador (ver splitVideoIntoClips),
// así que sin este tope alguien podría subir un video de 10 min y dejar
// la pestaña procesando por 10 minutos.
const MAX_SPLITTABLE_SECONDS = 90;

// Mismas 5 secciones de "La Experiencia" del sitio (ver config.ts) —
// "Lobby" pasó a llamarse "Joinn Stage" acá también.
const CATEGORIES = ['AIRA Stage', 'Japi Stage', 'Cabañas', 'Majestic', 'Joinn Stage'];
const SIN_CLASIFICAR = 'Sin clasificar';

interface Photo { id: number; uploaded_by: string; uploaded_name: string | null; file_url: string; is_video: number; category: string | null; created_at: string; }
// parts.length > 1 = un video largo que se dividió en clips de máx 10s.
interface PendingFile { parts: File[]; previewUrl: string; isVideo: boolean; }

/**
 * Redimensiona (máx 1600px de lado) y comprime a JPEG calidad 82% —
 * misma idea que optimizarImagen() del servidor (sharp), pero en el
 * navegador, para que el archivo ya quede chico ANTES de mandarlo (así
 * nunca se acerca al límite de 4.5MB de las funciones de Vercel).
 * createImageBitmap con imageOrientation:'from-image' respeta el EXIF de
 * rotación de las fotos de celular — dibujar un <img> a canvas a veces no.
 */
async function compressImage(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
    let { width, height } = bitmap;
    if (width > maxDimension || height > maxDimension) {
      if (width > height) { height = Math.round((height * maxDimension) / width); width = maxDimension; }
      else { width = Math.round((width * maxDimension) / height); height = maxDimension; }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo procesar la imagen');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('No se pudo comprimir la imagen');
    const base = file.name.replace(/\.[^.]+$/, '') || 'foto';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch (err) {
    // Si algo falla acá (navegador raro, formato exótico), se sube el
    // original tal cual — sharp del lado del servidor sigue siendo el
    // respaldo, aunque para fotos muy grandes eso pueda pegarle al
    // límite de 4.5MB.
    console.warn('[photos] compresión en navegador falló, se sube el original:', err);
    return file;
  }
}

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

/**
 * Corta un video largo en clips de máx `segmentSeconds` cada uno — 100%
 * en el navegador, sin subir nada al servidor para procesarlo (no hay
 * ffmpeg en el backend, solo sharp para imágenes). Usa
 * HTMLVideoElement.captureStream() + MediaRecorder: reproduce el video
 * real (silencioso) y graba cada tramo como un clip nuevo en WebM.
 * Soportado en Chrome/Edge/Firefox — Safari no soporta captureStream()
 * de forma confiable, ahí se avisa con un error claro.
 */
async function splitVideoIntoClips(file: File, segmentSeconds: number): Promise<File[]> {
  const anyWindow = window as any;
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Tu navegador no puede dividir videos largos — usa Chrome o sube clips de máx 10s directamente.');
  }

  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = url;
  video.muted = false;
  video.volume = 0; // silencioso pero sin "muted" — así el track de audio sí se graba
  video.playsInline = true;
  video.style.position = 'fixed';
  video.style.left = '-9999px';
  video.style.width = '1px';
  video.style.height = '1px';
  document.body.appendChild(video);

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('No se pudo leer el video'));
    });

    const captureStream = (video as any).captureStream || anyWindow.HTMLVideoElement?.prototype?.mozCaptureStream?.bind(video);
    if (typeof captureStream !== 'function') {
      throw new Error('Tu navegador no puede dividir videos largos — usa Chrome o sube clips de máx 10s directamente.');
    }
    const stream: MediaStream = captureStream.call(video);

    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

    const duration = video.duration;
    const totalParts = Math.ceil(duration / segmentSeconds);
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'clip';
    const clips: File[] = [];

    for (let i = 0; i < totalParts; i++) {
      const start = i * segmentSeconds;
      const end = Math.min(start + segmentSeconds, duration);

      await new Promise<void>(resolve => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = start;
      });

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => reject(new Error('Falló al grabar un tramo del video'));
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
        recorder.start();
        video.play().catch(reject);
        const tick = () => {
          if (video.currentTime >= end - 0.05 || video.ended) {
            video.pause();
            recorder.stop();
          } else {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      });

      clips.push(new File([blob], `${baseName}-parte${i + 1}.webm`, { type: mimeType }));
    }

    return clips;
  } finally {
    document.body.removeChild(video);
    URL.revokeObjectURL(url);
  }
}

/** Devuelve el detalle del intento — antes solo se sabía "falló", sin
 * poder distinguir clave mala de un 500 (ej. env vars sin configurar
 * en Vercel) o un problema de red. */
async function checkLogin(user: string, pass: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch('/api/photos', { headers: { 'x-photos-user': enc(user), 'x-photos-pass': enc(pass) } });
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
  const [splitting, setSplitting] = useState(false);
  // Cuando pending.parts.length > 1: qué tramo se está subiendo ahora mismo.
  const [uploadPart, setUploadPart] = useState(0);
  // Elegir sección ya NO sube al toque — solo selecciona, hace falta
  // tocar "Cargar" después.
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadPhotos = async (u: string, p: string) => {
    try {
      const res = await fetch('/api/photos', { headers: { 'x-photos-user': enc(u), 'x-photos-pass': enc(p) } });
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
      let duration: number;
      try {
        duration = await readVideoDuration(file);
      } catch {
        setUploadError('No se pudo leer ese video, intenta con otro');
        return;
      }

      if (duration <= VIDEO_MAX_SECONDS) {
        setPending({ parts: [file], previewUrl: URL.createObjectURL(file), isVideo: true });
        return;
      }

      if (duration > MAX_SPLITTABLE_SECONDS) {
        setUploadError(`El video dura ${Math.round(duration)}s — máximo ${MAX_SPLITTABLE_SECONDS}s para poder dividirlo en partes de ${VIDEO_MAX_SECONDS}s`);
        return;
      }

      // Más de 10s pero dividible — se corta en clips de máx 10s cada uno
      // y se suben todos como pedidos separados.
      setSplitting(true);
      try {
        const clips = await splitVideoIntoClips(file, VIDEO_MAX_SECONDS);
        setPending({ parts: clips, previewUrl: URL.createObjectURL(clips[0]), isVideo: true });
      } catch (err: any) {
        setUploadError(err?.message || 'No se pudo dividir el video, intenta con otro');
      }
      setSplitting(false);
      return;
    }

    // Imagen — se comprime acá antes de mostrar el preview y pedir la
    // sección, así el archivo que realmente se sube ya viene liviano.
    const compressed = await compressImage(file);
    setPending({ parts: [compressed], previewUrl: URL.createObjectURL(compressed), isVideo: false });
  };

  const confirmUpload = async () => {
    if (!pending || !nameInput.trim() || !selectedCategory) return;
    const category = selectedCategory;
    const name = nameInput.trim();
    sessionStorage.setItem(NAME_KEY, name);
    setUploading(true);
    setUploadError('');

    const { parts, isVideo } = pending;
    const categoryValue = category === SIN_CLASIFICAR ? '' : category;

    for (let i = 0; i < parts.length; i++) {
      setUploadPart(i + 1);
      const file = parts[i];
      const partName = parts.length > 1 ? `${name} (parte ${i + 1}/${parts.length})` : name;
      const failSuffix = parts.length > 1 ? ` (tramo ${i + 1}/${parts.length})` : '';

      try {
        if (isVideo) {
          // Directo del navegador a Vercel Blob — el archivo nunca pasa
          // por nuestra función (ver comentario arriba y en
          // api/photos-blob-token.ts). El insert en la BD lo hace ESE
          // endpoint cuando Vercel le avisa que terminó la subida, no
          // acá — por eso no revisamos el resultado más allá de que
          // upload() no haya tirado una excepción.
          await upload(`photos/${Date.now()}-${file.name}`, file, {
            access: 'public',
            handleUploadUrl: '/api/photos-blob-token',
            clientPayload: JSON.stringify({ user, pass, category: categoryValue, name: partName }),
          });
        } else {
          const res = await fetch('/api/photos', {
            method: 'POST',
            headers: {
              'Content-Type': file.type || 'image/jpeg',
              'x-photos-user': enc(user), 'x-photos-pass': enc(pass),
              'x-photos-category': enc(categoryValue),
              'x-photos-name': enc(partName),
            },
            body: file,
          });
          const json = await res.json();
          if (!json.ok) {
            setUploadError(`${json.error || 'No se pudo subir el archivo'}${failSuffix}`);
            setUploading(false);
            return;
          }
        }
      } catch (err: any) {
        setUploadError(`No se pudo subir${failSuffix}: ${err?.message || err}`);
        setUploading(false);
        return;
      }
    }

    // Para video el insert en la BD lo hace el callback de Vercel Blob de
    // forma asíncrona (no bloquea la respuesta de upload()) — le damos un
    // segundo de margen antes de refrescar la lista para no perder la
    // carrera casi siempre.
    setTimeout(() => loadPhotos(user, pass), isVideo ? 1200 : 0);
    URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
    setSelectedCategory(null);
    setUploading(false);
    setUploadPart(0);
  };

  const cancelPending = () => {
    if (pending) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
    setSelectedCategory(null);
    setUploadError('');
  };

  const handleDeleteOne = async (id: number) => {
    if (!window.confirm('¿Borrar esta foto/video? No se puede deshacer.')) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/photos', {
        method: 'DELETE',
        headers: { 'x-photos-user': enc(user), 'x-photos-pass': enc(pass), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.ok) {
        setPhotos(prev => prev.filter(p => p.id !== id));
        setOpenItem(null);
      } else {
        setUploadError(json.error || 'No se pudo borrar');
      }
    } catch (err: any) {
      setUploadError(`No se pudo conectar: ${err?.message || err}`);
    }
    setDeletingId(null);
  };

  const handleClearAll = async () => {
    if (!window.confirm(`¿Borrar las ${photos.length} fotos/videos que están mostrándose ahora mismo? No se puede deshacer.`)) return;
    setClearing(true);
    try {
      const res = await fetch('/api/photos', {
        method: 'DELETE',
        headers: { 'x-photos-user': enc(user), 'x-photos-pass': enc(pass) },
      });
      const json = await res.json();
      if (json.ok) loadPhotos(user, pass);
      else setUploadError(json.error || 'No se pudo borrar');
    } catch (err: any) {
      setUploadError(`No se pudo conectar: ${err?.message || err}`);
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
        <p className="photos-hint">Fotos o videos — los de más de {VIDEO_MAX_SECONDS}s se dividen solos en partes</p>
        {splitting && <p className="photos-hint">✂️ Dividiendo el video en partes de {VIDEO_MAX_SECONDS}s…</p>}
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
          <button
            className="photos-lightbox-delete"
            onClick={e => { e.stopPropagation(); handleDeleteOne(openItem.id); }}
            disabled={deletingId === openItem.id}
          >
            {deletingId === openItem.id ? 'Borrando…' : '🗑️ Borrar'}
          </button>
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
            {pending.parts.length > 1 && (
              <p className="photos-hint">✂️ Se dividió en {pending.parts.length} partes de máx {VIDEO_MAX_SECONDS}s cada una</p>
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
                  className={`photos-category-option ${selectedCategory === cat ? 'is-selected' : ''}`}
                  disabled={uploading}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            {!nameInput.trim() && <p className="photos-hint">Escribe tu nombre para poder cargar</p>}
            <button
              className="photos-category-load"
              disabled={uploading || !nameInput.trim() || !selectedCategory}
              onClick={confirmUpload}
            >
              {uploading
                ? (pending.parts.length > 1 ? `Cargando parte ${uploadPart}/${pending.parts.length}…` : 'Cargando…')
                : 'Cargar'}
            </button>
            <button className="photos-category-cancel" onClick={cancelPending} disabled={uploading}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
