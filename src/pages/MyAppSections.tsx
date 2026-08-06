import { useState } from 'react';

/**
 * Contenido de cada sección de /myapp.
 * Gastos y Pasaporte ya tienen funcionalidad real (local, sin backend aún).
 * El resto son placeholders listos para irse llenando.
 */

export interface CompassSection {
  id: string;
  label: string;
  emoji: string;
  image: string;
  color: string; // acento por sección
}

export const SECTIONS: CompassSection[] = [
  { id: 'pasaporte',  label: 'Mi Pasaporte', emoji: '🛂', image: '/AIRA.png',           color: '#22c55e' },
  { id: 'gastos',     label: 'Tus Gastos',   emoji: '💸', image: '/vinyl.jpg',           color: '#10b981' },
  { id: 'lineup',     label: 'Line-Up',      emoji: '🎧', image: '/dj-console.jpg',      color: '#a855f7' },
  { id: 'mapa',       label: 'Mapa',         emoji: '🗺️', image: '/guatape-aerial.jpg',  color: '#38bdf8' },
  { id: 'galeria',    label: 'Galería',      emoji: '📸', image: '/crowd-1.jpg',         color: '#f97316' },
  { id: 'vip',        label: 'VIP',          emoji: '👑', image: '/vip-area.jpg',        color: '#facc15' },
  { id: 'transporte', label: 'Transporte',   emoji: '🚌', image: '/yacht-party.jpg',     color: '#ef4444' },
  { id: 'perfil',     label: 'Mi Perfil',    emoji: '👤', image: '/dj-portrait.jpg',     color: '#ec4899' },
];

/** Placeholder visual tipo QR — se reemplaza por el QR real (orders.qr_token) cuando se conecte al backend */
function QrPlaceholder({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" width="150" height="150" className="passport-qr-svg">
      <rect width="120" height="120" rx="10" fill="#fff" />
      {[[6, 6], [80, 6], [6, 80]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="34" height="34" rx="4" fill="#111" />
          <rect x={x + 6} y={y + 6} width="22" height="22" rx="2" fill="#fff" />
          <rect x={x + 12} y={y + 12} width="10" height="10" rx="1" fill={color} />
        </g>
      ))}
      {Array.from({ length: 40 }).map((_, i) => {
        const gx = 46 + (i % 8) * 8;
        const gy = 46 + Math.floor(i / 8) * 8;
        return Math.random() > 0.45 ? <rect key={i} x={gx} y={gy} width="6" height="6" fill="#111" /> : null;
      })}
    </svg>
  );
}

function PasaportePanel() {
  return (
    <div className="passport-card">
      <div className="passport-header">
        <img src="/AIRA BLANCO.png" alt="AIRA" className="passport-logo" />
        <span className="passport-kicker">Pase de Acceso</span>
      </div>

      <div className="passport-body">
        <div className="passport-field">
          <span className="passport-field-label">Titular</span>
          <span className="passport-field-value">— Vincula tu orden —</span>
        </div>
        <div className="passport-field-row">
          <div className="passport-field">
            <span className="passport-field-label">Referencia</span>
            <span className="passport-field-value">AIRA-XXXX</span>
          </div>
          <div className="passport-field">
            <span className="passport-field-label">Acceso</span>
            <span className="passport-field-value">General</span>
          </div>
        </div>

        <div className="passport-qr-wrap">
          <QrPlaceholder color="#22c55e" />
          <p className="passport-qr-hint">Tu QR real se activa al confirmar el pago de tu boleta</p>
        </div>
      </div>
    </div>
  );
}

interface Expense {
  id: number;
  label: string;
  amount: number;
}

function GastosPanel() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [label, setLabel]       = useState('');
  const [amount, setAmount]     = useState('');

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const addExpense = () => {
    const n = Number(amount);
    if (!label.trim() || !n || n <= 0) return;
    setExpenses(prev => [...prev, { id: Date.now(), label: label.trim(), amount: n }]);
    setLabel('');
    setAmount('');
  };

  const removeExpense = (id: number) => setExpenses(prev => prev.filter(e => e.id !== id));

  return (
    <div className="gastos-panel">
      <div className="gastos-total">
        <span className="gastos-total-label">Total gastado</span>
        <span className="gastos-total-value">
          ${total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
        </span>
      </div>

      <div className="gastos-form">
        <input
          className="gastos-input"
          placeholder="¿En qué? (ej. Trago, transporte...)"
          value={label}
          onChange={e => setLabel(e.target.value)}
        />
        <div className="gastos-form-row">
          <input
            className="gastos-input gastos-input--amount"
            placeholder="$ monto"
            inputMode="numeric"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
          />
          <button className="gastos-add-btn" onClick={addExpense}>Agregar</button>
        </div>
      </div>

      <div className="gastos-list">
        {expenses.length === 0 && <p className="gastos-empty">Aún no registras gastos.</p>}
        {expenses.map(e => (
          <div key={e.id} className="gastos-item">
            <span className="gastos-item-label">{e.label}</span>
            <span className="gastos-item-amount">${e.amount.toLocaleString('es-CO')}</span>
            <button className="gastos-item-remove" onClick={() => removeExpense(e.id)} aria-label="Eliminar">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingSoonPanel({ section }: { section: CompassSection }) {
  return (
    <div className="soon-panel">
      <span className="soon-emoji">{section.emoji}</span>
      <p className="soon-text">Estamos preparando <strong>{section.label}</strong> — vuelve pronto.</p>
    </div>
  );
}

export function renderSectionContent(section: CompassSection) {
  switch (section.id) {
    case 'pasaporte': return <PasaportePanel />;
    case 'gastos':    return <GastosPanel />;
    default:          return <ComingSoonPanel section={section} />;
  }
}
