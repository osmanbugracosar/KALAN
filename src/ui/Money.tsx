import { formatMoney, formatSigned, type Kurus } from '../core/money';
import { cx } from './cx';

type Tone = 'default' | 'brand' | 'income' | 'expense' | 'debt' | 'savings' | 'muted' | 'auto';

const toneClass: Record<Exclude<Tone, 'auto'>, string> = {
  default: 'text-ink',
  brand: 'text-brand',
  income: 'text-income',
  expense: 'text-expense',
  debt: 'text-debt',
  savings: 'text-savings',
  muted: 'text-muted',
};

/** Para gösterimi. signed=true ise +/- ön ekiyle; tone renklendirmeyi belirler. */
export function Money({
  value,
  signed = false,
  tone = 'default',
  className,
}: {
  value: Kurus;
  signed?: boolean;
  tone?: Tone;
  className?: string;
}) {
  const resolved: Exclude<Tone, 'auto'> = tone === 'auto' ? (value > 0 ? 'income' : value < 0 ? 'expense' : 'muted') : tone;
  return (
    <span className={cx('tabular', toneClass[resolved], className)}>
      {signed ? formatSigned(value) : formatMoney(value)}
    </span>
  );
}
