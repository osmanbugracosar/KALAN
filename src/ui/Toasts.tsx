import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { cx } from './cx';

export function Toasts() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-[min(92vw,360px)]">
      {toasts.map((t) => {
        const tone = t.kind ?? 'info';
        const map = {
          success: { icon: <CheckCircle2 size={18} />, cls: 'text-income border-income/25' },
          error: { icon: <AlertTriangle size={18} />, cls: 'text-expense border-expense/25' },
          info: { icon: <Info size={18} />, cls: 'text-brand border-brand/25' },
        } as const;
        const m = map[tone];
        return (
          <div
            key={t.id}
            className={cx(
              'flex items-start gap-3 bg-surface border rounded-card shadow-pop px-4 py-3 animate-[slideUp_.18s_ease]',
              m.cls,
            )}
          >
            <span className="mt-0.5">{m.icon}</span>
            <p className="text-[13px] text-ink flex-1 leading-snug">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-muted hover:text-ink transition-colors" aria-label="Kapat">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
