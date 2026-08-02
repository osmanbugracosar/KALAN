import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { shortMonthLabelTR } from '../core/date';
import { formatMoney, kurusToLira, type Kurus } from '../core/money';
import { useThemeColors } from './useThemeColors';

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-line rounded-lg shadow-pop px-3 py-2 text-[12px]">
      {label && <div className="text-muted mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 tabular">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-ink">{p.name}:</span>
          <span className="font-medium text-ink">{formatMoney(Math.round((p.value as number) * 100))}</span>
        </div>
      ))}
    </div>
  );
}

/** Gelir / gider / borç ödemesi — aylık karşılaştırma (kuruş -> lira ekseni). */
export function IncomeExpenseChart({ data }: { data: { month: string; income: Kurus; expense: Kurus; debt: Kurus }[] }) {
  const c = useThemeColors();
  const rows = data.map((d) => ({
    ay: shortMonthLabelTR(d.month),
    Gelir: kurusToLira(d.income),
    Gider: kurusToLira(d.expense),
    Borç: kurusToLira(d.debt),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} barGap={2} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={c.line} />
        <XAxis dataKey="ay" tick={{ fill: c.muted, fontSize: 12 }} axisLine={{ stroke: c.line }} tickLine={false} />
        <YAxis tick={{ fill: c.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => new Intl.NumberFormat('tr-TR', { notation: 'compact' }).format(v)} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: c.muted, opacity: 0.06 }} />
        <Legend wrapperStyle={{ fontSize: 12, color: c.muted }} iconType="circle" iconSize={8} />
        <Bar dataKey="Gelir" fill={c.income} radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="Gider" fill={c.expense} radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="Borç" fill={c.debt} radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Kategori bazlı gider dağılımı (donut). */
export function CategoryDonut({ data }: { data: { name: string; color: string; amount: Kurus }[] }) {
  const c = useThemeColors();
  const rows = data.map((d) => ({ name: d.name, value: kurusToLira(d.amount), color: d.color }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2} stroke={c.surface} strokeWidth={2}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.color} />
          ))}
        </Pie>
        <Tooltip content={<TooltipBox />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Kalan borcun aylara göre azalışı (alan grafiği). */
export function DebtAreaChart({ data }: { data: { month: string; remaining: Kurus }[] }) {
  const c = useThemeColors();
  const rows = data.map((d) => ({ ay: shortMonthLabelTR(d.month), 'Kalan borç': kurusToLira(d.remaining) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={rows}>
        <defs>
          <linearGradient id="debtFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.debt} stopOpacity={0.35} />
            <stop offset="100%" stopColor={c.debt} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={c.line} />
        <XAxis dataKey="ay" tick={{ fill: c.muted, fontSize: 12 }} axisLine={{ stroke: c.line }} tickLine={false} />
        <YAxis tick={{ fill: c.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => new Intl.NumberFormat('tr-TR', { notation: 'compact' }).format(v)} />
        <Tooltip content={<TooltipBox />} />
        <Area type="monotone" dataKey="Kalan borç" stroke={c.debt} strokeWidth={2} fill="url(#debtFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
