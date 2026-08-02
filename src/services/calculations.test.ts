import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeBalances,
  totalBalance,
  protectedBalance,
  accountBalance,
  monthlyRealIncome,
  monthlyConsumptionExpense,
  monthlyDebtPaid,
  monthlySavings,
  monthlyCashOutflow,
  monthlyCashDelta,
  savingsRate,
  debtRemaining,
  totalRemainingDebt,
  netWorth,
  availableBalance,
  itemsSumDifference,
  itemsSumMatches,
} from './calculations';
import { makeAccount, makeTransaction, makeDebt, makeDebtPayment, resetIds } from '../test/factories';

const M = '2026-07';

beforeEach(() => resetIds());

describe('hesap bakiyeleri', () => {
  it('gelir hesaba eklenir, gider düşer', () => {
    const acc = makeAccount({ id: 1, initial_balance: 100000 });
    const txns = [
      makeTransaction({ type: 'income', account_id: 1, amount: 50000 }),
      makeTransaction({ type: 'expense', account_id: 1, amount: 20000 }),
    ];
    expect(accountBalance(acc, txns)).toBe(130000);
  });

  it('transfer parayı hesaplar arası taşır, toplamı değiştirmez', () => {
    const a = makeAccount({ id: 1, initial_balance: 100000 });
    const b = makeAccount({ id: 2, initial_balance: 0 });
    const txns = [makeTransaction({ type: 'transfer', account_id: 1, destination_account_id: 2, amount: 40000 })];
    const balances = computeBalances([a, b], txns);
    expect(balances.get(1)).toBe(60000);
    expect(balances.get(2)).toBe(40000);
    expect(totalBalance([a, b], txns)).toBe(100000); // toplam değişmedi
  });

  it('pasif hesap toplam paraya dahil edilmez', () => {
    const a = makeAccount({ id: 1, initial_balance: 100000, is_active: 1 });
    const b = makeAccount({ id: 2, initial_balance: 50000, is_active: 0 });
    expect(totalBalance([a, b], [])).toBe(100000);
  });

  it('korumalı birikim bakiyesi ayrı hesaplanır', () => {
    const a = makeAccount({ id: 1, initial_balance: 100000 });
    const s = makeAccount({ id: 2, type: 'savings', initial_balance: 30000, is_protected: 1 });
    expect(protectedBalance([a, s], [])).toBe(30000);
  });
});

describe('aylık akışlar', () => {
  it('gerçek gelir yalnızca income türünü sayar', () => {
    const txns = [
      makeTransaction({ type: 'income', amount: 500000, transaction_date: `${M}-05T10:00:00` }),
      makeTransaction({ type: 'income', amount: 150000, transaction_date: `${M}-20T10:00:00` }),
      makeTransaction({ type: 'debt_inflow', amount: 2000000, transaction_date: `${M}-06T10:00:00` }),
      makeTransaction({ type: 'refund', amount: 5000, transaction_date: `${M}-07T10:00:00` }),
    ];
    expect(monthlyRealIncome(txns, M)).toBe(650000);
  });

  it('borç kaynaklı para girişi gelir sayılmaz', () => {
    const acc = makeAccount({ id: 1, initial_balance: 0 });
    const txns = [makeTransaction({ type: 'debt_inflow', account_id: 1, amount: 2000000, transaction_date: `${M}-06T10:00:00` })];
    expect(monthlyRealIncome(txns, M)).toBe(0); // gelir değil
    expect(accountBalance(acc, txns)).toBe(2000000); // ama hesaba eklendi
  });

  it('tüketim gideri borç ödemesi ve birikimi saymaz', () => {
    const txns = [
      makeTransaction({ type: 'expense', amount: 84540, transaction_date: `${M}-10T10:00:00` }),
      makeTransaction({ type: 'expense', amount: 30000, transaction_date: `${M}-11T10:00:00` }),
      makeTransaction({ type: 'debt_payment', amount: 250000, transaction_date: `${M}-12T10:00:00` }),
      makeTransaction({ type: 'savings_contribution', amount: 100000, transaction_date: `${M}-13T10:00:00` }),
    ];
    expect(monthlyConsumptionExpense(txns, M)).toBe(114540);
    expect(monthlyDebtPaid(txns, M)).toBe(250000);
    expect(monthlySavings(txns, M)).toBe(100000);
  });

  it('birikime aktarma normal gider sayılmaz ama hesaptan düşer', () => {
    const main = makeAccount({ id: 1, initial_balance: 200000 });
    const sav = makeAccount({ id: 2, type: 'savings', initial_balance: 0 });
    const txns = [makeTransaction({ type: 'savings_contribution', account_id: 1, destination_account_id: 2, amount: 100000, transaction_date: `${M}-13T10:00:00` })];
    expect(monthlyConsumptionExpense(txns, M)).toBe(0);
    const bal = computeBalances([main, sav], txns);
    expect(bal.get(1)).toBe(100000);
    expect(bal.get(2)).toBe(100000);
  });

  it('nakit çıkışı ve nakit farkı', () => {
    const txns = [
      makeTransaction({ type: 'income', amount: 500000, transaction_date: `${M}-05T10:00:00` }),
      makeTransaction({ type: 'expense', amount: 120000, transaction_date: `${M}-10T10:00:00` }),
      makeTransaction({ type: 'debt_payment', amount: 250000, transaction_date: `${M}-12T10:00:00` }),
    ];
    expect(monthlyCashOutflow(txns, M)).toBe(370000);
    expect(monthlyCashDelta(txns, M)).toBe(130000);
  });

  it('gelir sıfırken tasarruf oranı null (sıfıra bölme yok)', () => {
    const txns = [makeTransaction({ type: 'expense', amount: 50000, transaction_date: `${M}-10T10:00:00` })];
    expect(monthlyRealIncome(txns, M)).toBe(0);
    expect(savingsRate(txns, M)).toBeNull();
  });

  it('gelir varken tasarruf oranı hesaplanır', () => {
    const txns = [
      makeTransaction({ type: 'income', amount: 100000, transaction_date: `${M}-05T10:00:00` }),
      makeTransaction({ type: 'expense', amount: 25000, transaction_date: `${M}-10T10:00:00` }),
    ];
    expect(savingsRate(txns, M)).toBe(75);
  });

  it('farklı aydaki işlemler sayılmaz', () => {
    const txns = [
      makeTransaction({ type: 'income', amount: 100000, transaction_date: '2026-06-30T10:00:00' }),
      makeTransaction({ type: 'income', amount: 200000, transaction_date: `${M}-01T10:00:00` }),
    ];
    expect(monthlyRealIncome(txns, M)).toBe(200000);
  });
});

describe('borç ve net varlık', () => {
  it('kalan borç = toplam geri ödeme - önceden ödenen - kayıtlı ödemeler', () => {
    const debt = makeDebt({ id: 1, total_repayment_amount: 2000000, previously_paid_amount: 0 });
    const payments = [makeDebtPayment({ debt_id: 1, amount: 250000 })];
    expect(debtRemaining(debt, payments)).toBe(1750000); // 20.000 - 2.500 = 17.500
  });

  it('ödeme düzenlenince kalan yeniden hesaplanır', () => {
    const debt = makeDebt({ id: 1, total_repayment_amount: 2000000 });
    // ödeme 2.500 -> 3.000 olarak düzeltildi
    const edited = [makeDebtPayment({ id: 5, debt_id: 1, amount: 300000 })];
    expect(debtRemaining(debt, edited)).toBe(1700000); // 17.000
  });

  it('ödeme silinince kalan geri yükselir', () => {
    const debt = makeDebt({ id: 1, total_repayment_amount: 2000000 });
    expect(debtRemaining(debt, [])).toBe(2000000); // 20.000
  });

  it('önceden ödenen tutar hesaba katılır', () => {
    const debt = makeDebt({ id: 1, total_repayment_amount: 2000000, previously_paid_amount: 500000 });
    const payments = [makeDebtPayment({ debt_id: 1, amount: 250000 })];
    expect(debtRemaining(debt, payments)).toBe(1250000);
  });

  it('kalan borç sıfırın altına düşmez', () => {
    const debt = makeDebt({ id: 1, total_repayment_amount: 100000 });
    const payments = [makeDebtPayment({ debt_id: 1, amount: 150000 })];
    expect(debtRemaining(debt, payments)).toBe(0);
  });

  it('toplam kalan borç birden çok borcu toplar', () => {
    const d1 = makeDebt({ id: 1, total_repayment_amount: 2000000 });
    const d2 = makeDebt({ id: 2, total_repayment_amount: 500000 });
    const payments = [makeDebtPayment({ debt_id: 1, amount: 300000 })];
    expect(totalRemainingDebt([d1, d2], payments)).toBe(2200000); // 1.700.000 + 500.000
  });

  it('net varlık = mevcut para - kalan borç', () => {
    const acc = makeAccount({ id: 1, initial_balance: 500000 });
    const debt = makeDebt({ id: 1, total_repayment_amount: 200000 });
    const payments = [makeDebtPayment({ debt_id: 1, amount: 50000 })];
    // para 500.000, kalan borç 150.000 -> net 350.000
    expect(netWorth([acc], [], [debt], payments)).toBe(350000);
  });
});

describe('kullanılabilir bakiye', () => {
  it('zorunlu ödemeler ve korumalı birikimler düşülür', () => {
    expect(availableBalance(1000000, 200000, 300000)).toBe(500000);
  });
  it('rezerv yoksa toplam paraya eşittir', () => {
    expect(availableBalance(1000000, 0, 0)).toBe(1000000);
  });
});

describe('işlem kalemleri', () => {
  it('kalem toplamı işleme eşitse fark 0', () => {
    // 1.250 = 800 + 300 + 150
    expect(itemsSumDifference([80000, 30000, 15000], 125000)).toBe(0);
    expect(itemsSumMatches([80000, 30000, 15000], 125000)).toBe(true);
  });
  it('kalem toplamı eşit değilse fark döner', () => {
    expect(itemsSumDifference([80000, 30000], 125000)).toBe(-15000);
    expect(itemsSumMatches([80000, 30000], 125000)).toBe(false);
  });
});
