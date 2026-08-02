import { Wallet, TrendingUp, TrendingDown, Landmark, PiggyBank, Scale, CalendarClock, Sparkles, ArrowRight } from 'lucide-react';
import { useSnapshot } from '../app/useSnapshot';
import { useUIStore } from '../store/useUIStore';
import {
  overviewSummary,
  last6Series,
  categoryDistribution,
  upcomingPayments,
  effective,
  accountMap,
  categoryMap,
  healthScore,
  monthlyInsights,
} from '../store/selectors';
import { daysInMonth, formatDateTR, formatMonthYearTR } from '../core/date';
import { Card, CardHeader } from '../ui/Card';
import { StatCard } from '../ui/StatCard';
import { Money } from '../ui/Money';
import { Button } from '../ui/Button';
import { Progress, EmptyState, Badge } from '../ui/misc';
import { IncomeExpenseChart, CategoryDonut } from '../ui/charts';
import { TransactionList } from './parts/TransactionList';
import { InsightsPanel } from './parts/InsightsPanel';
import { formatMoney } from '../core/money';

export function OverviewPage() {
  const snap = useSnapshot();
  const mKey = useUIStore((s) => s.selectedMonth);
  const setPage = useUIStore((s) => s.setPage);

  const sum = overviewSummary(snap, mKey);
  const series = last6Series(snap);
  const range = { start: `${mKey}-01`, end: `${mKey}-${String(daysInMonth(mKey)).padStart(2, '0')}` };
  const dist = categoryDistribution(snap, range).slice(0, 6);
  const upcoming = upcomingPayments(snap, 5);
  const recent = effective(snap).slice(0, 6);
  const health = healthScore(snap, mKey);
  const insights = monthlyInsights(snap, mKey);
  const amap = accountMap(snap);
  const cmap = categoryMap(snap);

  const hasData = snap.accounts.length > 0 || snap.transactions.length > 0;

  if (!hasData) {
    return (
      <Card>
        <EmptyState
          icon={<Wallet size={22} />}
          title="Kalan'a hoş geldiniz"
          description="Başlamak için önce bir hesap ekleyin (nakit, banka, kart). Ardından gelir ve giderlerinizi girmeye başlayabilirsiniz."
          action={<Button onClick={() => setPage('accounts')}>Hesap ekle</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Üst özet kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Toplam para" accent="brand" icon={<Wallet size={17} />} value={<Money value={sum.totalMoney} tone="brand" />} hint="Tüm hesapların bakiyesi" />
        <StatCard
          label={`Gelir · ${formatMonthYearTR(mKey)}`}
          accent="income"
          icon={<TrendingUp size={17} />}
          value={<Money value={sum.income} tone="income" />}
          hint={sum.income === 0 ? 'Bu ay henüz gelir eklenmedi' : undefined}
        />
        <StatCard label="Gider · bu ay" accent="expense" icon={<TrendingDown size={17} />} value={<Money value={sum.expense} tone="expense" />} hint={`${sum.noSpendDays} gün harcama yok`} />
        <StatCard label="Net varlık" accent={sum.netWorth >= 0 ? 'ink' : 'expense'} icon={<Scale size={17} />} value={<Money value={sum.netWorth} tone={sum.netWorth >= 0 ? 'default' : 'expense'} />} hint="Para − kalan borç" />
      </div>

      {/* İkinci sıra: kullanılabilir, borç, birikim, nakit akışı */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Kullanılabilir" accent="ink" value={<Money value={sum.availableMoney} />} hint="Korumalı birikim ve yaklaşan ödemeler hariç" />
        <StatCard label="Toplam borç" accent="debt" icon={<Landmark size={17} />} value={<Money value={sum.totalDebt} tone="debt" />} hint="Tüm borçlarda kalan" />
        <StatCard label="Birikim · bu ay" accent="savings" icon={<PiggyBank size={17} />} value={<Money value={sum.savings} tone="savings" />} />
        <StatCard label="Nakit akışı · bu ay" accent={sum.cashDelta >= 0 ? 'income' : 'expense'} value={<Money value={sum.cashDelta} signed tone={sum.cashDelta >= 0 ? 'income' : 'expense'} />} hint="Gelir − gider − borç ödemesi" />
      </div>

      {/* Akıllı içgörüler */}
      <InsightsPanel insights={insights} />

      {/* Grafikler */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Gelir ve gider" subtitle="Son 6 ay" />
          <IncomeExpenseChart data={series} />
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Gider dağılımı" subtitle={formatMonthYearTR(mKey)} />
          {dist.length === 0 ? (
            <EmptyState title="Bu ay gider yok" description="Seçili ayda kategorilere ayrılmış bir gider bulunmuyor." />
          ) : (
            <>
              <CategoryDonut data={dist} />
              <ul className="mt-4 space-y-2">
                {dist.map((d) => (
                  <li key={d.categoryId} className="flex items-center gap-2.5 text-[13px]">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-ink/80 flex-1 truncate">{d.name}</span>
                    <span className="tabular text-ink font-medium">{formatMoney(d.amount)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      {/* Alt: sağlık + yaklaşan + son işlemler */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <Card className="xl:col-span-2">
          <CardHeader title="Para sağlığı" subtitle="Şeffaf puan · 0–100" action={<Sparkles size={18} className="text-brand" />} />
          <div className="flex items-end gap-3 mb-4">
            <div className="text-[40px] font-bold text-brand leading-none tabular">{health.score}</div>
            <div className="text-[13px] text-muted mb-1.5">/ 100</div>
          </div>
          <div className="space-y-3">
            {health.parts.map((p) => (
              <div key={p.label}>
                <div className="flex items-center justify-between text-[12.5px] mb-1">
                  <span className="text-ink/75">{p.label}</span>
                  <span className="tabular text-muted">{p.value}/{p.max}</span>
                </div>
                <Progress value={(p.value / p.max) * 100} tone="brand" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader
            title="Son işlemler"
            action={
              <button onClick={() => setPage('transactions')} className="text-[13px] text-brand font-medium inline-flex items-center gap-1 hover:gap-1.5 transition-all">
                Tümü <ArrowRight size={14} />
              </button>
            }
          />
          {recent.length === 0 ? (
            <EmptyState title="Henüz işlem yok" description="Sağ üstteki “Ekle” ile ilk işleminizi girin." />
          ) : (
            <TransactionList items={recent} accountMap={amap} categoryMap={cmap} dense />
          )}
        </Card>
      </div>

      {/* Yaklaşan ödemeler */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader title="Yaklaşan ödemeler" subtitle="Zorunlu düzenli ödemeler ve borç taksitleri" action={<CalendarClock size={18} className="text-muted" />} />
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map((u) => (
              <li key={u.id} className="flex items-center gap-3 rounded-lg border border-line bg-elevate/50 p-3">
                <span className="grid place-items-center h-9 w-9 rounded-lg bg-debt/10 text-debt shrink-0">
                  {u.kind === 'debt' ? <Landmark size={16} /> : <CalendarClock size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium text-ink truncate">{u.label}</div>
                  <div className="text-[12px] text-muted">{formatDateTR(`${u.date}T00:00:00`)}</div>
                </div>
                <Badge tone="debt">{formatMoney(u.amount)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
