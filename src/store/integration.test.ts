import { describe, it, expect } from 'vitest';
import { generateDemoData } from '../db/demoData';
import type { Snapshot } from './selectors';
import {
  overviewSummary, last6Series, categoryDistribution, debtOverMonths,
  upcomingPayments, effective, accountMap, categoryMap, healthScore,
  debtViews, savingsViews, topMerchants, dailySpend, budgetViews, dueRecurring,
} from './selectors';
import { currentMonthKey, daysInMonth } from '../core/date';

function snap(): Snapshot {
  const d = generateDemoData();
  return {
    user: { id: 1, name: 'x', currency: 'TRY', pin_hash: null, pin_salt: null, spending_limit: 2500000, created_at: '', updated_at: '' },
    accounts: d.accounts, categories: d.categories, transactions: d.transactions,
    transactionItems: d.transactionItems,
    debts: d.debts, debtPayments: d.debtPayments, savingsGoals: d.savingsGoals,
    budgets: d.budgets, recurring: d.recurring, settings: { currency: 'TRY' },
  };
}

describe('smoke: selectors over demo data', () => {
  const s = snap();
  const mKey = currentMonthKey();
  const range = { start: `${mKey}-01`, end: `${mKey}-${String(daysInMonth(mKey)).padStart(2,'0')}` };

  it('has demo data', () => {
    expect(s.accounts.length).toBeGreaterThan(0);
    expect(s.transactions.length).toBeGreaterThan(0);
  });
  it('overviewSummary runs', () => {
    const o = overviewSummary(s, mKey);
    expect(typeof o.totalMoney).toBe('number');
    expect(typeof o.netWorth).toBe('number');
  });
  it('chart selectors run', () => {
    expect(last6Series(s).length).toBe(6);
    expect(debtOverMonths(s).length).toBe(6);
    expect(Array.isArray(categoryDistribution(s, range))).toBe(true);
    expect(dailySpend(s, mKey).length).toBe(daysInMonth(mKey));
  });
  it('list selectors run', () => {
    expect(Array.isArray(upcomingPayments(s))).toBe(true);
    expect(effective(s).length).toBeGreaterThanOrEqual(s.transactions.length);
    expect(accountMap(s).size).toBe(s.accounts.length);
    expect(categoryMap(s).size).toBe(s.categories.length);
    expect(Array.isArray(topMerchants(s, mKey))).toBe(true);
  });
  it('debt & savings views run', () => {
    const dv = debtViews(s);
    for (const v of dv) { expect(v.remaining).toBeGreaterThanOrEqual(0); expect(v.progress).toBeGreaterThanOrEqual(0); expect(v.progress).toBeLessThanOrEqual(100); }
    expect(Array.isArray(savingsViews(s))).toBe(true);
  });
  it('budget & recurring views run', () => {
    const bv = budgetViews(s, mKey);
    expect(bv.length).toBe(s.budgets.length);
    for (const v of bv) {
      expect(v.usage.spentK).toBeGreaterThanOrEqual(0);
      expect(['ok', 'warn', 'critical', 'over']).toContain(v.usage.level);
    }
    const due = dueRecurring(s);
    expect(Array.isArray(due)).toBe(true);
    for (const r of due) expect(r.is_active).toBe(1);
  });
  it('healthScore in range', () => {
    const h = healthScore(s, mKey);
    expect(h.score).toBeGreaterThanOrEqual(0);
    expect(h.score).toBeLessThanOrEqual(100);
    expect(h.parts.length).toBe(4);
  });
});
