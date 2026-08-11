import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import './Seguridad.css';

/**
 * /seguridad — app de escaneo para el staff de la entrada.
 * Cámara del celular + jsQR (decodifica en el navegador, sin libs
 * nativas) → valida cada QR contra /api/validate-qr (que ya revisa
 * manual_registros: existe, saldo en $0, no usado antes).
 */

const KEY_STORAGE = 'aira_scanner_key';

type ResultState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'result'; color: 'green' | 'red' | 'orange'; message: string; name?: string; ref?: string };

export default function Seguridad() {
  const [scannerKey, setScannerKey] = useState(() => localStorage.getItem(KEY_STORAGE) || '');
  const [keyInput, setKeyInput]     = useState('');
  const [cameraError, setCameraError] = useState('');
  const [result, setResult] = useState<ResultState>({ status: 'idle' });

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number | null>(null);
  const lastTokenRef  = useRef<string | null>(null);
  const cooldownRef   = useRef(false);

  useEffect(() => { document.title = 'AIRA · Seguridad'; }, []);

  // ── Cámara ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!scannerKey) return;
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
  }, [scannerKey]);

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
      const res = await fetch(`/api/validate-qr?token=${encodeURIComponent(token)}`, {
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

  const saveKey = () => {
    if (!keyInput.trim()) return;
    localStorage.setItem(KEY_STORAGE, keyInput.trim());
    setScannerKey(keyInput.trim());
  };

  if (!scannerKey) {
    return (
      <div className="seg-gate">
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
      </div>
    );
  }

  return (
    <div className="seg-root">
      <div className="seg-header">
        <span>AIRA · Seguridad</span>
        <button className="seg-logout" onClick={() => { localStorage.removeItem(KEY_STORAGE); setScannerKey(''); }}>
          Salir
        </button>
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
          </>
        )}
      </div>
    </div>
  );
}
