import { useEffect, useMemo, useState } from 'react';
import { Bus, RefreshCw, Search, X, Plus, QrCode } from 'lucide-react';
import './MyAppAdmin.css';

/**
 * /myapp-admin — dashboard para gestionar asistentes: reasignar cabañas
 * arrastrando tarjetas entre columnas, y marcar/quitar transporte en bus.
 * Toca directo manual_registros vía api/myapp-admin-registros.ts (liviano
 * a propósito — solo paquete/va_en_bus, nunca los montos).
 */

const KEY_STORAGE = 'aira_myapp_admin_key';
const CABIN_COUNT = 19;

interface Registro {
  id: number;
  order_ref: string;
  nombre: string;
  cedula: string | null;
  movil: string | null;
  paquete: string | null;
  monto_pendiente: number;
  va_en_bus: number;
  qr_token: string | null;
}

const BOLETA_BASE = 'https://www.viveaira.live';
// Mismo servicio que ya usa el QR real del Pasaporte en /myapp — nada de
// librería nueva ni datos falsos, es el QR que de verdad valida en la puerta.
const qrImgUrl = (orderRef: string, token: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`${BOLETA_BASE}/boleta/${orderRef}?token=${token}`)}`;

// Etiqueta completa que ya usamos en el resto de la app — mantiene el
// mismo formato "Cabaña N - Nombre" para que el mapa/pasaporte sigan
// reconociéndola por el número.
const CABIN_NAMES: Record<number, string> = {
  1: 'La Roca', 2: 'El Mirador', 3: 'Aguas Vivas', 4: 'La Cumbre', 5: 'Deluxe',
  6: 'Beatlink', 7: 'Selva Adentro', 8: 'La Fogata', 9: 'Río Arriba', 10: 'Aïra',
  11: 'Punta Sur', 12: 'La Terraza', 13: 'Viento Sur', 14: 'Casa Volcán',
  15: 'El Faro Individual', 16: 'La Bahía', 17: 'Monte Alto', 18: 'Casa Piedra', 19: 'El Retiro',
};

function cabinLabel(n: number): string {
  return `Cabaña ${n} - ${CABIN_NAMES[n] || ''}`.trim();
}
function cabinNumber(paquete: string | null): number | null {
  const m = paquete?.match(/Caba[ñn]a\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

export default function MyAppAdmin() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(KEY_STORAGE) || '');
  const [keyInput, setKeyInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [registros, setRegistros] = useState<Registro[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [qrView, setQrView] = useState<Registro | null>(null);

  useEffect(() => { document.title = 'AIRA · Admin'; }, []);

  const load = async (key: string) => {
    setLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/myapp-admin-registros', { headers: { 'x-admin-key': key } });
      if (res.status === 401) {
        setAuthError('Clave incorrecta');
        localStorage.removeItem(KEY_STORAGE);
        setAdminKey('');
        setLoading(false);
        return;
      }
      const json = await res.json();
      if (json.ok) setRegistros(json.registros);
    } catch {
      setAuthError('No se pudo conectar. Intenta de nuevo.');
    }
    setLoading(false);
  };

  useEffect(() => { if (adminKey) load(adminKey); }, [adminKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveKey = () => {
    if (!keyInput.trim()) return;
    localStorage.setItem(KEY_STORAGE, keyInput.trim());
    setAdminKey(keyInput.trim());
  };

  const patch = async (id: number, changes: { paquete?: string; va_en_bus?: 0 | 1 }) => {
    // Optimista — actualiza en pantalla antes de que responda el server
    setRegistros(prev => prev?.map(r => (r.id === id ? { ...r, ...changes } : r)) ?? prev);
    try {
      await fetch('/api/myapp-admin-registros', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ id, ...changes }),
      });
    } catch { /* si falla, el proximo refresh (load) corrige la vista */ }
  };

  const filtered = useMemo(() => {
    if (!registros) return [];
    const q = search.trim().toLowerCase();
    if (!q) return registros;
    return registros.filter(r =>
      r.nombre.toLowerCase().includes(q) ||
      (r.movil || '').includes(q) ||
      (r.paquete || '').toLowerCase().includes(q)
    );
  }, [registros, search]);

  const columns = useMemo(() => {
    const sinCabana: Registro[] = [];
    const porCabana: Record<number, Registro[]> = {};
    for (let i = 1; i <= CABIN_COUNT; i++) porCabana[i] = [];
    for (const r of filtered) {
      const n = cabinNumber(r.paquete);
      if (n && porCabana[n]) porCabana[n].push(r);
      else sinCabana.push(r);
    }
    return { sinCabana, porCabana };
  }, [filtered]);

  const enBus = useMemo(() => filtered.filter(r => r.va_en_bus), [filtered]);

  const onDropCabin = (n: number) => {
    if (dragId == null) return;
    patch(dragId, { paquete: cabinLabel(n) });
    setDragId(null);
    setDragOverCol(null);
  };
  const onDropSinCabana = () => {
    if (dragId == null) return;
    patch(dragId, { paquete: '' });
    setDragId(null);
    setDragOverCol(null);
  };
  const onDropBus = () => {
    if (dragId == null) return;
    patch(dragId, { va_en_bus: 1 });
    setDragId(null);
    setDragOverCol(null);
  };

  if (!adminKey) {
    return (
      <div className="madm-gate">
        <img src="/AIRA BLANCO.png" alt="AIRA" className="madm-gate-logo" />
        <h1 className="madm-gate-title">🗂️ AIRA · Admin</h1>
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
    <div className="madm-root">
      <div className="madm-header">
        <span className="madm-header-title">🗂️ AIRA · Admin</span>
        <div className="madm-search">
          <Search size={14} />
          <input placeholder="Buscar nombre, móvil o paquete…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <button className="madm-new" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Nuevo
        </button>
        <button className="madm-refresh" onClick={() => load(adminKey)} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'is-spinning' : ''} /> {registros?.length ?? 0} registros
        </button>
        <button className="madm-logout" onClick={() => { localStorage.removeItem(KEY_STORAGE); setAdminKey(''); }}>Salir</button>
      </div>

      {loading && !registros && <div className="madm-loading">Cargando…</div>}

      {registros && (
        <div className="madm-board">
          {/* Columna: Bus (aparte — no es exclusiva con la cabaña) */}
          <div
            className={`madm-col madm-col--bus ${dragOverCol === 'bus' ? 'is-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOverCol('bus'); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={onDropBus}
          >
            <div className="madm-col-head"><Bus size={14} /> Bus <span>{enBus.length}</span></div>
            <div className="madm-col-body">
              {enBus.map(r => (
                <div
                  key={r.id}
                  className="madm-card madm-card--bus"
                  draggable
                  onDragStart={() => setDragId(r.id)}
                  onClick={() => setQrView(r)}
                >
                  <span className="madm-card-name">{r.nombre}</span>
                  <button className="madm-card-remove" onClick={e => { e.stopPropagation(); patch(r.id, { va_en_bus: 0 }); }} aria-label="Quitar del bus">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {enBus.length === 0 && <p className="madm-col-empty">Arrastra tarjetas acá</p>}
            </div>
          </div>

          {/* Columna: Sin cabaña */}
          <div
            className={`madm-col ${dragOverCol === 'sin' ? 'is-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOverCol('sin'); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={onDropSinCabana}
          >
            <div className="madm-col-head">Sin cabaña <span>{columns.sinCabana.length}</span></div>
            <div className="madm-col-body">
              {columns.sinCabana.map(r => (
                <Card key={r.id} r={r} onDragStart={() => setDragId(r.id)} onClick={() => setQrView(r)} />
              ))}
            </div>
          </div>

          {/* Columnas: Cabaña 1..19 */}
          {Array.from({ length: CABIN_COUNT }, (_, i) => i + 1).map(n => (
            <div
              key={n}
              className={`madm-col ${dragOverCol === `c${n}` ? 'is-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOverCol(`c${n}`); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => onDropCabin(n)}
            >
              <div className="madm-col-head">{cabinLabel(n)} <span>{columns.porCabana[n].length}</span></div>
              <div className="madm-col-body">
                {columns.porCabana[n].map(r => (
                  <Card key={r.id} r={r} onDragStart={() => setDragId(r.id)} onClick={() => setQrView(r)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal
          adminKey={adminKey}
          onClose={() => setShowCreate(false)}
          onCreated={(nuevo) => {
            setRegistros(prev => (prev ? [...prev, nuevo] : [nuevo]));
            setShowCreate(false);
            setQrView(nuevo);
          }}
        />
      )}

      {qrView && (
        <div className="madm-overlay" onClick={() => setQrView(null)}>
          <div className="madm-qr-sheet" onClick={e => e.stopPropagation()}>
            <button className="madm-qr-close" onClick={() => setQrView(null)} aria-label="Cerrar"><X size={18} /></button>
            <p className="madm-qr-name">{qrView.nombre}</p>
            <p className="madm-qr-ref">{qrView.order_ref}</p>
            {qrView.qr_token ? (
              qrView.monto_pendiente > 0 ? (
                <div className="madm-qr-pending">⚠️ Tiene saldo pendiente — el QR no se activa hasta marcarlo en $0 desde el sitio principal.</div>
              ) : (
                <img src={qrImgUrl(qrView.order_ref, qrView.qr_token)} alt="QR de acceso" width={220} height={220} className="madm-qr-img" />
              )
            ) : (
              <div className="madm-qr-pending">Este registro no tiene QR generado.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ r, onDragStart, onClick }: { r: Registro; onDragStart: () => void; onClick: () => void }) {
  return (
    <div className={`madm-card ${r.monto_pendiente > 0 ? 'is-pending' : ''}`} draggable onDragStart={onDragStart} onClick={onClick}>
      <span className="madm-card-name">{r.nombre}</span>
      <div className="madm-card-meta">
        {r.monto_pendiente > 0 && <span className="madm-card-flag">$ pendiente</span>}
        {!!r.va_en_bus && <span className="madm-card-bus"><Bus size={10} /></span>}
        {!r.monto_pendiente && r.qr_token && <QrCode size={11} className="madm-card-qr-icon" />}
      </div>
    </div>
  );
}

// ── Modal de creación ────────────────────────────────────────────────────
function CreateModal({ adminKey, onClose, onCreated }: { adminKey: string; onClose: () => void; onCreated: (r: Registro) => void }) {
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [movil, setMovil] = useState('');
  const [cabina, setCabina] = useState(''); // '' = sin cabaña, 'staff' = Staff, o el número
  const [montoTotal, setMontoTotal] = useState('');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [marcarPagado, setMarcarPagado] = useState(true);
  const [vaEnBus, setVaEnBus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const paqueteFinal = cabina === '' ? null : cabina === 'staff' ? 'Staff' : cabinLabel(Number(cabina));

  const submit = async () => {
    if (!nombre.trim() || !cedula.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/myapp-admin-registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          nombre, cedula, movil, paquete: paqueteFinal,
          monto_total: Number(montoTotal) || 0,
          monto_recibido: Number(montoRecibido) || 0,
          marcarPagado,
          va_en_bus: vaEnBus ? 1 : 0,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        onCreated({ id: Date.now(), ...json.registro });
      } else {
        setError(json.error || 'No se pudo crear');
      }
    } catch {
      setError('No se pudo conectar. Intenta de nuevo.');
    }
    setSaving(false);
  };

  return (
    <div className="madm-overlay" onClick={onClose}>
      <div className="madm-create-sheet" onClick={e => e.stopPropagation()}>
        <div className="madm-create-head">
          <span>➕ Nuevo registro</span>
          <button onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="madm-create-body">
          <label className="madm-field-label">Nombre completo *</label>
          <input className="madm-field" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre y apellido" />

          <label className="madm-field-label">Cédula *</label>
          <input className="madm-field" value={cedula} onChange={e => setCedula(e.target.value)} placeholder="1020304050" />

          <label className="madm-field-label">Móvil</label>
          <input className="madm-field" value={movil} onChange={e => setMovil(e.target.value)} placeholder="3001234567" />

          <label className="madm-field-label">Cabaña / paquete</label>
          <select className="madm-field" value={cabina} onChange={e => setCabina(e.target.value)}>
            <option value="">Sin cabaña</option>
            <option value="staff">Staff</option>
            {Array.from({ length: CABIN_COUNT }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{cabinLabel(n)}</option>
            ))}
          </select>

          <div className="madm-field-row">
            <div>
              <label className="madm-field-label">Monto total</label>
              <input className="madm-field" type="number" value={montoTotal} onChange={e => setMontoTotal(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="madm-field-label">Recibido</label>
              <input className="madm-field" type="number" value={montoRecibido} onChange={e => setMontoRecibido(e.target.value)} placeholder="0" disabled={marcarPagado} />
            </div>
          </div>

          <label className="madm-check">
            <input type="checkbox" checked={marcarPagado} onChange={e => setMarcarPagado(e.target.checked)} />
            Marcar como pagado en su totalidad (activa el QR de una vez)
          </label>
          <label className="madm-check">
            <input type="checkbox" checked={vaEnBus} onChange={e => setVaEnBus(e.target.checked)} />
            Va en bus
          </label>

          {error && <p className="madm-create-error">⚠️ {error}</p>}

          <button className="madm-create-submit" onClick={submit} disabled={saving || !nombre.trim() || !cedula.trim()}>
            {saving ? 'Creando…' : 'Crear y generar QR'}
          </button>
        </div>
      </div>
    </div>
  );
}
