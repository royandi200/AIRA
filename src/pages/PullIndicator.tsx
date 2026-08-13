import { RefreshCw } from 'lucide-react';

/** Indicador visual del gesto "deslizar para refrescar" — crece con el pull, gira el ícono */
export default function PullIndicator({ pull, progress, refreshing }: { pull: number; progress: number; refreshing: boolean }) {
  if (pull <= 0 && !refreshing) return null;
  return (
    <div className="ptr-indicator" style={{ height: refreshing ? 54 : pull }}>
      <RefreshCw
        size={18}
        className={`ptr-icon ${refreshing ? 'is-spinning' : ''}`}
        style={refreshing ? undefined : { transform: `rotate(${progress * 360}deg)`, opacity: progress }}
      />
    </div>
  );
}
