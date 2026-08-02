import type { ReactNode } from 'react';
import { cx } from './cx';

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {icon && <div className="grid place-items-center h-12 w-12 rounded-xl bg-brand-soft text-brand mb-3">{icon}</div>}
      <p className="text-ink font-medium">{title}</p>
      {description && <p className="text-[13px] text-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Progress({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'income' | 'expense' | 'debt' | 'savings' | 'warn'; className?: string }) {
  const bg: Record<string, string> = {
    brand: 'bg-brand',
    income: 'bg-income',
    expense: 'bg-expense',
    debt: 'bg-debt',
    savings: 'bg-savings',
    warn: 'bg-warn',
  };
  return (
    <div className={cx('h-2 rounded-full bg-line overflow-hidden', className)}>
      <div className={cx('h-full rounded-full transition-[width] duration-500', bg[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

type BadgeTone = 'brand' | 'income' | 'expense' | 'debt' | 'savings' | 'muted' | 'warn';
export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: BadgeTone }) {
  const cls: Record<BadgeTone, string> = {
    brand: 'bg-brand-soft text-brand',
    income: 'bg-income/12 text-income',
    expense: 'bg-expense/12 text-expense',
    debt: 'bg-debt/12 text-debt',
    savings: 'bg-savings/12 text-savings',
    warn: 'bg-warn/12 text-warn',
    muted: 'bg-ink/6 text-muted',
  };
  return <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium', cls[tone])}>{children}</span>;
}
