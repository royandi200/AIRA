import { useCallback, useEffect, useState } from 'react';
import { X, Check, Bath, Waves, Eye, Star, Bus, Minus, Plus, Ticket } from 'lucide-react';

interface SuiteReserveProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUITES = [
  { id: 1, label: 'Suite Nº 1', view: 'Vista represa norte', available: true },
  { id: 2, label: 'Suite Nº 2', view: 'Vista represa sur',   available: true },
  { id: 3, label: 'Suite Nº 3', view: 'Vista jardines',      available: true },
  { id: 4, label: 'Suite Nº 4', view: 'Vista represa norte', available: true },
  { id: 5, label: 'Suite Nº 5', view: 'Vista jardines',      available: false },
  { id: 6, label: 'Suite Nº 6', view: 'Vista represa sur',   available: true },
];

const SUITE_PRICE   = 2_200_000;
const TRANSPORT_PRICE = 150_000;

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function useLockBodyScroll(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    return () => {
      body.style.overflow = '';
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
    };
  }, [isOpen]);
}

const SuiteReserve = ({ isOpen, onClose }: SuiteReserveProps) => {
  const [step, setStep]               = useState(1);
  const [selectedSuiteId, setSuiteId] = useState<number | null>(null);
  const [addTransport, setAddTransport] = useState(false);
  const [qty, setQty]                 = useState(2); // suite is per couple

  useLockBodyScroll(isOpen);

  const scrollRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop    = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      if (atTop    && e.deltaY < 0) { e.stopPropagation(); return; }
      if (atBottom && e.deltaY > 0) { e.stopPropagation(); return; }
      e.stopPropagation();
      e.preventDefault();
      el.scrollTop += e.deltaY;
    };
    el.addEventListener('wheel', handler, { passive: false });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setSuiteId(null);
    setAddTransport(false);
    setQty(2);
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const selectedSuite = SUITES.find(s => s.id === selectedSuiteId) ?? null;
  const serviceFee    = Math.round(SUITE_PRICE * 0.05);
  const transTotal    = addTransport ? TRANSPORT_PRICE * qty : 0;
  const total         = SUITE_PRICE + serviceFee + transTotal;

  const available = SUITES.filter(s => s.available).length;

  if (!isOpen) return null;

  const stepLabels = [
    { n: 1, label: 'Suite' },
    { n: 2, label: 'Confirmar' },
  ];

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center sm:p-4 md:p-6"
      style={{ background: 'rgba(2,4,12,0.90)', backdropFilter: 'blur(24px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reserva Suite AIRA"
        className="relative w-full sm:max-w-4xl rounded-t-[2rem] sm:rounded-[2rem] border border-amber-400/20 bg-[#06090f] shadow-2xl flex flex-col max-h-[96dvh] sm:max-h-[92dvh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Gold ambient glow */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none rounded-[inherit]"
          style={{
            background:
              'radial-gradient(circle at top right, rgba(251,191,36,0.18), transparent 40%),' +
              'radial-gradient(circle at bottom left, rgba(251,191,36,0.10), transparent 45%)',
          }}
        />

        {/* ── HEADER ── */}
        <div className="relative z-10 flex-none border-b border-amber-400/15 px-5 py-4 md:px-8 md:py-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
              <p className="font-mono-custom text-[10px] uppercase tracking-[0.35em] text-amber-400/80">Experiencia Premium · Solo 6 suites</p>
            </div>
            <h3 className="font-display text-2xl md:text-4xl text-white leading-none">Suite AIRA</h3>
            <p className="font-mono-custom text-xs md:text-sm text-white/40 mt-1.5">
              Guatapé · 3 días, 2 noches · Paquete completo
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-400/20 bg-amber-400/8">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-mono-custom text-[9px] uppercase tracking-[0.2em] text-amber-400">{available} disponibles</span>
            </div>
            <button
              className="flex-none w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 active:bg-white/20 transition-colors"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── STEP PILLS ── */}
        <div className="relative z-10 flex-none px-5 md:px-8 pt-4 pb-3 flex flex-wrap gap-2 border-b border-white/[0.05]">
          {stepLabels.map(item => {
            const active    = step === item.n;
            const completed = step > item.n;
            return (
              <div
                key={item.n}
                className={
                  'flex items-center gap-2 px-3 py-1.5 rounded-full border ' +
                  (active ? 'border-amber-400/40 bg-amber-400/10' : 'border-white/10 bg-white/[0.03]')
                }
              >
                <div
                  className={
                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono-custom ' +
                    (completed ? 'bg-amber-400 text-[#06090f]' : active ? 'bg-amber-400/80 text-[#06090f]' : 'bg-white/10 text-white/50')
                  }
                >
                  {completed ? <Check className="w-3.5 h-3.5" /> : item.n}
                </div>
                <span className={'font-mono-custom text-[10px] uppercase tracking-[0.22em] ' + (active ? 'text-white' : 'text-white/45')}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div
          ref={scrollRef}
          className="relative z-10 flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.85fr]">

            {/* ════ MAIN PANEL ════ */}
            <div className="p-5 md:p-8 lg:border-r border-white/[0.06]">

              {/* ── STEP 1: Selección de suite ── */}
              {step === 1 && (
                <div>
                  <p className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/35 mb-2">Paso 1</p>
                  <h4 className="font-display text-3xl md:text-4xl text-white mb-1">Elige tu suite</h4>
                  <p className="text-sm text-white/50 mb-6">
                    1 habitación · 1 baño · terraza privada · jacuzzi · capacidad 2 personas.
                  </p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {[
                      { icon: <Bath className="w-3 h-3" />, label: 'Jacuzzi privado' },
                      { icon: <Waves className="w-3 h-3" />, label: 'Terraza' },
                      { icon: <Eye className="w-3 h-3" />, label: 'Vista represa' },
                      { icon: <Star className="w-3 h-3" fill="currentColor" />, label: 'Servicio premium' },
                    ].map(({ icon, label }) => (
                      <div
                        key={label}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-400/20 bg-amber-400/8"
                      >
                        <span className="text-amber-400">{icon}</span>
                        <span className="font-mono-custom text-[9px] uppercase tracking-[0.18em] text-amber-400/80">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Suite grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SUITES.map(suite => (
                      <button
                        key={suite.id}
                        disabled={!suite.available}
                        className={
                          'relative rounded-2xl border p-4 text-left transition-all duration-200 ' +
                          (!suite.available
                            ? 'border-white/5 bg-white/[0.01] opacity-40 cursor-not-allowed'
                            : selectedSuiteId === suite.id
                            ? 'border-amber-400/60 bg-amber-400/10 active:scale-[0.98]'
                            : 'border-white/10 bg-white/[0.03] hover:border-amber-400/30 hover:bg-amber-400/5 active:scale-[0.98]')
                        }
                        onClick={() => suite.available && setSuiteId(suite.id)}
                      >
                        {!suite.available && (
                          <div className="absolute top-2 right-2">
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-mono-custom uppercase tracking-[0.15em] bg-red-500/20 text-red-400 border border-red-500/20">Reservada</span>
                          </div>
                        )}
                        {selectedSuiteId === suite.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                            <Check className="w-3 h-3 text-[#06090f]" />
                          </div>
                        )}
                        <div className="w-8 h-8 rounded-xl bg-amber-400/15 flex items-center justify-center mb-3">
                          <span className="font-display text-sm text-amber-400">{suite.id}</span>
                        </div>
                        <p className="font-display text-base text-white mb-0.5">{suite.label}</p>
                        <p className="font-mono-custom text-[9px] text-white/40">{suite.view}</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-end">
                    <button
                      disabled={!selectedSuiteId}
                      className="px-6 py-2.5 rounded-full bg-amber-400 text-[#06090f] font-display text-sm uppercase tracking-[0.2em] hover:bg-amber-300 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => selectedSuiteId && setStep(2)}
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Confirmar ── */}
              {step === 2 && selectedSuite && (
                <div>
                  <p className="font-mono-custom text-[10px] uppercase tracking-[0.3em] text-white/35 mb-2">Paso 2</p>
                  <h4 className="font-display text-3xl md:text-4xl text-white mb-1">Confirmar reserva</h4>
                  <p className="text-sm text-white/50 mb-5">Revisa el resumen antes de proceder al pago.</p>

                  <div className="rounded-2xl border border-amber-400/15 bg-white/[0.02] p-5 space-y-4">

                    {/* Suite info */}
                    <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                      <div className="w-12 h-12 rounded-2xl bg-amber-400/15 flex items-center justify-center shrink-0">
                        <span className="font-display text-xl text-amber-400">{selectedSuite.id}</span>
                      </div>
                      <div>
                        <h5 className="font-display text-xl text-white">{selectedSuite.label}</h5>
                        <p className="font-mono-custom text-[10px] text-white/40">{selectedSuite.view} · Guatapé · 3D/2N</p>
                      </div>
                    </div>

                    {/* Event grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        ['Evento', 'AIRA Guatapé'],
                        ['Capacidad', '2 personas (pareja)'],
                        ['Duración', '3 días · 2 noches'],
                        ['Check-in', 'Día 1 del evento'],
                      ] as [string,string][]).map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="font-mono-custom text-[9px] uppercase tracking-[0.22em] text-white/35 mb-1">{label}</p>
                          <p className="font-display text-sm text-white">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Includes */}
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="font-mono-custom text-[9px] uppercase tracking-[0.22em] text-white/35 mb-3">Incluye</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {[
                          'Hospedaje 2 noches',
                          'Jacuzzi privado',
                          'Terraza con vista',
                          'Recorrido Peñol & Guatapé',
                          'Yacht parties (3 días)',
                          'Yate Majestic',
                          'Noches de música',
                          'Open decks',
                          'Sesiones wellness',
                        ].map(item => (
                          <div key={item} className="flex items-center gap-2">
                            <Check className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="text-xs text-white/60">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Transport */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Bus className="w-4 h-4 text-white/40" />
                        <div>
                          <p className="text-sm text-white">Transporte Bogotá – Guatapé</p>
                          <p className="font-mono-custom text-[9px] text-white/40">Ida y regreso · por persona</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <span className="font-display text-sm text-white/70">{fmt(TRANSPORT_PRICE)}</span>
                        <input
                          type="checkbox"
                          checked={addTransport}
                          onChange={e => setAddTransport(e.target.checked)}
                          className="w-4 h-4"
                        />
                      </label>
                    </div>

                    {/* Qty (personas para transporte) */}
                    {addTransport && (
                      <div className="flex items-center justify-between">
                        <p className="font-mono-custom text-[9px] uppercase tracking-[0.22em] text-white/35">Personas para transporte</p>
                        <div className="flex items-center gap-1 rounded-full border border-white/10 p-1">
                          <button
                            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                            onClick={() => setQty(v => Math.max(1, v - 1))}
                          >
                            <Minus className="w-3.5 h-3.5 text-white/60" />
                          </button>
                          <span className="w-8 text-center font-mono-custom text-sm text-white">{qty}</span>
                          <button
                            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                            onClick={() => setQty(v => Math.min(2, v + 1))}
                          >
                            <Plus className="w-3.5 h-3.5 text-white/60" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Totals */}
                    <div className="space-y-2 border-t border-white/10 pt-4">
                      <div className="flex justify-between font-mono-custom text-sm text-white/55">
                        <span>Suite AIRA · pareja</span><span className="text-white">{fmt(SUITE_PRICE)}</span>
                      </div>
                      <div className="flex justify-between font-mono-custom text-sm text-white/55">
                        <span>Cargo de servicio (5%)</span><span className="text-white">{fmt(serviceFee)}</span>
                      </div>
                      {addTransport && (
                        <div className="flex justify-between font-mono-custom text-sm text-white/55">
                          <span>Transporte ×{qty}</span><span className="text-white/70">{fmt(transTotal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-white/10">
                        <span className="font-display text-xl text-white">Total</span>
                        <span className="font-display text-2xl text-amber-400">{fmt(total)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        className="px-5 py-2.5 rounded-full border border-white/10 text-white/70 text-sm hover:bg-white/5 transition-colors"
                        onClick={() => setStep(1)}
                      >
                        Volver
                      </button>
                      <button className="flex-1 min-w-[160px] px-6 py-2.5 rounded-full bg-amber-400 text-[#06090f] font-display text-sm uppercase tracking-[0.2em] hover:bg-amber-300 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
                        <Ticket className="w-4 h-4" />
                        Proceder al pago
                      </button>
                    </div>

                  </div>
                </div>
              )}

            </div>{/* end main panel */}

            {/* ════ SIDEBAR ════ */}
            <aside className="p-5 md:p-8 bg-white/[0.015] border-t lg:border-t-0 border-white/[0.05]">

              {/* Premium badge */}
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-400" fill="currentColor" />
                  <span className="font-mono-custom text-[9px] uppercase tracking-[0.25em] text-amber-400">Experiencia exclusiva</span>
                </div>
                <p className="font-display text-2xl text-white mb-1">{fmt(SUITE_PRICE)}</p>
                <p className="font-mono-custom text-[10px] text-white/40 mb-4">por pareja · todo incluido</p>
                <div className="space-y-2">
                  {[
                    { icon: <Bath className="w-3.5 h-3.5" />, text: '1 habitación · 1 baño completo' },
                    { icon: <Waves className="w-3.5 h-3.5" />, text: 'Jacuzzi + terraza privada' },
                    { icon: <Eye className="w-3.5 h-3.5" />, text: 'Vista a la represa' },
                    { icon: <Star className="w-3.5 h-3.5" fill="currentColor" />, text: 'Servicio y hospitalidad premium' },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-2">
                      <span className="text-amber-400/60">{icon}</span>
                      <span className="text-xs text-white/55">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="font-mono-custom text-[9px] uppercase tracking-[0.24em] text-white/35 mb-3">Disponibilidad</p>
                <div className="grid grid-cols-3 gap-2">
                  {SUITES.map(s => (
                    <div
                      key={s.id}
                      className={
                        'aspect-square rounded-xl flex flex-col items-center justify-center border ' +
                        (s.available
                          ? selectedSuiteId === s.id
                            ? 'border-amber-400/60 bg-amber-400/15'
                            : 'border-white/10 bg-white/[0.03]'
                          : 'border-white/5 bg-white/[0.01] opacity-40')
                      }
                    >
                      <span className={'font-display text-lg ' + (s.available ? (selectedSuiteId === s.id ? 'text-amber-400' : 'text-white/60') : 'text-white/20')}>
                        {s.id}
                      </span>
                      <span className={'font-mono-custom text-[8px] ' + (s.available ? 'text-white/30' : 'text-white/15')}>
                        {s.available ? 'libre' : 'reserv.'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuiteReserve;
