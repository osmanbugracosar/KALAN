import { useMemo, useState } from 'react';
import { BarChart3, Download, Printer, TrendingUp, TrendingDown, Landmark, PiggyBank, Store } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { useSnapshot } from '../app/useSnapshot';
import {
  effective, accountMap, categoryMap, last6Series, categoryDistribution,
} from '../store/selectors';
import { isInRange, presetToRange, todayLocalDate, addMonthsToDate, currentMonthKey, formatMonthYearTR, type DateRange } from '../core/date';
import { transactionsToCsv } from '../services/export';
import type { Kurus } from '../core/money';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatCard } from '../ui/StatCard';
import { EmptyState } from '../ui/misc';
import { Money } from '../ui/Money';
import { IncomeExpenseChart, CategoryDonut } from '../ui/charts';
import { cx } from '../ui/cx';

type RangeKey = 'thisMonth' | 'lastMonth' | 'thisYear' | 'all';

const RANGE_LABELS: Record<RangeKey, string> = {
  thisMonth: 'Bu ay',
  lastMonth: 'Geçen ay',
  thisYear: 'Bu yıl',
  all: 'Tümü',
};

function rangeFor(key: RangeKey): { range: DateRange; label: string } {
  const today = todayLocalDate();
  switch (key) {
    case 'lastMonth': {
      const prev = addMonthsToDate(`${currentMonthKey()}-01`, -1).slice(0, 7);
      const r = presetToRange('month', `${prev}-15`);
      return { range: r, label: formatMonthYearTR(prev) };
    }
    case 'thisYear':
      return { range: presetToRange('year', today), label: today.slice(0, 4) };
    case 'all':
      return { range: presetToRange('all', today), label: 'Tüm zamanlar' };
    case 'thisMonth':
    default:
      return { range: presetToRange('month', today), label: formatMonthYearTR(currentMonthKey()) };
  }
}

export function ReportsPage() {
  const s = useSnapshot();
  const pushToast = useUIStore((st) => st.pushToast);
  const [rangeKey, setRangeKey] = useState<RangeKey>('thisMonth');
  const { range, label } = rangeFor(rangeKey);

  const eff = effective(s);
  const amap = accountMap(s);
  const cmap = categoryMap(s);

  const inRange = useMemo(() => eff.filter((t) => isInRange(t.transaction_date, range)), [eff, range]);

  const summary = useMemo(() => {
    let income = 0, expense = 0, debtPaid = 0, savings = 0;
    for (const t of inRange) {
      if (t.type === 'income' || t.type === 'refund') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
      else if (t.type === 'debt_payment') debtPaid += t.amount;
      else if (t.type === 'savings_contribution') savings += t.amount;
    }
    return { income, expense, debtPaid, savings, net: income - expense - debtPaid - savings };
  }, [inRange]);

  const merchants = useMemo(() => {
    const map = new Map<string, Kurus>();
    for (const t of inRange) {
      if (t.type !== 'expense') continue;
      const key = t.merchant?.trim() || t.description?.trim() || 'Diğer';
      map.set(key, (map.get(key) ?? 0) + t.amount);
    }
    return [...map.entries()].map(([merchant, amount]) => ({ merchant, amount })).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [inRange]);

  const slices = useMemo(() => categoryDistribution(s, range), [s, range]);
  const series6 = useMemo(() => last6Series(s), [s]);

  const exportCsv = () => {
    if (inRange.length === 0) return pushToast('error', 'Bu dönemde dışa aktarılacak işlem yok.');
    const csv = transactionsToCsv(
      [...inRange].sort((a, b) => (a.transaction_date < b.transaction_date ? 1 : -1)),
      { accountName: (id) => (id != null ? amap.get(id)?.name ?? '' : ''), categoryName: (id) => (id != null ? cmap.get(id)?.name ?? '' : '') },
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalan-islemler-${range.start}_${range.end}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    pushToast('success', `${inRange.length} işlem CSV olarak indirildi.`);
  };

  const hasData = eff.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Raporlar & İçgörüler</h2>
          <p className="text-[13px] text-muted mt-0.5">{label} · {inRange.length} işlem</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportCsv}><Download size={15} /> CSV</Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={15} /> Yazdır / PDF</Button>
        </div>
      </div>

      {/* Dönem seçici */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setRangeKey(k)}
            className={cx('px-3.5 h-9 rounded-lg text-[13px] font-medium border transition-colors',
              rangeKey === k ? 'border-brand bg-brand text-white' : 'border-line text-muted hover:bg-ink/5')}
          >
            {RANGE_LABELS[k]}
          </button>
        ))}
      </div>

      {!hasData ? (
        <Card>
          <EmptyState icon={<BarChart3 size={26} />} title="Henüz veri yok" description="İşlem ekledikçe burada gelir, gider ve kategori analizlerini göreceksin." />
        </Card>
      ) : (
        <>
          {/* Özet */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Gelir" value={<Money value={summary.income} tone="income" />} icon={<TrendingUp size={18} />} accent="income" />
            <StatCard label="Gider" value={<Money value={summary.expense} tone="expense" />} icon={<TrendingDown size={18} />} accent="expense" />
            <StatCard label="Borç ödendi" value={<Money value={summary.debtPaid} tone="debt" />} icon={<Landmark size={18} />} accent="debt" />
            <StatCard label="Birikime ayrılan" value={<Money value={summary.savings} tone="savings" />} icon={<PiggyBank size={18} />} accent="savings" />
          </div>

          <Card padded>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] text-muted">Bu dönemde nakit değişimi</div>
                <div className="text-[12px] text-muted mt-0.5">Gelir − gider − borç ödemesi − birikim</div>
              </div>
              <Money value={summary.net} signed tone="auto" className="text-2xl font-bold" />
            </div>
          </Card>

          {/* Gelir/gider trendi */}
          <Card padded>
            <CardHeader title="Gelir & gider trendi" subtitle="Son 6 ay" />
            <IncomeExpenseChart data={series6} />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Kategori dağılımı */}
            <Card padded>
              <CardHeader title="Kategori dağılımı" subtitle={label} />
              {slices.length === 0 ? (
                <p className="text-[13px] text-muted py-8 text-center">Bu dönemde gider yok.</p>
              ) : (
                <>
                  <CategoryDonut data={slices.map((sl) => ({ name: sl.name, color: sl.color, amount: sl.amount }))} />
                  <div className="mt-4 space-y-2">
                    {slices.slice(0, 6).map((sl) => (
                      <div key={sl.categoryId} className="flex items-center gap-2.5 text-[13px]">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: sl.color }} />
                        <span className="text-ink flex-1 truncate">{sl.name}</span>
                        <Money value={sl.amount} className="text-muted" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            {/* En çok harcanan yerler */}
            <Card padded>
              <CardHeader title="En çok harcanan yerler" subtitle={label} action={<Store size={18} className="text-muted" />} />
              {merchants.length === 0 ? (
                <p className="text-[13px] text-muted py-8 text-center">Bu dönemde gider yok.</p>
              ) : (
                <div className="space-y-1">
                  {merchants.map((m, i) => {
                    const max = merchants[0].amount || 1;
                    return (
                      <div key={m.merchant} className="py-1.5">
                        <div className="flex items-center justify-between text-[13px] mb-1">
                          <span className="text-ink truncate flex items-center gap-2">
                            <span className="text-muted tabular w-4 text-right">{i + 1}</span>
                            {m.merchant}
                          </span>
                          <Money value={m.amount} className="text-ink font-medium shrink-0" />
                        </div>
                        <div className="h-1.5 rounded-full bg-ink/5 overflow-hidden ml-6">
                          <div className="h-full rounded-full bg-brand/60" style={{ width: `${Math.max(4, (m.amount / max) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
