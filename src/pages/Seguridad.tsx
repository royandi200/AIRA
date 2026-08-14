import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Bus, X, List as ListIcon, MapPin } from 'lucide-react';
import { useInstallPrompt } from './useInstallPrompt';
import './Seguridad.css';

/**
 * /seguridad — app de escaneo para el staff de la entrada.
 * Cámara del celular + jsQR (decodifica en el navegador, sin libs
 * nativas) → valida cada QR contra /api/validate-qr, que ya revisa
 * manual_registros (existe, saldo en $0) y registra el check-in en la
 * tabla `checkins`, ligado al PUNTO DE CONTROL activo (Transporte,
 * Ingreso 1/2/3, …) — el mismo QR puede pasar por varios puntos sin
 * bloquearse entre sí.
 */

const KEY_STORAGE = 'aira_scanner_key';
const CHECKPOINT_STORAGE = 'aira_scanner_checkpoint';

// Misma lista que api/lib/checkins.ts — agregar un punto de control es
// sumar una línea acá y otra allá. Por ahora solo estos 2, cada uno es
// un check independiente en la BD (tabla checkins).
const CHECKPOINTS: { id: string; label: string }[] = [
  { id: 'ingreso',    label: 'Ingreso' },
  { id: 'transporte', label: 'Transporte (bus)' },
];

type ResultState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'result'; color: 'green' | 'red' | 'orange'; message: string; name?: string; ref?: string; vaEnBus?: boolean };

interface ListaPersona { nombre: string; movil: string; paquete: string | null; hora?: string; pendiente?: boolean; vaEnBus?: boolean; }
type ListaTab = 'transporte' | 'todos';

export default function Seguridad() {
  const [scannerKey, setScannerKey] = useState(() => localStorage.getItem(KEY_STORAGE) || '');
  const [keyInput, setKeyInput]     = useState('');
  const [checkpoint, setCheckpoint] = useState(() => localStorage.getItem(CHECKPOINT_STORAGE) || '');
  const [cameraError, setCameraError] = useState('');
  const [result, setResult] = useState<ResultState>({ status: 'idle' });
  const [showLista, setShowLista] = useState(false);
  const [listaTab, setListaTab] = useState<ListaTab>('transporte');
  const [listaData, setListaData] = useState<Record<ListaTab, { total: number; faltan: ListaPersona[]; llegaron: ListaPersona[] } | null>>({ transporte: null, todos: null });
  const [loadingLista, setLoadingLista] = useState(false);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number | null>(null);
  const lastTokenRef  = useRef<string | null>(null);
  const cooldownRef   = useRef(false);

  const { canInstall, isIOS, showManualHint, installed, install } = useInstallPrompt();

  useEffect(() => {
    document.title = 'AIRA · Seguridad';

    // Manifest + ícono propios de /seguridad (el sitio principal usa uno
    // distinto) — se inyectan solo en esta página, sin tocar index.html.
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest-seguridad.json';
    document.head.appendChild(manifestLink);

    const prevAppleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    const prevHref = prevAppleIcon?.href;
    if (prevAppleIcon) prevAppleIcon.href = '/AIRA.png';

    return () => {
      manifestLink.remove();
      if (prevAppleIcon && prevHref) prevAppleIcon.href = prevHref;
    };
  }, []);

  // ── Cámara ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!scannerKey || !checkpoint) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch (err: any) {
        setCameraError('No pudimos acceder a la cámara. Revisa los permisos del navegador.');
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerKey, checkpoint]);

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });

    if (code && code.data && !cooldownRef.current) {
      // Extrae el token — el QR real apunta a .../validate?token=XXXX
      let token = code.data;
      try {
        const url = new URL(code.data);
        token = url.searchParams.get('token') || code.data;
      } catch { /* no era una URL, se usa el texto crudo como token */ }

      if (token !== lastTokenRef.current) {
        lastTokenRef.current = token;
        validate(token);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  };

  const validate = async (token: string) => {
    cooldownRef.current = true;
    setResult({ status: 'checking' });
    try {
      const res = await fetch(`/api/validate-qr?token=${encodeURIComponent(token)}&checkpoint=${encodeURIComponent(checkpoint)}`, {
        headers: { 'x-scanner-key': scannerKey },
      });
      const json = await res.json();

      if (res.status === 401) {
        localStorage.removeItem(KEY_STORAGE);
        setScannerKey('');
        setResult({ status: 'idle' });
        cooldownRef.current = false;
        return;
      }

      setResult({
        status: 'result',
        color: json.color || (json.valid ? 'green' : 'red'),
        message: json.message || (json.valid ? 'Acceso válido' : 'QR inválido'),
        name: json.name,
        ref: json.ref,
        vaEnBus: json.vaEnBus,
      });
    } catch {
      setResult({ status: 'result', color: 'red', message: '❌ Sin conexión — intenta de nuevo' });
    }

    // Vuelve a habilitar el scanner después de mostrar el resultado
    window.setTimeout(() => {
      cooldownRef.current = false;
      lastTokenRef.current = null;
      setResult({ status: 'idle' });
    }, 2200);
  };

  const loadLista = async (tab: ListaTab) => {
    setShowLista(true);
    setListaTab(tab);
    setLoadingLista(true);
    try {
      // Fijo: "ingreso" y "transporte" son 2 listas propias, sin importar
      // en qué punto de control esté parado este celular ahora mismo.
      const endpoint = tab === 'transporte'
        ? '/api/seguridad-transporte'
        : `/api/seguridad-lista?checkpoint=ingreso`;
      const res = await fetch(endpoint, { headers: { 'x-scanner-key': scannerKey } });
      const json = await res.json();
      if (json.ok) setListaData(prev => ({ ...prev, [tab]: json }));
    } catch { /* silencioso — se puede reintentar */ }
    setLoadingLista(false);
  };
  const switchListaTab = (tab: ListaTab) => {
    setListaTab(tab);
    if (!listaData[tab]) loadLista(tab);
  };

  const saveKey = () => {
    if (!keyInput.trim()) return;
    localStorage.setItem(KEY_STORAGE, keyInput.trim());
    setScannerKey(keyInput.trim());
  };

  const chooseCheckpoint = (id: string) => {
    localStorage.setItem(CHECKPOINT_STORAGE, id);
    setCheckpoint(id);
  };

  if (!scannerKey) {
    return (
      <div className="seg-gate">
        <img src="/AIRA.png" alt="AIRA" className="seg-gate-logo" />
        <h1 className="seg-gate-title">🔒 AIRA · Seguridad</h1>
        <p className="seg-gate-sub">Ingresa la clave del escáner para empezar</p>
        <input
          className="seg-gate-input"
          type="password"
          placeholder="Clave del escáner"
          value={keyInput}
          onChange={e => setKeyInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveKey()}
          autoFocus
        />
        <button className="seg-gate-btn" onClick={saveKey}>Entrar</button>

        {!installed && (
          <div className="seg-install">
            {canInstall && (
              <button className="seg-install-btn" onClick={install}>
                📲 Enviar al escritorio del celular
              </button>
            )}
            {isIOS && !canInstall && (
              <p className="seg-install-hint">
                En iPhone: toca <strong>Compartir</strong> ⬆️ y luego <strong>"Agregar a pantalla de inicio"</strong>
              </p>
            )}
            {showManualHint && (
              <p className="seg-install-hint">
                Toca el menú <strong>⋮</strong> del navegador y elige <strong>"Instalar app"</strong> o <strong>"Agregar a pantalla de inicio"</strong>
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Paso 2: elegir qué punto de control va a validar este celular ──────
  if (!checkpoint) {
    return (
      <div className="seg-gate">
        <img src="/AIRA.png" alt="AIRA" className="seg-gate-logo" />
        <h1 className="seg-gate-title">📍 ¿Qué vas a validar?</h1>
        <p className="seg-gate-sub">Elige el punto de control de este celular — puedes cambiarlo cuando quieras</p>
        <div className="seg-checkpoint-list">
          {CHECKPOINTS.map(c => (
            <button key={c.id} className="seg-checkpoint-btn" onClick={() => chooseCheckpoint(c.id)}>
              {c.id === 'transporte' ? <Bus size={16} /> : <MapPin size={16} />}
              {c.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const checkpointLabel = CHECKPOINTS.find(c => c.id === checkpoint)?.label || checkpoint;

  return (
    <div className="seg-root">
      <div className="seg-header">
        <button className="seg-checkpoint-pill" onClick={() => { localStorage.removeItem(CHECKPOINT_STORAGE); setCheckpoint(''); }}>
          <MapPin size={12} /> {checkpointLabel}
        </button>
        <div className="seg-header-actions">
          <button className="seg-bus-btn" onClick={() => loadLista('todos')}>
            <ListIcon size={14} /> Lista
          </button>
          <button className="seg-logout" onClick={() => { localStorage.removeItem(KEY_STORAGE); setScannerKey(''); }}>
            Salir
          </button>
        </div>
      </div>

      <div className="seg-camera-wrap">
        <video ref={videoRef} className="seg-video" playsInline muted />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div className="seg-frame" />
        {cameraError && <div className="seg-camera-error">{cameraError}</div>}
      </div>

      <div className={`seg-result seg-result--${result.status === 'result' ? result.color : 'idle'}`}>
        {result.status === 'idle' && <p className="seg-result-hint">Apunta al código QR del asistente</p>}
        {result.status === 'checking' && <p className="seg-result-hint">Validando…</p>}
        {result.status === 'result' && (
          <>
            <p className="seg-result-message">{result.message}</p>
            {result.name && <p className="seg-result-name">{result.name}{result.ref ? ` · ${result.ref}` : ''}</p>}
            {result.vaEnBus && (
              <span className="seg-result-bus"><Bus size={13} /> Va en bus</span>
            )}
          </>
        )}
      </div>

      {showLista && (
        <div className="seg-transporte-overlay" onClick={() => setShowLista(false)}>
          <div className="seg-transporte-sheet" onClick={e => e.stopPropagation()}>
            <div className="seg-transporte-head">
              <span><ListIcon size={16} /> Lista</span>
              <button onClick={() => setShowLista(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>

            <div className="seg-transporte-tabs">
              <button
                className={`seg-transporte-tab ${listaTab === 'transporte' ? 'is-active' : ''}`}
                onClick={() => switchListaTab('transporte')}
              >
                <Bus size={13} /> Transporte
              </button>
              <button
                className={`seg-transporte-tab ${listaTab === 'todos' ? 'is-active' : ''}`}
                onClick={() => switchListaTab('todos')}
              >
                <MapPin size={13} /> Ingreso
              </button>
            </div>

            {loadingLista && <p className="seg-transporte-loading">Cargando…</p>}

            {listaData[listaTab] && !loadingLista && (
              <div className="seg-transporte-body">
                <div className="seg-transporte-summary">
                  <span className="seg-transporte-count is-missing">{listaData[listaTab]!.faltan.length} faltan</span>
                  <span className="seg-transporte-count is-here">{listaData[listaTab]!.llegaron.length} ya llegaron</span>
                  <span className="seg-transporte-total">de {listaData[listaTab]!.total} en total</span>
                </div>

                {listaData[listaTab]!.faltan.length > 0 && (
                  <>
                    <p className="seg-transporte-section-title">Faltan ({listaData[listaTab]!.faltan.length})</p>
                    <div className="seg-transporte-list">
                      {listaData[listaTab]!.faltan.map((p, i) => (
                        <div key={i} className="seg-transporte-row is-missing">
                          <span className="seg-transporte-name">{p.nombre}</span>
                          <span className="seg-transporte-meta">
                            {p.paquete || '—'}
                            {p.pendiente && <span className="seg-transporte-flag">$ pendiente</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {listaData[listaTab]!.llegaron.length > 0 && (
                  <>
                    <p className="seg-transporte-section-title">Ya llegaron ({listaData[listaTab]!.llegaron.length})</p>
                    <div className="seg-transporte-list">
                      {listaData[listaTab]!.llegaron.map((p, i) => (
                        <div key={i} className="seg-transporte-row is-here">
                          <span className="seg-transporte-name">✓ {p.nombre}</span>
                          <span className="seg-transporte-meta">{p.paquete || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {listaData[listaTab]!.total === 0 && <p className="seg-transporte-loading">Sin registros.</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
