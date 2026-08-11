import { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, Plus, Minus } from 'lucide-react';

/**
 * Pedidos — integración real con BarDJ AI (meseroai.com), bar "Joinn".
 * No hay mesa física: cada asistente usa un código propio (AIRA-XXXX,
 * guardado en su celular) como si fuera "su mesa" — así BarDJ agrupa
 * sus pedidos por persona en vez de por mesa, sin tocar su backend.
 */

const BARDJ_API = 'https://www.meseroai.com/api/webhook';
const BAR_SLUG = 'Joinn';
const CUSTOMER_CODE_KEY = 'aira_customer_code';

interface MenuItem {
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category_name?: string;
  category_emoji?: string;
}

interface CartLine { name: string; price: number; qty: number; }

/** Identificador estable por celular — reemplazar por el código real de la boleta cuando esté conectado */
function getCustomerCode(): string {
  let code = localStorage.getItem(CUSTOMER_CODE_KEY);
  if (!code) {
    code = 'AIRA-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    localStorage.setItem(CUSTOMER_CODE_KEY, code);
  }
  return code;
}

async function callBarDJ<T = unknown>(action: string, data?: Record<string, unknown>): Promise<{ ok: boolean; data: T | null; error: string | null }> {
  const code = getCustomerCode();
  const res = await fetch(BARDJ_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, bar_slug: BAR_SLUG, table_number: code, from: code, data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, data: null, error: err?.error || `HTTP ${res.status}` };
  }
  return res.json();
}

export default function MyAppOrders() {
  const [items, setItems]   = useState<MenuItem[] | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [cart, setCart]     = useState<CartLine[]>([]);
  const [category, setCategory] = useState('Todo');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await callBarDJ<MenuItem[]>('CONSULTAR_CARTA', { query: '', source: 'webapp' });
        if (cancelled) return;
        if (res.ok) setItems(res.data ?? []);
        else setError(res.error || 'No pudimos cargar la carta de Joinn');
      } catch {
        if (!cancelled) setError('No pudimos conectar con Joinn. Revisa tu conexión.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
    try {
      const res = await callBarDJ('CREAR_PEDIDO', {
        items: cart.map(l => ({ name: l.name, qty: l.qty, price: l.price })),
        customer_name: getCustomerCode(),
      });
      if (res.ok) { setStatus('sent'); setCart([]); }
      else { setStatus('idle'); setError(res.error || 'No se pudo enviar el pedido'); }
    } catch {
      setStatus('idle');
      setError('No se pudo conectar con Joinn. Intenta de nuevo.');
    }
  };

  if (status === 'sent') {
    return (
      <div className="pedidos-success">
        <div className="pedidos-success-icon">✅</div>
        <h3>¡Pedido enviado a Joinn!</h3>
        <p>Te lo llevan en un momento — no necesitas estar en ninguna mesa fija.</p>
        <button className="pedidos-again-btn" onClick={() => setStatus('idle')}>Hacer otro pedido</button>
      </div>
    );
  }

  return (
    <div className="pedidos-panel">
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

          <div className="pedidos-grid">
            {filtered.map(item => {
              const inCart = cart.find(l => l.name === item.name);
              return (
                <div key={item.name} className="pedidos-item">
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} className="pedidos-item-img" />
                    : <div className="pedidos-item-img pedidos-item-img--placeholder">{item.category_emoji || '🍽️'}</div>}
                  <div className="pedidos-item-body">
                    <span className="pedidos-item-name">{item.name}</span>
                    {item.description && <span className="pedidos-item-desc">{item.description}</span>}
                    <span className="pedidos-item-price">${Number(item.price).toLocaleString('es-CO')}</span>
                  </div>
                  {inCart ? (
                    <div className="pedidos-item-stepper">
                      <button onClick={() => changeQty(item.name, -1)} aria-label="Quitar"><Minus size={14} /></button>
                      <span>{inCart.qty}</span>
                      <button onClick={() => changeQty(item.name, 1)} aria-label="Agregar"><Plus size={14} /></button>
                    </div>
                  ) : (
                    <button className="pedidos-item-add" onClick={() => addToCart(item)} aria-label="Agregar al carrito">
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {cart.length > 0 && (
        <div className="pedidos-cart-bar">
          <div className="pedidos-cart-summary">
            <ShoppingBag size={16} />
            <span>{cart.reduce((s, l) => s + l.qty, 0)} · ${total.toLocaleString('es-CO')}</span>
          </div>
          <button className="pedidos-cart-btn" disabled={status === 'sending'} onClick={submitOrder}>
            {status === 'sending' ? 'Enviando…' : 'Enviar pedido a Joinn'}
          </button>
        </div>
      )}
    </div>
  );
}
