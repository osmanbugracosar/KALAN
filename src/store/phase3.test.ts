import { describe, it, expect, beforeEach } from 'vitest';
import { useFinanceStore, type TransactionDraft, type DetailedItemInput } from './useFinanceStore';
import { computeBalances } from '../services/calculations';
import type { Account, Category } from '../domain/types';

const acc: Account = { id: 1, name: 'Nakit', type: 'cash', initial_balance: 100000, currency: 'TRY', color: '#000', icon: 'wallet', is_protected: 0, is_active: 1, sort_order: 0, created_at: '', updated_at: '' };
const cat: Category = { id: 10, name: 'Market', parent_id: null, kind: 'expense', color: '#000', icon: 'tag', is_default: 1, sort_order: 0, created_at: '', updated_at: '' };

function seed() {
  useFinanceStore.setState({
    status: 'ready', mode: 'browser', user: { id: 1, name: 'x', currency: 'TRY', pin_hash: null, pin_salt: null, spending_limit: null, created_at: '', updated_at: '' },
    accounts: [acc], categories: [cat], transactions: [], transactionItems: [],
    debts: [], debtPayments: [], savingsGoals: [], budgets: [], wishlist: [], recurring: [], settings: { is_demo: '0' },
  });
}

const expenseDraft = (amount: number): TransactionDraft => ({
  type: 'expense', amount, account_id: 1, destination_account_id: null, category_id: null, debt_id: null,
  savings_goal_id: null, merchant: 'Migros', description: 'Migros', payment_method: null,
  transaction_date: '2026-01-15T12:00:00', note: null, include_in_budget: 1, has_receipt: 1,
  linked_transaction_id: null, is_recurring_instance: 0,
});

describe('detaylı gider (kalem bölme)', () => {
  beforeEach(seed);

  it('kalemleri ekler ve hesaptan yalnızca bir kez düşer', async () => {
    const items: DetailedItemInput[] = [
      { name: 'Süt', category_id: 10, quantity: 2, unit_price: 1500, total_amount: 3000, note: null },
      { name: 'Ekmek', category_id: 10, quantity: 1, unit_price: 2000, total_amount: 2000, note: null },
    ];
    const res = await useFinanceStore.getState().addDetailedExpense(expenseDraft(5000), items);
    expect(res.ok).toBe(true);

    const st = useFinanceStore.getState();
    expect(st.transactions.length).toBe(1);
    expect(st.transactionItems.length).toBe(2);

    // 100000 - 5000 = 95000 (bir kez düşülür)
    const bal = computeBalances(st.accounts, st.transactions).get(1);
    expect(bal).toBe(95000);
  });

  it('kalem toplamı işlem tutarına eşit değilse reddeder', async () => {
    const items: DetailedItemInput[] = [{ name: 'X', category_id: null, quantity: 1, unit_price: 1000, total_amount: 1000, note: null }];
    const res = await useFinanceStore.getState().addDetailedExpense(expenseDraft(5000), items);
    expect(res.ok).toBe(false);
    expect(useFinanceStore.getState().transactions.length).toBe(0);
  });
});

describe('yedekle & geri yükle (round-trip)', () => {
  beforeEach(seed);

  it('yedek alır, temizler ve geri yükler', async () => {
    await useFinanceStore.getState().addTransaction(expenseDraft(2500));
    const backup = useFinanceStore.getState().buildBackup();
    expect(backup.app).toBe('kalan');
    expect(backup.data.transactions.length).toBe(1);

    await useFinanceStore.getState().clearData();
    expect(useFinanceStore.getState().transactions.length).toBe(0);
    expect(useFinanceStore.getState().accounts.length).toBe(0);

    const res = await useFinanceStore.getState().restoreBackup(backup);
    expect(res.ok).toBe(true);
    const st = useFinanceStore.getState();
    expect(st.accounts.length).toBe(1);
    expect(st.transactions.length).toBe(1);
    expect(st.categories.length).toBe(1);
  });

  it('geçersiz yedeği reddeder', async () => {
    // @ts-expect-error kasıtlı geçersiz
    const res = await useFinanceStore.getState().restoreBackup({ app: 'baska', data: null });
    expect(res.ok).toBe(false);
  });
});

describe('CSV içe aktarma (store)', () => {
  beforeEach(seed);

  it('satırları işleme çevirir ve olmayan kategoriyi oluşturur', async () => {
    const res = await useFinanceStore.getState().importTransactionsCsv([
      { date: '2026-01-10', type: 'expense', amount: 4000, accountId: 1, categoryName: 'Ulaşım', description: 'Otobüs' },
      { date: '2026-01-11', type: 'income', amount: 900000, accountId: 1, categoryName: null, description: 'Maaş' },
    ]);
    expect(res.ok).toBe(true);
    const st = useFinanceStore.getState();
    expect(st.transactions.length).toBe(2);
    // "Ulaşım" kategorisi otomatik oluşturuldu
    expect(st.categories.some((c) => c.name === 'Ulaşım')).toBe(true);
  });
});

describe('işlem düzenleme ve silme', () => {
  beforeEach(seed);

  it('işlem tutarını günceller, bakiye yeniden hesaplanır', async () => {
    await useFinanceStore.getState().addTransaction(expenseDraft(3000));
    const id = useFinanceStore.getState().transactions[0].id;
    // 100000 - 3000 = 97000
    expect(computeBalances(useFinanceStore.getState().accounts, useFinanceStore.getState().transactions).get(1)).toBe(97000);

    await useFinanceStore.getState().updateTransaction(id, { amount: 5000 });
    // 100000 - 5000 = 95000
    expect(computeBalances(useFinanceStore.getState().accounts, useFinanceStore.getState().transactions).get(1)).toBe(95000);
  });

  it('işlemi siler ve kalemlerini de kaldırır', async () => {
    const items = [{ name: 'A', category_id: 10, quantity: 1, unit_price: 4000, total_amount: 4000, note: null }];
    await useFinanceStore.getState().addDetailedExpense(expenseDraft(4000), items);
    const id = useFinanceStore.getState().transactions[0].id;
    expect(useFinanceStore.getState().transactionItems.length).toBe(1);

    await useFinanceStore.getState().deleteTransaction(id);
    expect(useFinanceStore.getState().transactions.length).toBe(0);
    expect(useFinanceStore.getState().transactionItems.length).toBe(0);
    // bakiye başa döner
    expect(computeBalances(useFinanceStore.getState().accounts, useFinanceStore.getState().transactions).get(1)).toBe(100000);
  });
});

describe('bakiye düzeltme (adjustment)', () => {
  beforeEach(seed);

  const adjust = (delta: number): TransactionDraft => ({
    type: 'adjustment', amount: delta, account_id: 1, destination_account_id: null, category_id: null,
    debt_id: null, savings_goal_id: null, merchant: null, description: 'Bakiye düzeltmesi', payment_method: null,
    transaction_date: '2026-01-20T12:00:00', note: null, include_in_budget: 0, has_receipt: 0,
    linked_transaction_id: null, is_recurring_instance: 0,
  });

  it('pozitif düzeltme bakiyeyi artırır', async () => {
    // başlangıç 100000, hedef 150000 -> delta +50000
    await useFinanceStore.getState().addTransaction(adjust(50000));
    expect(computeBalances(useFinanceStore.getState().accounts, useFinanceStore.getState().transactions).get(1)).toBe(150000);
  });

  it('negatif düzeltme bakiyeyi azaltır', async () => {
    // başlangıç 100000, hedef 70000 -> delta -30000
    await useFinanceStore.getState().addTransaction(adjust(-30000));
    expect(computeBalances(useFinanceStore.getState().accounts, useFinanceStore.getState().transactions).get(1)).toBe(70000);
  });
});
