import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingBag, Plus, Minus, Receipt, ChevronLeft, ChevronRight, RefreshCw, ShoppingCart } from 'lucide-react';
import type { Attendee } from './MyAppAuth';

/**
 * Pedidos — integración real con BarDJ AI (meseroai.com), bar "Joinn".
 * No hay mesa física: cada asistente usa su propio `orderRef` (el de su
 * boleta, real y estable) como si fuera "su mesa" — así BarDJ agrupa sus
 * pedidos por persona en vez de por mesa, sin tocar su backend.
 *
 * OJO: antes usábamos un código random guardado en localStorage — eso se
 * perdía si el usuario reinstalaba la PWA o limpiaba datos del navegador,
 * y entonces "Mi cuenta" aparecía vacía aunque sí hubiera pedidos (bajo el
 * código viejo). Usar el orderRef real de su boleta lo hace estable sin
 * importar el dispositivo/navegador.
 *
 * 3 pantallas (mismo lenguaje visual de AIRA — colores/tipografía —
 * pero replicando el flujo de la app nativa de BarDJ):
 *  1. Carta   — platos con imagen, igual que en la app nativa.
 *  2. Confirmar — antes de enviar, revisa qty/total y confirma.
 *  3. Cuenta  — todo lo pedido hasta ahora + total (CONSULTAR_CUENTA).
 */

const BARDJ_API = 'https://www.meseroai.com/api/webhook';
const BAR_SLUG = 'Joinn';
const CUSTOMER_CODE_KEY = 'aira_customer_code'; // fallback legacy, solo si por algún motivo no hay attendee

interface MenuItem {
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category_name?: string;
  category_emoji?: string;
}

interface CartLine { name: string; price: number; qty: number; }
interface CuentaLine { name: string; qty: number; price: number; subtotal: number; }

type View = 'carta' | 'confirm' | 'cuenta';

/** Fallback legacy — solo se usa si por algún motivo no hay attendee logueado */
function getFallbackCode(): string {
  let code = localStorage.getItem(CUSTOMER_CODE_KEY);
  if (!code) {
    code = 'AIRA-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    localStorage.setItem(CUSTOMER_CODE_KEY, code);
  }
  return code;
}

async function callBarDJ<T = unknown>(
  code: string, action: string, data?: Record<string, unknown>
): Promise<{ ok: boolean; data: T | null; mensaje: string | null; error: string | null }> {
  const res = await fetch(BARDJ_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, bar_slug: BAR_SLUG, table_number: code, from: code, data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, data: null, mensaje: null, error: err?.error || `HTTP ${res.status}` };
  }
  return res.json();
}

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

export default function MyAppOrders({ attendee }: { attendee: Attendee | null }) {
  const code = attendee?.orderRef || getFallbackCode();
  const customerName = attendee?.name || code;

  const [view, setView]     = useState<View>('carta');
  const [items, setItems]   = useState<MenuItem[] | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [cart, setCart]     = useState<CartLine[]>([]);
  const [category, setCategory] = useState('Todo');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  // Joinn ahora puede pedir pago con Bold antes de mandar el pedido a
  // cocina — si CREAR_PEDIDO devuelve payment_url, el pedido queda
  // "esperando pago" del lado de BarDJ, no se puede mostrar como si ya
  // estuviera confirmado.
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await callBarDJ<MenuItem[]>(code, 'CONSULTAR_CARTA', { query: '', source: 'webapp' });
        if (cancelled) return;
        if (res.ok) setItems(res.data ?? []);
        else setError(res.error || 'No pudimos cargar la carta de Joinn');
      } catch {
        if (!cancelled) setError('No pudimos conectar con Joinn. Revisa tu conexión.');
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  const categories = useMemo(() => {
    if (!items) return [];
    return ['Todo', ...Array.from(new Set(items.map(i => i.category_name || 'Otros')))];
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    return category === 'Todo' ? items : items.filter(i => (i.category_name || 'Otros') === category);
  }, [items, category]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(l => l.name === item.name);
      if (existing) return prev.map(l => (l.name === item.name ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { name: item.name, price: item.price, qty: 1 }];
    });
  };
  const changeQty = (name: string, delta: number) => {
    setCart(prev => prev.map(l => (l.name === name ? { ...l, qty: l.qty + delta } : l)).filter(l => l.qty > 0));
  };

  const total = cart.reduce((s, l) => s + l.qty * l.price, 0);

  const submitOrder = async () => {
    if (!cart.length) return;
    setStatus('sending');
    setPaymentUrl(null);
    try {
      const res = await callBarDJ<{ payment_url?: string | null }>(code, 'CREAR_PEDIDO', {
        items: cart.map(l => ({ name: l.name, qty: l.qty, price: l.price })),
        customer_name: customerName,
        // Después de pagar en Bold, que vuelva a myapp (no al dominio de
        // bardj-ai) — así el cliente no queda "perdido" fuera de la app.
        redirect_url: 'https://www.viveaira.live/myapp',
      });
      if (res.ok) {
        setPaymentUrl(res.data?.payment_url || null);
        setStatus('sent');
        setCart([]);
      } else {
        setStatus('idle'); setView('carta'); setError(res.error || 'No se pudo enviar el pedido');
      }
    } catch {
      setStatus('idle');
      setView('carta');
      setError('No se pudo conectar con Joinn. Intenta de nuevo.');
    }
  };

  if (status === 'sent') {
    return (
      <div className="pedidos-success">
        {paymentUrl ? (
          <>
            <div className="pedidos-success-icon">💳</div>
            <h3>¡Casi listo!</h3>
            <p>Confirma el pago para que tu pedido pase a cocina en Joinn</p>
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pedidos-again-btn"
              style={{ textDecoration: 'none', display: 'inline-block' }}
            >
              💳 Pagar ahora
            </a>
            {/* Mientras el pago está pendiente no tiene sentido "hacer otro
                pedido" ni "ver mi cuenta" — solo pagar o volver a la carta. */}
            <button className="pedidos-again-btn" onClick={() => { setStatus('idle'); setPaymentUrl(null); }}>Volver</button>
          </>
        ) : (
          <>
            <div className="pedidos-success-icon">✅</div>
            <h3>¡Pedido enviado a Joinn!</h3>
            <p>Te lo llevan en un momento — no necesitas estar en ninguna mesa fija.</p>
            <button className="pedidos-again-btn" onClick={() => setStatus('idle')}>Hacer otro pedido</button>
            <button className="pedidos-again-btn" onClick={() => { setStatus('idle'); setView('cuenta'); }}>Ver mi cuenta</button>
          </>
        )}
      </div>
    );
  }

  if (view === 'confirm') {
    return (
      <ConfirmScreen
        cart={cart}
        total={total}
        sending={status === 'sending'}
        onBack={() => setView('carta')}
        onChangeQty={changeQty}
        onConfirm={submitOrder}
      />
    );
  }

  return (
    <div className="pedidos-panel">
      <div className="pedidos-tabs">
        <button className={`pedidos-tab ${view === 'carta' ? 'is-active' : ''}`} onClick={() => setView('carta')}>
          🍽️ Carta
        </button>
        <button className={`pedidos-tab ${view === 'cuenta' ? 'is-active' : ''}`} onClick={() => setView('cuenta')}>
          <Receipt size={13} /> Mi cuenta
        </button>
      </div>

      {view === 'cuenta' ? (
        <CuentaScreen code={code} />
      ) : (
        <>
          {error && <div className="pedidos-error">⚠️ {error}</div>}

          {items === null && !error && (
            <div className="pedidos-loading"><div className="spinner" /><span>Cargando la carta de Joinn…</span></div>
          )}

          {items !== null && items.length === 0 && !error && (
            <div className="pedidos-empty">
              <span>🍹</span>
              <p>Joinn todavía está preparando su carta. Vuelve pronto.</p>
            </div>
          )}

          {items !== null && items.length > 0 && (
            <>
              <div className="pedidos-cats">
                {categories.map(c => (
                  <button key={c} className={`pedidos-cat ${c === category ? 'is-active' : ''}`} onClick={() => setCategory(c)}>
                    {c}
                  </button>
                ))}
              </div>

              <AiraDishCard key={category} items={filtered} cart={cart} onAdd={addToCart} onChangeQty={changeQty} />
            </>
          )}
        </>
      )}

      {view === 'carta' && cart.length > 0 && (
        <div className="pedidos-cart-bar">
          <div className="pedidos-cart-summary">
            <ShoppingBag size={16} />
            <span>{cart.reduce((s, l) => s + l.qty, 0)} · {fmt(total)}</span>
          </div>
          <button className="pedidos-cart-btn" onClick={() => setView('confirm')}>
            Revisar pedido
          </button>
        </div>
      )}
    </div>
  );
}

// ── Carta — tarjeta inmersiva con imagen circular (igual que la app nativa
// de BarDJ), un plato a la vez, deslizable. ─────────────────────────────────
function AiraDishCard({ items, cart, onAdd, onChangeQty }: {
  items: MenuItem[]; cart: CartLine[];
  onAdd: (item: MenuItem) => void; onChangeQty: (name: string, delta: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [added, setAdded] = useState(false);
  const [dir, setDir]     = useState<'left' | 'right'>('left');
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const touchX = useRef(0);
  const prefetched = useRef<Set<string>>(new Set());

  const safeIndex = Math.min(index, items.length - 1);
  const dish = items[safeIndex];
  const qty = cart.find(l => l.name === dish?.name)?.qty ?? 0;

  // Precarga la imagen del plato siguiente y anterior mientras se ve el
  // actual — así al deslizar ya está en cache del navegador y no espera
  // a que baje de nuevo (antes solo se pedía cuando ya tocaba mostrarla).
  useEffect(() => {
    const around = [items[(safeIndex + 1) % items.length], items[(safeIndex - 1 + items.length) % items.length]];
    around.forEach(it => {
      if (!it?.image_url || prefetched.current.has(it.image_url)) return;
      prefetched.current.add(it.image_url);
      const img = new Image();
      img.src = it.image_url;
    });
  }, [safeIndex, items]);

  // dir refleja hacia dónde "entra" la siguiente tarjeta — replica el
  // mismo lenguaje de animación (fade + slide + scale) que la app nativa.
  const go = (delta: number) => {
    setDir(delta > 0 ? 'left' : 'right');
    setIndex(i => (i + delta + items.length) % items.length);
  };
  const goTo = (i: number) => { setDir(i > safeIndex ? 'left' : 'right'); setIndex(i); };

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  const handleAdd = () => {
    onAdd(dish);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1000);
  };

  if (!dish) return null;

  return (
    <div className="pedidos-dish" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {dish.image_url ? (
        <div key={`bg-${dish.name}`} className="pedidos-dish-bg pedidos-dish-anim-bg" style={{ backgroundImage: `url(${dish.image_url})` }} />
      ) : (
        <div key={`bg-${dish.name}`} className="pedidos-dish-bg pedidos-dish-bg--placeholder pedidos-dish-anim-bg" />
      )}
      <div className="pedidos-dish-scrim" />

      {items.length > 1 && (
        <>
          <button className="pedidos-dish-arrow pedidos-dish-arrow--prev" onClick={() => go(-1)} aria-label="Anterior">
            <ChevronLeft size={18} />
          </button>
          <button className="pedidos-dish-arrow pedidos-dish-arrow--next" onClick={() => go(1)} aria-label="Siguiente">
            <ChevronRight size={18} />
          </button>
        </>
      )}

      <div className="pedidos-dish-circle-wrap">
        {qty > 0 && <span className="pedidos-dish-badge">{qty}</span>}
        <div key={`circle-${dish.name}`} className={`pedidos-dish-circle pedidos-dish-anim--${dir} ${qty > 0 ? 'has-qty' : ''}`}>
          {dish.image_url ? (
            <>
              {!loaded[dish.image_url] && <div className="pedidos-dish-skeleton" />}
              <img
                src={dish.image_url}
                alt={dish.name}
                draggable={false}
                loading="eager"
                decoding="async"
                // @ts-ignore — fetchPriority no está tipado en este TS/React aún
                fetchpriority="high"
                className={loaded[dish.image_url] ? 'is-loaded' : ''}
                onLoad={() => setLoaded(prev => ({ ...prev, [dish.image_url as string]: true }))}
              />
            </>
          ) : (
            <span className="pedidos-dish-circle-emoji">{dish.category_emoji || '🍽️'}</span>
          )}
        </div>
      </div>

      <div key={`content-${dish.name}`} className={`pedidos-dish-content pedidos-dish-anim--${dir}`}>
        {dish.category_name && <span className="pedidos-dish-cat">{dish.category_name}</span>}
        <h3 className="pedidos-dish-name">{dish.name}</h3>
        {dish.description && <p className="pedidos-dish-desc">{dish.description}</p>}

        {items.length > 1 && (
          <div className="pedidos-dish-dots">
            {items.map((it, i) => {
              const itQty = cart.find(l => l.name === it.name)?.qty ?? 0;
              return (
                <button
                  key={it.name}
                  className={`pedidos-dish-dot ${i === safeIndex ? 'is-active' : ''} ${itQty > 0 ? 'has-qty' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={it.name}
                />
              );
            })}
          </div>
        )}

        <div className="pedidos-dish-footer">
          <span className="pedidos-dish-price">{fmt(dish.price)}</span>
          {qty > 0 ? (
            <div className="pedidos-item-stepper pedidos-dish-stepper">
              <button onClick={() => onChangeQty(dish.name, -1)} aria-label="Quitar"><Minus size={14} /></button>
              <span>{qty}</span>
              <button onClick={() => onChangeQty(dish.name, 1)} aria-label="Agregar"><Plus size={14} /></button>
            </div>
          ) : (
            <button className={`pedidos-dish-add ${added ? 'is-added' : ''}`} onClick={handleAdd}>
              {added ? '✓' : <><ShoppingCart size={14} /> Agregar</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Confirmar antes de enviar ────────────────────────────────────────────────
function ConfirmScreen({ cart, total, sending, onBack, onChangeQty, onConfirm }: {
  cart: CartLine[]; total: number; sending: boolean;
  onBack: () => void; onChangeQty: (name: string, delta: number) => void; onConfirm: () => void;
}) {
  return (
    <div className="pedidos-panel">
      <button className="pedidos-confirm-back" onClick={onBack}>
        <ChevronLeft size={16} /> Volver a la carta
      </button>

      <h3 className="pedidos-confirm-title">Confirma tu pedido</h3>
      <p className="pedidos-confirm-sub">Se enviará directo a la barra de Joinn</p>

      <div className="pedidos-confirm-list">
        {cart.map(l => (
          <div key={l.name} className="pedidos-confirm-row">
            <div className="pedidos-confirm-row-info">
              <span className="pedidos-confirm-row-name">{l.name}</span>
              <span className="pedidos-confirm-row-price">{fmt(l.price)} c/u</span>
            </div>
            <div className="pedidos-item-stepper">
              <button onClick={() => onChangeQty(l.name, -1)} aria-label="Quitar"><Minus size={14} /></button>
              <span>{l.qty}</span>
              <button onClick={() => onChangeQty(l.name, 1)} aria-label="Agregar"><Plus size={14} /></button>
            </div>
            <span className="pedidos-confirm-row-subtotal">{fmt(l.price * l.qty)}</span>
          </div>
        ))}
      </div>

      <div className="pedidos-confirm-total">
        <span>Total</span>
        <span>{fmt(total)}</span>
      </div>

      <button className="pedidos-cart-btn pedidos-confirm-submit" disabled={sending || !cart.length} onClick={onConfirm}>
        {sending ? 'Enviando…' : `Confirmar y enviar a Joinn`}
      </button>
    </div>
  );
}

// ── Cuenta — todo lo pedido hasta ahora ──────────────────────────────────────
function CuentaScreen({ code }: { code: string }) {
  const [lines, setLines]     = useState<CuentaLine[] | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetchCuenta = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await callBarDJ<{ items?: CuentaLine[] }>(code, 'CONSULTAR_CUENTA');
      if (res.ok) {
        setLines(res.data?.items ?? []);
        setMensaje(res.mensaje || '');
      } else {
        setError(res.error || 'No se pudo cargar la cuenta');
      }
    } catch {
      setError('No se pudo conectar con Joinn.');
    }
    setLoading(false);
  }, [code]);

  useEffect(() => { fetchCuenta(); }, [fetchCuenta]);

  const total = (lines ?? []).reduce((s, l) => s + l.subtotal, 0);

  return (
    <div className="pedidos-cuenta">
      <div className="pedidos-cuenta-header">
        <span className="pedidos-cuenta-title">Mi cuenta en Joinn</span>
        <button className="pedidos-cuenta-refresh" onClick={fetchCuenta} disabled={loading} aria-label="Actualizar">
          <RefreshCw size={14} className={loading ? 'is-spinning' : ''} />
        </button>
      </div>

      {loading && lines === null && (
        <div className="pedidos-loading"><div className="spinner" /><span>Cargando tu cuenta…</span></div>
      )}

      {error && <div className="pedidos-error">⚠️ {error}</div>}

      {!loading && lines !== null && lines.length === 0 && !error && (
        <div className="pedidos-empty">
          <span>🧾</span>
          <p>{mensaje || 'Todavía no tienes pedidos en Joinn.'}</p>
        </div>
      )}

      {lines !== null && lines.length > 0 && (
        <>
          <div className="pedidos-cuenta-list">
            {lines.map((l, i) => (
              <div key={i} className="pedidos-cuenta-row">
                <span>{l.name} × {l.qty}</span>
                <span>{fmt(l.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="pedidos-cuenta-divider" />
          <div className="pedidos-cuenta-row pedidos-cuenta-total">
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}
