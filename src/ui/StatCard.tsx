import type { ReactNode } from 'react';
import { cx } from './cx';

type Accent = 'brand' | 'income' | 'expense' | 'debt' | 'savings' | 'ink';

const accentText: Record<Accent, string> = {
  brand: 'text-brand',
  income: 'text-income',
  expense: 'text-expense',
  debt: 'text-debt',
  savings: 'text-savings',
  ink: 'text-ink',
};
const accentBg: Record<Accent, string> = {
  brand: 'bg-brand-soft text-brand',
  income: 'bg-income/10 text-income',
  expense: 'bg-expense/10 text-expense',
  debt: 'bg-debt/10 text-debt',
  savings: 'bg-savings/10 text-savings',
  ink: 'bg-ink/5 text-ink',
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = 'ink',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: Accent;
}) {
  return (
    <div className="bg-surface border border-line rounded-card shadow-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted font-medium">{label}</span>
        {icon && <span className={cx('grid place-items-center h-8 w-8 rounded-lg', accentBg[accent])}>{icon}</span>}
      </div>
      <div className={cx('text-[22px] font-semibold leading-tight tabular', accentText[accent])}>{value}</div>
      {hint && <div className="text-[12px] text-muted">{hint}</div>}
    </div>
  );
}
