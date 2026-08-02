import { useMemo, useState } from 'react';
import { Search, Plus, TrendingUp, TrendingDown, ArrowLeftRight, ArrowRightLeft } from 'lucide-react';
import { useSnapshot } from '../app/useSnapshot';
import { useUIStore } from '../store/useUIStore';
import { useModals } from '../app/useModals';
import { effective, accountMap, categoryMap } from '../store/selectors';
import { isInMonth, formatDateTR, weekdayNameTR, formatMonthYearTR } from '../core/date';
import { monthlyRealIncome, monthlyConsumptionExpense } from '../services/calculations';
import type { Transaction } from '../domain/types';
import { Card } from '../ui/Card';
import { Money } from '../ui/Money';
import { Button } from '../ui/Button';
import { Input } from '../ui/Field';
import { EmptyState } from '../ui/misc';
import { TransactionList } from './parts/TransactionList';
import { cx } from '../ui/cx';

type Filter = 'all' | 'income' | 'expense' | 'transfer' | 'other';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'income', label: 'Gelir' },
  { id: 'expense', label: 'Gider' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'other', label: 'Diğer' },
];

export function TransactionsPage() {
  const snap = useSnapshot();
  const mKey = useUIStore((s) => s.selectedMonth);
  const openTx = useModals((s) => s.openTx);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const amap = accountMap(snap);
  const cmap = categoryMap(snap);
  const eff = effective(snap);
  const monthTxns = eff.filter((t) => isInMonth(t.transaction_date, mKey));
  const income = monthlyRealIncome(monthTxns, mKey);
  const expense = monthlyConsumptionExpense(monthTxns, mKey);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    return monthTxns.filter((t) => {
      if (filter === 'income' && t.type !== 'income') return false;
      if (filter === 'expense' && t.type !== 'expense') return false;
      if (filter === 'transfer' && t.type !== 'transfer') return false;
      if (filter === 'other' && ['income', 'expense', 'transfer'].includes(t.type)) return false;
      if (q) {
        const cat = t.category_id != null ? cmap.get(t.category_id)?.name ?? '' : '';
        const hay = `${t.merchant ?? ''} ${t.note ?? ''} ${t.description ?? ''} ${cat}`.toLocaleLowerCase('tr');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [monthTxns, filter, query, cmap]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <div className="space-y-5">
      {/* Özet + hızlı ekle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openTx('income')}>
            <TrendingUp size={15} className="text-income" /> Gelir
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openTx('expense')}>
            <TrendingDown size={15} className="text-expense" /> Gider
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openTx('transfer')}>
            <ArrowLeftRight size={15} className="text-brand" /> Transfer
          </Button>
        </div>
        <div className="flex items-center gap-4 text-[13px]">
          <span className="text-muted">{formatMonthYearTR(mKey)}:</span>
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp size={14} className="text-income" /> <Money value={income} tone="income" className="font-semibold" />
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TrendingDown size={14} className="text-expense" /> <Money value={expense} tone="expense" className="font-semibold" />
          </span>
        </div>
      </div>

      <Card padded={false}>
        {/* Filtre çubuğu */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-line">
          <div className="flex gap-1 bg-elevate rounded-lg p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cx(
                  'px-3 h-8 rounded-md text-[13px] font-medium transition-colors',
                  filter === f.id ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input placeholder="İşletme, kategori veya notta ara…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ArrowRightLeft size={22} />}
            title={monthTxns.length === 0 ? 'Bu ay işlem yok' : 'Eşleşen işlem yok'}
            description={monthTxns.length === 0 ? 'Seçili ayda henüz bir hareket kaydedilmemiş.' : 'Filtre veya aramayı değiştirmeyi deneyin.'}
            action={monthTxns.length === 0 ? <Button onClick={() => openTx('expense')}><Plus size={16} /> İşlem ekle</Button> : undefined}
          />
        ) : (
          <div className="px-4 pb-2">
            {groups.map((g) => (
              <div key={g.day}>
                <div className="flex items-center justify-between pt-4 pb-1">
                  <span className="text-[12px] font-medium text-muted">
                    {formatDateTR(`${g.day}T00:00:00`)} · {weekdayNameTR(`${g.day}T00:00:00`)}
                  </span>
                  <span className="tabular text-[12px] text-muted">
                    <Money value={g.net} signed tone={g.net >= 0 ? 'income' : 'expense'} />
                  </span>
                </div>
                <TransactionList items={g.items} accountMap={amap} categoryMap={cmap} dense />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function groupByDay(items: Transaction[]): { day: string; items: Transaction[]; net: number }[] {
  const map = new Map<string, Transaction[]>();
  for (const t of items) {
    const day = t.transaction_date.slice(0, 10);
    const arr = map.get(day) ?? [];
    arr.push(t);
    map.set(day, arr);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, its]) => {
      let net = 0;
      for (const t of its) {
        if (t.type === 'income' || t.type === 'refund' || t.type === 'debt_inflow') net += t.amount;
        else if (t.type === 'expense' || t.type === 'debt_payment') net -= t.amount;
      }
      return { day, items: its, net };
    });
}
