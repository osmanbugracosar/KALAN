import type { Transaction, Account, Category } from '../../domain/types';
import { formatMoney } from '../../core/money';
import { formatDateTR } from '../../core/date';
import { txnVisual } from './txnDisplay';
import { cx } from '../../ui/cx';

const toneText: Record<string, string> = {
  income: 'text-income',
  expense: 'text-expense',
  debt: 'text-debt',
  savings: 'text-savings',
  brand: 'text-brand',
  muted: 'text-muted',
};
const toneBg: Record<string, string> = {
  income: 'bg-income/10 text-income',
  expense: 'bg-expense/10 text-expense',
  debt: 'bg-debt/10 text-debt',
  savings: 'bg-savings/10 text-savings',
  brand: 'bg-brand-soft text-brand',
  muted: 'bg-ink/6 text-muted',
};

export function TransactionList({
  items,
  accountMap,
  categoryMap,
  onSelect,
  dense = false,
}: {
  items: Transaction[];
  accountMap: Map<number, Account>;
  categoryMap: Map<number, Category>;
  onSelect?: (t: Transaction) => void;
  dense?: boolean;
}) {
  return (
    <ul className="divide-y divide-line">
      {items.map((t) => {
        const v = txnVisual(t);
        const Icon = v.icon;
        const cat = t.category_id != null ? categoryMap.get(t.category_id) : undefined;
        const acc = t.account_id != null ? accountMap.get(t.account_id) : undefined;
        const dest = t.destination_account_id != null ? accountMap.get(t.destination_account_id) : undefined;

        const primary = t.merchant || cat?.name || v.label;
        const secondaryBits: string[] = [];
        if (t.type === 'transfer' && acc && dest) secondaryBits.push(`${acc.name} → ${dest.name}`);
        else if (acc) secondaryBits.push(acc.name);
        if (cat && t.merchant) secondaryBits.push(cat.name);
        secondaryBits.push(formatDateTR(t.transaction_date));

        const sign = v.direction === 1 ? '+' : v.direction === -1 ? '−' : '';
        const amountStr = (sign ? sign : '') + formatMoney(t.amount).replace('₺', '₺');

        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={onSelect ? () => onSelect(t) : undefined}
              className={cx(
                'w-full flex items-center gap-3 text-left transition-colors',
                dense ? 'py-2.5' : 'py-3',
                onSelect ? 'hover:bg-ink/[0.025] cursor-pointer px-1 -mx-1 rounded-lg' : 'cursor-default',
              )}
            >
              <span className={cx('grid place-items-center h-9 w-9 rounded-lg shrink-0', toneBg[v.tone])}>
                <Icon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-ink truncate">{primary}</div>
                <div className="text-[12px] text-muted truncate">{secondaryBits.join(' · ')}</div>
              </div>
              <div className={cx('tabular text-[14px] font-semibold whitespace-nowrap', v.direction === 0 ? 'text-ink' : toneText[v.tone])}>
                {amountStr}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
