import { useState } from 'react';
import { Plus, Minus, Send } from 'lucide-react';

/**
 * Actividades y Otros — reservar jetski/jetcar/botes y comprar otros
 * productos. Demo local por ahora (no pasa por Joinn: son reservas
 * de equipo, no un pedido de bar) — cuando haya backend, el "Solicitar"
 * final se conecta a un endpoint real de reservas.
 */

interface ActivityItem {
  id: string;
  name: string;
  desc: string;
  price: number;
  unit: string;
  image: string;
  emoji: string;
}

const ACTIVITIES: ActivityItem[] = [
  { id: 'jetski',   name: 'Jet Ski',            desc: '30 min guiados por el embalse',      price: 180000, unit: 'por persona', image: '/yacht-party.jpg',    emoji: '🚤' },
  { id: 'jetcar',   name: 'Jet Car acuático',   desc: '20 min, incluye chaleco',             price: 160000, unit: 'por persona', image: '/beach-party.jpg',    emoji: '🏄' },
  { id: 'bote',     name: 'Bote privado',       desc: '1 hora, hasta 6 personas',            price: 350000, unit: 'por bote',     image: '/vip-area.jpg',       emoji: '⛵' },
  { id: 'lancha',   name: 'Paseo en lancha',    desc: '45 min, recorrido por el Peñol',       price: 90000,  unit: 'por persona', image: '/penol.jpg',          emoji: '🛥️' },
  { id: 'kayak',    name: 'Kayak',              desc: '1 hora, individual o doble',           price: 45000,  unit: 'por persona', image: '/sunset.jpg',         emoji: '🛶' },
  { id: 'toalla',   name: 'Kit de playa',       desc: 'Toalla + silla + sombrilla',           price: 35000,  unit: 'por kit',      image: '/bar.jpg',            emoji: '🏖️' },
];

interface CartLine { id: string; qty: number; }

function ActivityImg({ item }: { item: ActivityItem }) {
  return (
    <div className="act-item-img-wrap">
      <img src={item.image} alt={item.name} className="act-item-img" />
      <span className="act-item-emoji">{item.emoji}</span>
    </div>
  );
}

export default function MyAppActivities() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [sent, setSent] = useState(false);

  const qtyOf = (id: string) => cart.find(l => l.id === id)?.qty ?? 0;
  const changeQty = (id: string, delta: number) => {
    setCart(prev => {
      const existing = prev.find(l => l.id === id);
      if (!existing) return delta > 0 ? [...prev, { id, qty: 1 }] : prev;
      const qty = existing.qty + delta;
      return qty <= 0 ? prev.filter(l => l.id !== id) : prev.map(l => (l.id === id ? { ...l, qty } : l));
    });
  };

  const total = cart.reduce((s, l) => {
    const item = ACTIVITIES.find(a => a.id === l.id);
    return s + (item ? item.price * l.qty : 0);
  }, 0);

  const submit = () => {
    if (!cart.length) return;
    // Demo local — cuando haya backend de reservas, este es el punto
    // donde se llama al endpoint real (staff confirma disponibilidad).
    setSent(true);
    setCart([]);
  };

  if (sent) {
    return (
      <div className="pedidos-success">
        <div className="pedidos-success-icon">🚤</div>
        <h3>¡Solicitud enviada!</h3>
        <p>El equipo de actividades te contactará para confirmar horario y disponibilidad.</p>
        <button className="pedidos-again-btn" onClick={() => setSent(false)}>Hacer otra solicitud</button>
      </div>
    );
  }

  return (
    <div className="act-panel">
      <p className="act-hint">Reserva equipos acuáticos o compra kits de playa — el equipo confirma disponibilidad por horario</p>

      <div className="act-grid">
        {ACTIVITIES.map(item => {
          const qty = qtyOf(item.id);
          return (
            <div key={item.id} className="act-item">
              <ActivityImg item={item} />
              <div className="act-item-body">
                <span className="act-item-name">{item.name}</span>
                <span className="act-item-desc">{item.desc}</span>
                <span className="act-item-price">${item.price.toLocaleString('es-CO')} <em>{item.unit}</em></span>
              </div>
              {qty > 0 ? (
                <div className="pedidos-item-stepper act-item-stepper">
                  <button onClick={() => changeQty(item.id, -1)} aria-label="Quitar"><Minus size={14} /></button>
                  <span>{qty}</span>
                  <button onClick={() => changeQty(item.id, 1)} aria-label="Agregar"><Plus size={14} /></button>
                </div>
              ) : (
                <button className="pedidos-item-add act-item-add" onClick={() => changeQty(item.id, 1)} aria-label="Agregar">
                  <Plus size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div className="pedidos-cart-bar">
          <div className="pedidos-cart-summary">
            <span>{cart.reduce((s, l) => s + l.qty, 0)} · ${total.toLocaleString('es-CO')}</span>
          </div>
          <button className="pedidos-cart-btn act-cart-btn" onClick={submit}>
            Solicitar <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
