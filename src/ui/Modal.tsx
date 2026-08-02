import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from './cx';

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const width = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-[fadeIn_.15s_ease]" onClick={onClose} />
      <div className={cx('relative bg-surface border border-line rounded-card shadow-pop w-full my-8', width)}>
        <div className="flex items-start justify-between gap-4 p-5 border-b border-line">
          <div>
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            {subtitle && <p className="text-[13px] text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="grid place-items-center h-8 w-8 rounded-lg text-muted hover:bg-ink/5 hover:text-ink transition-colors" aria-label="Kapat">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 p-4 border-t border-line bg-elevate/50 rounded-b-card">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
