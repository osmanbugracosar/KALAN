import type { ReactNode } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, CalendarClock, ArrowUpRight, Sparkles, CheckCircle2 } from 'lucide-react';
import type { InsightSet } from '../../store/selectors';
import { Card, CardHeader } from '../../ui/Card';
import { Money } from '../../ui/Money';
import { cx } from '../../ui/cx';

type Tone = 'income' | 'expense' | 'warn' | 'debt' | 'muted' | 'brand';

interface Row {
  icon: ReactNode;
  tone: Tone;
  text: ReactNode;
}

const TONE_TEXT: Record<Tone, string> = {
  income: 'text-income',
  expense: 'text-expense',
  warn: 'text-warn',
  debt: 'text-debt',
  muted: 'text-muted',
  brand: 'text-brand',
};
const TONE_BG: Record<Tone, string> = {
  income: 'bg-income/10',
  expense: 'bg-expense/10',
  warn: 'bg-warn/10',
  debt: 'bg-debt/10',
  muted: 'bg-ink/5',
  brand: 'bg-brand/10',
};

export function InsightsPanel({ insights }: { insights: InsightSet }) {
  const rows: Row[] = [];
  const i = insights;

  // Gider — geçen aya kıyasla
  if (i.expenseDeltaPct != null && i.expenseDeltaPct !== 0) {
    const up = i.expenseDeltaPct > 0;
    rows.push({
      icon: up ? <TrendingUp size={15} /> : <TrendingDown size={15} />,
      tone: up ? 'expense' : 'income',
      text: up
        ? <>Bu ay geçen aya göre <b className="text-ink">%{i.expenseDeltaPct}</b> daha fazla harcadın.</>
        : <>Bu ay geçen aya göre <b className="text-ink">%{Math.abs(i.expenseDeltaPct)}</b> daha az harcadın — güzel gidiyor.</>,
    });
  }

  // Ay sonu tahmini (yalnızca içinde bulunulan ay)
  if (i.isCurrentMonth && i.daysElapsed < i.daysInMonth && i.expenseThis > 0) {
    rows.push({
      icon: <Sparkles size={15} />,
      tone: 'brand',
      text: <>Bu gidişle ay sonu gider tahmini: <Money value={i.projectionK} className="font-semibold text-ink" />.</>,
    });
  }

  // Ayın kalanında gelen sabit giderler
  if (i.upcomingFixedK > 0) {
    rows.push({
      icon: <CalendarClock size={15} />,
      tone: 'debt',
      text: <>Ayın kalanında <Money value={i.upcomingFixedK} className="font-semibold text-ink" /> tutarında düzenli ödeme seni bekliyor.</>,
    });
  }

  // En çok artan kategori
  if (i.topIncrease) {
    rows.push({
      icon: <ArrowUpRight size={15} />,
      tone: 'muted',
      text: <>Geçen aya göre en çok artış <b className="text-ink">{i.topIncrease.name}</b> kategorisinde (<Money value={i.topIncrease.deltaK} signed className="text-ink" />).</>,
    });
  }

  // Gelir — geçen aya kıyasla
  if (i.incomeDeltaPct != null && i.incomeDeltaPct !== 0) {
    const up = i.incomeDeltaPct > 0;
    rows.push({
      icon: up ? <TrendingUp size={15} /> : <TrendingDown size={15} />,
      tone: up ? 'income' : 'warn',
      text: up
        ? <>Gelirin geçen aya göre <b className="text-ink">%{i.incomeDeltaPct}</b> arttı.</>
        : <>Gelirin geçen aya göre <b className="text-ink">%{Math.abs(i.incomeDeltaPct)}</b> azaldı.</>,
    });
  }

  // Harcamasız günler
  if (i.isCurrentMonth && i.noSpendDays > 0) {
    rows.push({
      icon: <CheckCircle2 size={15} />,
      tone: 'income',
      text: <>Bu ay <b className="text-ink">{i.noSpendDays}</b> gün hiç harcama yapmadın.</>,
    });
  }

  return (
    <Card>
      <CardHeader title="İçgörüler" subtitle="Verinden çıkarımlar" action={<Lightbulb size={18} className="text-brand" />} />
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted py-4">
          Birkaç işlem ve bir-iki ay veri biriktikçe burada kişisel içgörüler (aylık karşılaştırma, ay sonu tahmini, gelen sabit giderler) göreceksin.
        </p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className={cx('grid place-items-center h-7 w-7 rounded-lg shrink-0 mt-0.5', TONE_BG[r.tone], TONE_TEXT[r.tone])}>{r.icon}</span>
              <p className="text-[13.5px] text-ink/85 leading-relaxed pt-1">{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
