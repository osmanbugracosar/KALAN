/**
 * Seçiciler — sayfaların gösterdiği hesaplanmış metrik ve grafik verileri.
 * Tümü test edilmiş saf hesaplama motoruna dayanır.
 */

import type { Account, Budget, Category, Debt, DebtPayment, RecurringTransaction, SavingsGoal, Transaction, TransactionItem, User } from '../domain/types';
import type { Kurus } from '../core/money';
import {
  currentMonthKey,
  dayKey,
  daysInMonth,
  daysElapsedInMonth,
  daysBetween,
  addMonthsToDate,
  isInMonth,
  monthsBack,
  isInRange,
  presetToRange,
  todayLocalDate,
  type DateRange,
} from '../core/date';
import { effectiveTransactions } from '../db/mapping';
import {
  availableBalance,
  debtProgressPercent,
  debtRemaining,
  expenseByCategory,
  incomeExpenseByMonth,
  monthlyConsumptionExpense,
  monthlyDebtPaid,
  monthlyRealIncome,
  monthlySavings,
  netWorth,
  noSpendDaysInMonth,
  protectedBalance,
  savingsRate,
  spendByMerchant,
  totalBalance,
  totalRemainingDebt,
} from '../services/calculations';
import { deriveDebtStatus } from '../services/debt';
import { savingsMetrics, budgetUsage } from '../services/budget';

export interface Snapshot {
  user: User | null;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  transactionItems: TransactionItem[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  savingsGoals: SavingsGoal[];
  budgets: Budget[];
  recurring: RecurringTransaction[];
  settings: Record<string, string>;
}

export function effective(s: Snapshot): Transaction[] {
  return effectiveTransactions(s.transactions, s.debtPayments);
}

export function categoryMap(s: Snapshot): Map<number, Category> {
  const m = new Map<number, Category>();
  for (const c of s.categories) m.set(c.id, c);
  return m;
}

export function accountMap(s: Snapshot): Map<number, Account> {
  const m = new Map<number, Account>();
  for (const a of s.accounts) m.set(a.id, a);
  return m;
}

/** İşlem kimliğine göre kalem listesi (detaylı giderler için). */
export function itemsByTxn(s: Snapshot): Map<number, TransactionItem[]> {
  const m = new Map<number, TransactionItem[]>();
  for (const it of s.transactionItems) {
    const arr = m.get(it.transaction_id);
    if (arr) arr.push(it);
    else m.set(it.transaction_id, [it]);
  }
  return m;
}

/** Bu ay zorunlu yaklaşan ödemeler (bekleyen düzenli giderler). */
export function reservedUpcoming(s: Snapshot, mKey = currentMonthKey()): Kurus {
  let total = 0;
  for (const r of s.recurring) {
    if (r.is_active === 1 && r.status === 'pending' && r.type === 'expense' && isInMonth(`${r.next_due_date}T00:00:00`, mKey)) {
      total += r.amount;
    }
  }
  return total;
}

export interface OverviewSummary {
  totalMoney: Kurus;
  availableMoney: Kurus;
  income: Kurus;
  expense: Kurus;
  debtPaid: Kurus;
  totalDebt: Kurus;
  savings: Kurus;
  netWorth: Kurus;
  cashDelta: Kurus;
  remainingBudget: Kurus | null;
  budgetLimit: Kurus | null;
  savingsRate: number | null;
  noSpendDays: number;
}

export function overviewSummary(s: Snapshot, mKey = currentMonthKey()): OverviewSummary {
  const eff = effective(s);
  const total = totalBalance(s.accounts, eff);
  const protectedK = protectedBalance(s.accounts, eff);
  const reserved = reservedUpcoming(s, mKey);
  const income = monthlyRealIncome(eff, mKey);
  const expense = monthlyConsumptionExpense(eff, mKey);
  const debtPaid = monthlyDebtPaid(eff, mKey);

  const limit = budgetLimitK(s);
  const remainingBudget = limit == null ? null : limit - expense;

  return {
    totalMoney: total,
    availableMoney: availableBalance(total, reserved, protectedK),
    income,
    expense,
    debtPaid,
    totalDebt: totalRemainingDebt(s.debts, s.debtPayments),
    savings: monthlySavings(eff, mKey),
    netWorth: netWorth(s.accounts, eff, s.debts, s.debtPayments),
    cashDelta: income - expense - debtPaid,
    remainingBudget,
    budgetLimit: limit,
    savingsRate: savingsRate(eff, mKey),
    noSpendDays: noSpendDaysInMonth(eff, mKey),
  };
}

/** Aylık genel harcama sınırı (kullanıcı sınırı veya manuel bütçe). */
export function budgetLimitK(s: Snapshot): Kurus | null {
  if (s.user?.spending_limit != null) return s.user.spending_limit;
  const manual = s.budgets.find((b) => b.method === 'manual_limit' && b.is_active === 1);
  return manual ? manual.limit_amount : null;
}

/** Son 6 ayın gelir/gider/borç serisi (grafik). */
export function last6Series(s: Snapshot) {
  const eff = effective(s);
  return incomeExpenseByMonth(eff, monthsBack(6));
}

/** Aylara göre kalan borç değişimi — o ayın sonuna kadar yapılan ödemelere göre. */
export function debtOverMonths(s: Snapshot) {
  const keys = monthsBack(6);
  return keys.map((k) => {
    const cutoff = `${k}-31`;
    let remaining = 0;
    for (const d of s.debts) {
      const paymentsUpTo = s.debtPayments.filter((p) => p.debt_id === d.id && p.payment_date <= cutoff);
      const started = d.start_date.slice(0, 7) <= k;
      if (started) remaining += debtRemaining(d, paymentsUpTo);
    }
    return { month: k, remaining };
  });
}

export interface CategorySlice {
  categoryId: number;
  name: string;
  color: string;
  amount: Kurus;
}

/** Kategori bazlı gider dağılımı (dönem). */
export function categoryDistribution(s: Snapshot, range: DateRange): CategorySlice[] {
  const eff = effective(s);
  const cmap = categoryMap(s);
  const totals = new Map<number, Kurus>();
  for (const t of eff) {
    if (t.type !== 'expense' || !isInRange(t.transaction_date, range)) continue;
    const key = t.category_id ?? -1;
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }
  const slices: CategorySlice[] = [];
  for (const [id, amount] of totals) {
    const c = cmap.get(id);
    slices.push({ categoryId: id, name: c?.name ?? 'Diğer', color: c?.color ?? '#6B7280', amount });
  }
  return slices.sort((a, b) => b.amount - a.amount);
}

/** Ay içi günlük harcama serisi. */
export function dailySpend(s: Snapshot, mKey = currentMonthKey()) {
  const eff = effective(s);
  const dim = new Date(parseInt(mKey.slice(0, 4)), parseInt(mKey.slice(5, 7)), 0).getDate();
  const totals = new Array(dim).fill(0) as number[];
  for (const t of eff) {
    if (t.type === 'expense' && isInMonth(t.transaction_date, mKey)) {
      const day = parseInt(dayKey(t.transaction_date).slice(8, 10), 10);
      totals[day - 1] += t.amount;
    }
  }
  return totals.map((amount, i) => ({ day: i + 1, amount }));
}

/** En çok harcanan işletmeler. */
export function topMerchants(s: Snapshot, mKey: string, n = 5): { merchant: string; amount: Kurus }[] {
  const eff = effective(s).filter((t) => isInMonth(t.transaction_date, mKey));
  const map = spendByMerchant(eff);
  return [...map.entries()].map(([merchant, amount]) => ({ merchant, amount })).sort((a, b) => b.amount - a.amount).slice(0, n);
}

export interface DebtView {
  debt: Debt;
  remaining: Kurus;
  paidTotal: Kurus;
  progress: number;
  status: ReturnType<typeof deriveDebtStatus>;
}

export function debtViews(s: Snapshot): DebtView[] {
  return s.debts.map((debt) => {
    const remaining = debtRemaining(debt, s.debtPayments);
    return {
      debt,
      remaining,
      paidTotal: debt.total_repayment_amount - remaining,
      progress: debtProgressPercent(debt, s.debtPayments),
      status: deriveDebtStatus(debt, s.debtPayments),
    };
  });
}

export interface SavingsView {
  goal: SavingsGoal;
  saved: Kurus;
  metrics: ReturnType<typeof savingsMetrics>;
}

export function savingsViews(s: Snapshot): SavingsView[] {
  const eff = effective(s);
  return s.savingsGoals.map((goal) => {
    let saved = 0;
    for (const t of eff) {
      if (t.type === 'savings_contribution' && t.savings_goal_id === goal.id) saved += t.amount;
    }
    return { goal, saved, metrics: savingsMetrics(goal, saved) };
  });
}

/* --------------------------- Bütçeler --------------------------- */
export interface BudgetView {
  budget: Budget;
  spent: Kurus;
  categoryName: string | null;
  usage: ReturnType<typeof budgetUsage>;
}

/** Her bütçe için dönemsel kullanım (kategori bazlı veya genel). */
export function budgetViews(s: Snapshot, mKey = currentMonthKey()): BudgetView[] {
  const eff = effective(s);
  const cmap = categoryMap(s);
  const today = todayLocalDate();

  return s.budgets.map((b) => {
    let range: DateRange;
    let total: number;
    let elapsed: number;

    if (b.period === 'weekly') {
      range = presetToRange('week', today);
      total = 7;
      elapsed = today > range.end ? 7 : Math.max(1, Math.min(7, daysBetween(range.start, today) + 1));
    } else {
      range = { start: `${mKey}-01`, end: `${mKey}-${String(daysInMonth(mKey)).padStart(2, '0')}` };
      total = daysInMonth(mKey);
      elapsed = daysElapsedInMonth(mKey, today);
    }

    let spent = 0;
    for (const t of eff) {
      if (t.type !== 'expense') continue;
      if (t.include_in_budget === 0) continue;
      if (!isInRange(t.transaction_date, range)) continue;
      if (b.category_id != null && t.category_id !== b.category_id) continue;
      spent += t.amount;
    }

    const categoryName = b.category_id != null ? cmap.get(b.category_id)?.name ?? 'Bilinmeyen kategori' : null;
    return { budget: b, spent, categoryName, usage: budgetUsage(b.limit_amount, spent, elapsed, total) };
  });
}

/* --------------------------- Düzenli ödemeler --------------------------- */
/** Vadesi gelmiş (bugüne kadar) aktif düzenli ödemeler. */
export function dueRecurring(s: Snapshot, asOf = todayLocalDate()): RecurringTransaction[] {
  return s.recurring
    .filter((r) => r.is_active === 1 && dayKey(r.next_due_date) <= asOf)
    .sort((a, b) => (a.next_due_date < b.next_due_date ? -1 : 1));
}

export interface UpcomingItem {
  id: string;
  label: string;
  date: string;
  amount: Kurus;
  kind: 'recurring' | 'debt';
}

/* --------------------------- Akıllı içgörüler --------------------------- */
export interface InsightSet {
  mKey: string;
  daysElapsed: number;
  daysInMonth: number;
  isCurrentMonth: boolean;
  expenseThis: Kurus;
  expenseLast: Kurus;
  expenseDeltaPct: number | null;
  incomeThis: Kurus;
  incomeLast: Kurus;
  incomeDeltaPct: number | null;
  projectionK: Kurus;
  upcomingFixedK: Kurus;
  topIncrease: { name: string; deltaK: Kurus } | null;
  noSpendDays: number;
}

/** Ay bazlı içgörüler: geçen aya karşılaştırma, ay sonu tahmini, gelen sabit giderler. */
export function monthlyInsights(s: Snapshot, mKey = currentMonthKey()): InsightSet {
  const eff = effective(s);
  const cmap = categoryMap(s);
  const today = todayLocalDate();
  const prevKey = addMonthsToDate(`${mKey}-01`, -1).slice(0, 7);

  const expenseThis = monthlyConsumptionExpense(eff, mKey);
  const expenseLast = monthlyConsumptionExpense(eff, prevKey);
  const incomeThis = monthlyRealIncome(eff, mKey);
  const incomeLast = monthlyRealIncome(eff, prevKey);
  const pct = (now: number, prev: number): number | null => (prev > 0 ? Math.round(((now - prev) / prev) * 100) : null);

  const dim = daysInMonth(mKey);
  const elapsed = daysElapsedInMonth(mKey, today);
  const isCurrentMonth = mKey === currentMonthKey();
  const projectionK = isCurrentMonth && elapsed > 0 ? Math.round((expenseThis / elapsed) * dim) : expenseThis;

  // Bu ay içinde henüz gelmemiş sabit (düzenli) giderler
  let upcomingFixedK = 0;
  for (const r of s.recurring) {
    if (r.is_active !== 1 || r.type !== 'expense') continue;
    const due = dayKey(r.next_due_date);
    if (isInMonth(due, mKey) && due >= today) upcomingFixedK += r.amount;
  }

  // Geçen aya göre en çok artan kategori
  const thisByCat = expenseByCategory(eff, (t) => isInMonth(t.transaction_date, mKey));
  const lastByCat = expenseByCategory(eff, (t) => isInMonth(t.transaction_date, prevKey));
  let topIncrease: { name: string; deltaK: Kurus } | null = null;
  for (const [cat, amt] of thisByCat) {
    if (cat < 0) continue;
    const delta = amt - (lastByCat.get(cat) ?? 0);
    if (delta > 0 && (!topIncrease || delta > topIncrease.deltaK)) {
      topIncrease = { name: cmap.get(cat)?.name ?? 'Kategori', deltaK: delta };
    }
  }

  return {
    mKey, daysElapsed: elapsed, daysInMonth: dim, isCurrentMonth,
    expenseThis, expenseLast, expenseDeltaPct: pct(expenseThis, expenseLast),
    incomeThis, incomeLast, incomeDeltaPct: pct(incomeThis, incomeLast),
    projectionK, upcomingFixedK, topIncrease,
    noSpendDays: noSpendDaysInMonth(eff, mKey),
  };
}

/** Yaklaşan zorunlu ödemeler (düzenli ödemeler + borç son tarihleri). */
export function upcomingPayments(s: Snapshot, limit = 5): UpcomingItem[] {
  const items: UpcomingItem[] = [];
  for (const r of s.recurring) {
    if (r.is_active === 1 && r.status === 'pending' && r.type === 'expense') {
      items.push({ id: `r-${r.id}`, label: r.name, date: r.next_due_date, amount: r.amount, kind: 'recurring' });
    }
  }
  for (const v of debtViews(s)) {
    if (v.remaining > 0 && v.debt.due_date && v.debt.planned_payment_amount) {
      items.push({ id: `d-${v.debt.id}`, label: `${v.debt.name} taksiti`, date: v.debt.due_date, amount: Math.min(v.debt.planned_payment_amount, v.remaining), kind: 'debt' });
    }
  }
  return items.sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, limit);
}

/** 0–100 Para Sağlığı puanı (şeffaf; alt bileşenlerle). */
export interface HealthScore {
  score: number;
  parts: { label: string; value: number; max: number }[];
}
export function healthScore(s: Snapshot, mKey = currentMonthKey()): HealthScore {
  const sum = overviewSummary(s, mKey);
  const parts: { label: string; value: number; max: number }[] = [];

  // Bütçeye uyum (25)
  let budgetPart = 25;
  if (sum.budgetLimit != null && sum.budgetLimit > 0) {
    const usage = sum.expense / sum.budgetLimit;
    budgetPart = Math.round(Math.max(0, Math.min(1, 1.25 - usage)) * 25);
  }
  parts.push({ label: 'Bütçeye uyum', value: budgetPart, max: 25 });

  // Pozitif nakit akışı (25)
  const cashPart = sum.income > 0 ? (sum.cashDelta >= 0 ? 25 : Math.max(0, 25 + Math.round((sum.cashDelta / sum.income) * 25))) : 12;
  parts.push({ label: 'Nakit akışı', value: cashPart, max: 25 });

  // Borç yükü (25) — net varlığa göre
  let debtPart = 25;
  if (sum.totalDebt > 0) {
    const ratio = sum.totalDebt / Math.max(1, sum.totalMoney + sum.totalDebt);
    debtPart = Math.round((1 - ratio) * 25);
  }
  parts.push({ label: 'Borç yükü', value: debtPart, max: 25 });

  // Birikim gelişimi (25)
  const savingsPart = sum.savings > 0 ? 25 : sum.totalMoney > 0 ? 12 : 6;
  parts.push({ label: 'Birikim', value: savingsPart, max: 25 });

  const score = parts.reduce((a, p) => a + p.value, 0);
  return { score: Math.max(0, Math.min(100, score)), parts };
}
