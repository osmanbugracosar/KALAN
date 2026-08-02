import { describe, it, expect, beforeEach } from 'vitest';
import { validatePayment, deriveDebtStatus, isDebtCompleted } from './debt';
import { makeDebt, makeDebtPayment, resetIds } from '../test/factories';

beforeEach(() => resetIds());

describe('fazla ödeme engeli', () => {
  it('kalan borç kadar ödemeye izin verir', () => {
    const debt = makeDebt({ id: 1, total_repayment_amount: 2000000 });
    const existing = [makeDebtPayment({ debt_id: 1, amount: 250000 })]; // kalan 1.750.000
    const v = validatePayment(debt, existing, 1750000);
    expect(v.ok).toBe(true);
    expect(v.remainingAfter).toBe(0);
  });

  it('kalan borçtan fazla ödemeyi reddeder', () => {
    const debt = makeDebt({ id: 1, total_repayment_amount: 2000000 });
    const existing = [makeDebtPayment({ debt_id: 1, amount: 250000 })]; // kalan 1.750.000
    const v = validatePayment(debt, existing, 1800000);
    expect(v.ok).toBe(false);
    expect(v.maxAllowed).toBe(1750000);
    expect(v.message).toBeTruthy();
  });

  it('sıfır veya negatif ödemeyi reddeder', () => {
    const debt = makeDebt({ id: 1, total_repayment_amount: 100000 });
    expect(validatePayment(debt, [], 0).ok).toBe(false);
    expect(validatePayment(debt, [], -500).ok).toBe(false);
  });
});

describe('borç durumu', () => {
  it('kalan sıfırsa tamamlandı', () => {
    const debt = makeDebt({ id: 1, total_repayment_amount: 100000 });
    const payments = [makeDebtPayment({ debt_id: 1, amount: 100000 })];
    expect(deriveDebtStatus(debt, payments)).toBe('completed');
    expect(isDebtCompleted(debt, payments)).toBe(true);
  });

  it('son ödeme tarihi geçmişse gecikmiş', () => {
    const debt = makeDebt({ id: 1, total_repayment_amount: 100000, due_date: '2026-07-01' });
    expect(deriveDebtStatus(debt, [], '2026-07-15')).toBe('overdue');
  });

  it('son ödeme 7 gün içindeyse yaklaşıyor', () => {
    const debt = makeDebt({ id: 1, total_repayment_amount: 100000, due_date: '2026-07-18' });
    expect(deriveDebtStatus(debt, [], '2026-07-15')).toBe('due_soon');
  });

  it('uzak tarihli borç aktif', () => {
    const debt = makeDebt({ id: 1, total_repayment_amount: 100000, due_date: '2026-09-01' });
    expect(deriveDebtStatus(debt, [], '2026-07-15')).toBe('active');
  });

  it('dondurulmuş borç durumu korunur', () => {
    const debt = makeDebt({ id: 1, total_repayment_amount: 100000, status: 'frozen', due_date: '2026-07-01' });
    expect(deriveDebtStatus(debt, [], '2026-07-15')).toBe('frozen');
  });
});
