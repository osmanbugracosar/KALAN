import { create } from 'zustand';
import { nowLocalIso, todayLocalDate, toLocalIso, advanceDueDate } from '../core/date';
import { generateSalt, hashPin } from '../core/security';
import type {
  Account,
  Budget,
  Category,
  Debt,
  DebtPayment,
  RecurringTransaction,
  SavingsGoal,
  Transaction,
  TransactionItem,
  User,
  WishlistItem,
} from '../domain/types';
import { isTauriEnv, withTransaction } from '../db/database';
import * as repo from '../db/repositories';
import {
  clearAllData,
  completeSetup as dbCompleteSetup,
  importBundle,
  isInitialized,
  loadAllData,
  loadDemoData,
  type DataBundle,
  type SetupPayload,
} from '../db/persistence';
import { generateDemoData } from '../db/demoData';
import { buildDefaultCategoryRows } from '../db/categoryFactory';
import { validatePayment } from '../services/debt';
import { debtRemaining } from '../services/calculations';

export type AppStatus = 'loading' | 'needs_setup' | 'ready' | 'error';
export interface ActionResult {
  ok: boolean;
  message?: string;
}

/** Detaylı gider kalemi girişi (fiş satırı). */
export interface DetailedItemInput {
  name: string;
  category_id: number | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  note: string | null;
}

/** Yedek dosyası biçimi. */
export interface BackupFile {
  app: 'kalan';
  version: number;
  exportedAt: string;
  data: DataBundle;
}

/** CSV içe aktarma için normalize edilmiş satır. */
export interface CsvImportRow {
  date: string; // "YYYY-MM-DD"
  type: 'income' | 'expense';
  amount: number; // kuruş
  accountId: number | null;
  categoryName: string | null;
  description: string | null;
}

export type TransactionDraft = Omit<Transaction, 'id' | 'created_at' | 'updated_at'>;

interface FinanceState {
  status: AppStatus;
  mode: 'tauri' | 'browser';
  errorMessage: string | null;

  user: User | null;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  transactionItems: TransactionItem[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  savingsGoals: SavingsGoal[];
  budgets: Budget[];
  wishlist: WishlistItem[];
  recurring: RecurringTransaction[];
  settings: Record<string, string>;

  init: () => Promise<void>;
  reload: () => Promise<void>;
  completeSetup: (payload: SetupPayload) => Promise<void>;

  addTransaction: (draft: TransactionDraft) => Promise<void>;
  addDetailedExpense: (draft: TransactionDraft, items: DetailedItemInput[]) => Promise<ActionResult>;
  addAccount: (draft: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateAccount: (id: number, patch: Partial<Account>) => Promise<void>;
  addCategory: (draft: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => Promise<number>;
  updateUser: (patch: Partial<Pick<User, 'name' | 'currency' | 'spending_limit'>>) => Promise<void>;

  addDebt: (
    draft: Omit<Debt, 'id' | 'created_at' | 'updated_at'>,
    inflow?: { accountId: number },
  ) => Promise<void>;
  updateDebt: (id: number, patch: Partial<Debt>) => Promise<void>;
  deleteDebt: (id: number) => Promise<void>;

  addDebtPayment: (draft: { debtId: number; accountId: number | null; amount: number; date: string; description: string | null }) => Promise<ActionResult>;
  editDebtPayment: (id: number, amount: number, date: string, description: string | null) => Promise<ActionResult>;
  deleteDebtPayment: (id: number) => Promise<void>;
  addIncomeRoutedToDebt: (income: TransactionDraft, debtId: number, portionK: number, fromAccountId: number | null) => Promise<ActionResult>;

  /* birikim hedefleri */
  addSavingsGoal: (draft: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateSavingsGoal: (id: number, patch: Partial<SavingsGoal>) => Promise<void>;
  deleteSavingsGoal: (id: number) => Promise<void>;
  contributeToSavings: (draft: { goalId: number; fromAccountId: number | null; amount: number; date: string }) => Promise<ActionResult>;

  /* bütçeler */
  addBudget: (draft: Omit<Budget, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateBudget: (id: number, patch: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: number) => Promise<void>;

  /* düzenli ödemeler */
  addRecurring: (draft: Omit<RecurringTransaction, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateRecurring: (id: number, patch: Partial<RecurringTransaction>) => Promise<void>;
  deleteRecurring: (id: number) => Promise<void>;
  runRecurringNow: (id: number) => Promise<ActionResult>;
  skipRecurringDue: (id: number) => Promise<void>;

  /* PIN */
  setPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;

  seedDemo: () => Promise<void>;
  clearData: () => Promise<void>;
  buildBackup: () => BackupFile;
  restoreBackup: (file: BackupFile) => Promise<ActionResult>;
  importTransactionsCsv: (rows: CsvImportRow[]) => Promise<ActionResult>;
}

function localNextId(rows: { id: number }[]): number {
  return rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  status: 'loading',
  mode: isTauriEnv() ? 'tauri' : 'browser',
  errorMessage: null,
  user: null,
  accounts: [],
  categories: [],
  transactions: [],
  transactionItems: [],
  debts: [],
  debtPayments: [],
  savingsGoals: [],
  budgets: [],
  wishlist: [],
  recurring: [],
  settings: {},

  /* --------------------------- init --------------------------- */
  init: async () => {
    if (get().mode === 'browser') {
      // Tarayıcı önizleme: demo veriyle çalış (kalıcı değil)
      const demo = generateDemoData();
      set({
        status: 'ready',
        user: { id: 1, name: 'Demo Kullanıcı', currency: 'TRY', pin_hash: null, pin_salt: null, spending_limit: 2500000, created_at: nowLocalIso(), updated_at: nowLocalIso() },
        settings: { currency: 'TRY', is_demo: '1', user_name: 'Demo Kullanıcı' },
        ...demo,
      });
      return;
    }
    try {
      const initialized = await isInitialized();
      if (!initialized) {
        set({ status: 'needs_setup' });
        return;
      }
      const bundle = await loadAllData();
      set({ status: 'ready', ...bundle });
    } catch (e) {
      set({ status: 'error', errorMessage: e instanceof Error ? e.message : String(e) });
    }
  },

  reload: async () => {
    if (get().mode === 'browser') return;
    const bundle = await loadAllData();
    set({ ...bundle, status: 'ready' });
  },

  completeSetup: async (payload) => {
    if (get().mode === 'browser') {
      if (payload.useDemo) {
        const demo = generateDemoData();
        set({ status: 'ready', settings: { currency: payload.currency, is_demo: '1', user_name: payload.name }, user: browserUser(payload), ...demo });
      } else {
        const { categories } = buildDefaultCategoryRows();
        const accounts: Account[] = payload.accounts.map((a, i) => ({
          id: i + 1,
          name: a.name,
          type: a.type,
          initial_balance: a.initial_balance,
          currency: payload.currency,
          color: '#0E5E63',
          icon: 'wallet',
          is_protected: a.is_protected ?? (a.type === 'savings' ? 1 : 0),
          is_active: 1,
          sort_order: i,
          created_at: nowLocalIso(),
          updated_at: nowLocalIso(),
        }));
        set({
          status: 'ready',
          settings: { currency: payload.currency, is_demo: '0', user_name: payload.name },
          user: browserUser(payload),
          categories,
          accounts,
          transactions: [],
          debts: [],
          debtPayments: [],
          savingsGoals: [],
          budgets: [],
          wishlist: [],
          recurring: [],
        });
      }
      return;
    }
    await dbCompleteSetup(payload);
    await get().reload();
  },

  /* --------------------------- işlemler --------------------------- */
  addTransaction: async (draft) => {
    const rows = get().transactions;
    let id: number;
    if (get().mode === 'tauri') id = await repo.insertTransaction(draft);
    else id = localNextId(rows);
    const now = nowLocalIso();
    set({ transactions: sortTxns([{ ...draft, id, created_at: now, updated_at: now }, ...rows]) });
  },

  addDetailedExpense: async (draft, items) => {
    if (items.length === 0) return { ok: false, message: 'En az bir kalem ekleyin.' };
    const sum = items.reduce((s, it) => s + it.total_amount, 0);
    if (sum <= 0) return { ok: false, message: 'Kalem tutarları toplamı sıfırdan büyük olmalı.' };
    if (sum !== draft.amount) return { ok: false, message: 'Kalem toplamı işlem tutarına eşit değil.' };

    const now = nowLocalIso();
    const txnRows = get().transactions;

    if (get().mode === 'tauri') {
      await withTransaction(async () => {
        const txId = await repo.insertTransaction(draft);
        set({ transactions: sortTxns([{ ...draft, id: txId, created_at: now, updated_at: now }, ...get().transactions]) });
        const newItems: TransactionItem[] = [];
        for (const it of items) {
          const itemId = await repo.insertTransactionItem({
            transaction_id: txId, name: it.name, quantity: it.quantity, unit_price: it.unit_price,
            total_amount: it.total_amount, category_id: it.category_id, subcategory_id: null, note: it.note,
          });
          newItems.push({ id: itemId, transaction_id: txId, name: it.name, quantity: it.quantity, unit_price: it.unit_price, total_amount: it.total_amount, category_id: it.category_id, subcategory_id: null, note: it.note, created_at: now, updated_at: now });
        }
        set({ transactionItems: [...get().transactionItems, ...newItems] });
      });
    } else {
      const txId = localNextId(txnRows);
      let nextItemId = localNextId(get().transactionItems);
      const newItems: TransactionItem[] = items.map((it) => ({
        id: nextItemId++, transaction_id: txId, name: it.name, quantity: it.quantity, unit_price: it.unit_price,
        total_amount: it.total_amount, category_id: it.category_id, subcategory_id: null, note: it.note, created_at: now, updated_at: now,
      }));
      set({
        transactions: sortTxns([{ ...draft, id: txId, created_at: now, updated_at: now }, ...txnRows]),
        transactionItems: [...get().transactionItems, ...newItems],
      });
    }
    return { ok: true };
  },

  addAccount: async (draft) => {
    const rows = get().accounts;
    let id: number;
    if (get().mode === 'tauri') id = await repo.insertAccount(draft);
    else id = localNextId(rows);
    const now = nowLocalIso();
    set({ accounts: [...rows, { ...draft, id, created_at: now, updated_at: now }] });
  },

  updateAccount: async (id, patch) => {
    if (get().mode === 'tauri') await repo.updateAccount(id, patch);
    set({ accounts: get().accounts.map((a) => (a.id === id ? { ...a, ...patch, updated_at: nowLocalIso() } : a)) });
  },

  addCategory: async (draft) => {
    const rows = get().categories;
    let id: number;
    if (get().mode === 'tauri') id = await repo.insertCategory(draft);
    else id = localNextId(rows);
    const now = nowLocalIso();
    set({ categories: [...rows, { ...draft, id, created_at: now, updated_at: now }] });
    return id;
  },

  updateUser: async (patch) => {
    const user = get().user;
    if (!user) return;
    if (get().mode === 'tauri') await repo.updateUser(user.id, patch);
    set({ user: { ...user, ...patch, updated_at: nowLocalIso() } });
  },

  /* --------------------------- borçlar --------------------------- */
  addDebt: async (draft, inflow) => {
    const debtRows = get().debts;
    const txnRows = get().transactions;
    const now = nowLocalIso();

    if (get().mode === 'tauri') {
      await withTransaction(async () => {
        const debtId = await repo.insertDebt(draft);
        set({ debts: [{ ...draft, id: debtId, created_at: now, updated_at: now }, ...debtRows] });
        if (inflow) {
          const txDraft: TransactionDraft = inflowDraft(draft, debtId, inflow.accountId);
          const txId = await repo.insertTransaction(txDraft);
          set({ transactions: sortTxns([{ ...txDraft, id: txId, created_at: now, updated_at: now }, ...get().transactions]) });
        }
      });
    } else {
      const debtId = localNextId(debtRows);
      const newDebts = [{ ...draft, id: debtId, created_at: now, updated_at: now }, ...debtRows];
      let newTxns = txnRows;
      if (inflow) {
        const txDraft = inflowDraft(draft, debtId, inflow.accountId);
        newTxns = sortTxns([{ ...txDraft, id: localNextId(txnRows), created_at: now, updated_at: now }, ...txnRows]);
      }
      set({ debts: newDebts, transactions: newTxns });
    }
  },

  updateDebt: async (id, patch) => {
    if (get().mode === 'tauri') await repo.updateDebt(id, patch);
    set({ debts: get().debts.map((d) => (d.id === id ? { ...d, ...patch, updated_at: nowLocalIso() } : d)) });
  },

  deleteDebt: async (id) => {
    if (get().mode === 'tauri') await repo.deleteDebt(id);
    set({
      debts: get().debts.filter((d) => d.id !== id),
      debtPayments: get().debtPayments.filter((p) => p.debt_id !== id),
    });
  },

  addDebtPayment: async ({ debtId, accountId, amount, date, description }) => {
    const debt = get().debts.find((d) => d.id === debtId);
    if (!debt) return { ok: false, message: 'Borç bulunamadı.' };
    const existing = get().debtPayments.filter((p) => p.debt_id === debtId);
    const v = validatePayment(debt, existing, amount);
    if (!v.ok) return { ok: false, message: v.message };

    const now = nowLocalIso();
    const draft = { debt_id: debtId, account_id: accountId, amount, payment_date: date, description, linked_income_transaction_id: null, linked_transaction_id: null };
    let id: number;
    if (get().mode === 'tauri') id = await repo.insertDebtPayment(draft);
    else id = localNextId(get().debtPayments);
    set({ debtPayments: [{ ...draft, id, created_at: now, updated_at: now }, ...get().debtPayments] });
    return { ok: true };
  },

  editDebtPayment: async (id, amount, date, description) => {
    const payment = get().debtPayments.find((p) => p.id === id);
    if (!payment) return { ok: false, message: 'Ödeme bulunamadı.' };
    const debt = get().debts.find((d) => d.id === payment.debt_id);
    if (!debt) return { ok: false, message: 'Borç bulunamadı.' };
    const others = get().debtPayments.filter((p) => p.debt_id === debt.id && p.id !== id);
    const v = validatePayment(debt, others, amount);
    if (!v.ok) return { ok: false, message: v.message };

    if (get().mode === 'tauri') await repo.updateDebtPayment(id, amount, date, description);
    set({
      debtPayments: get().debtPayments.map((p) => (p.id === id ? { ...p, amount, payment_date: date, description, updated_at: nowLocalIso() } : p)),
    });
    return { ok: true };
  },

  deleteDebtPayment: async (id) => {
    if (get().mode === 'tauri') await repo.deleteDebtPayment(id);
    set({ debtPayments: get().debtPayments.filter((p) => p.id !== id) });
  },

  addIncomeRoutedToDebt: async (income, debtId, portionK, fromAccountId) => {
    const debt = get().debts.find((d) => d.id === debtId);
    if (!debt) return { ok: false, message: 'Borç bulunamadı.' };
    if (portionK <= 0) return { ok: false, message: 'Borca ayrılan tutar sıfırdan büyük olmalı.' };
    if (portionK > income.amount) return { ok: false, message: 'Borca ayrılan tutar gelirden büyük olamaz.' };
    const existing = get().debtPayments.filter((p) => p.debt_id === debtId);
    const v = validatePayment(debt, existing, portionK);
    if (!v.ok) return { ok: false, message: v.message };

    const now = nowLocalIso();
    if (get().mode === 'tauri') {
      await withTransaction(async () => {
        const incomeId = await repo.insertTransaction(income);
        set({ transactions: sortTxns([{ ...income, id: incomeId, created_at: now, updated_at: now }, ...get().transactions]) });
        const pDraft = { debt_id: debtId, account_id: fromAccountId, amount: portionK, payment_date: income.transaction_date.split('T')[0], description: 'Gelirden borca yönlendirildi', linked_income_transaction_id: incomeId, linked_transaction_id: null };
        const pid = await repo.insertDebtPayment(pDraft);
        set({ debtPayments: [{ ...pDraft, id: pid, created_at: now, updated_at: now }, ...get().debtPayments] });
      });
    } else {
      const incomeId = localNextId(get().transactions);
      const pDraft = { debt_id: debtId, account_id: fromAccountId, amount: portionK, payment_date: income.transaction_date.split('T')[0], description: 'Gelirden borca yönlendirildi', linked_income_transaction_id: incomeId, linked_transaction_id: null };
      set({
        transactions: sortTxns([{ ...income, id: incomeId, created_at: now, updated_at: now }, ...get().transactions]),
        debtPayments: [{ ...pDraft, id: localNextId(get().debtPayments), created_at: now, updated_at: now }, ...get().debtPayments],
      });
    }
    return { ok: true };
  },

  /* --------------------------- demo / temizle --------------------------- */
  /* --------------------------- birikim hedefleri --------------------------- */
  addSavingsGoal: async (draft) => {
    const rows = get().savingsGoals;
    let id: number;
    if (get().mode === 'tauri') id = await repo.insertSavingsGoal(draft);
    else id = localNextId(rows);
    const now = nowLocalIso();
    set({ savingsGoals: [...rows, { ...draft, id, created_at: now, updated_at: now }] });
  },

  updateSavingsGoal: async (id, patch) => {
    if (get().mode === 'tauri') await repo.updateSavingsGoal(id, patch);
    set({ savingsGoals: get().savingsGoals.map((g) => (g.id === id ? { ...g, ...patch, updated_at: nowLocalIso() } : g)) });
  },

  deleteSavingsGoal: async (id) => {
    if (get().mode === 'tauri') await repo.deleteSavingsGoal(id);
    set({
      savingsGoals: get().savingsGoals.filter((g) => g.id !== id),
      // katkı işlemleri kalır (para gerçekten taşındı), yalnızca hedef bağı kopar
      transactions: get().transactions.map((t) => (t.savings_goal_id === id ? { ...t, savings_goal_id: null } : t)),
    });
  },

  contributeToSavings: async ({ goalId, fromAccountId, amount, date }) => {
    const goal = get().savingsGoals.find((g) => g.id === goalId);
    if (!goal) return { ok: false, message: 'Birikim hedefi bulunamadı.' };
    if (amount <= 0) return { ok: false, message: 'Tutar sıfırdan büyük olmalı.' };

    const draft: TransactionDraft = {
      type: 'savings_contribution',
      amount,
      account_id: fromAccountId,
      destination_account_id: goal.account_id, // hedefin bağlı hesabı (yoksa null)
      category_id: null,
      debt_id: null,
      savings_goal_id: goalId,
      merchant: null,
      description: `${goal.name} — birikim katkısı`,
      payment_method: null,
      transaction_date: toLocalIso(date, '12:00'),
      note: null,
      include_in_budget: 0,
      has_receipt: 0,
      linked_transaction_id: null,
      is_recurring_instance: 0,
    };
    await get().addTransaction(draft);

    // Hedef tamamlandıysa işaretle
    const saved = get()
      .transactions.filter((t) => t.type === 'savings_contribution' && t.savings_goal_id === goalId)
      .reduce((s, t) => s + t.amount, 0);
    if (goal.target_amount > 0 && saved >= goal.target_amount && goal.is_completed === 0) {
      await get().updateSavingsGoal(goalId, { is_completed: 1 });
    }
    return { ok: true };
  },

  /* --------------------------- bütçeler --------------------------- */
  addBudget: async (draft) => {
    const rows = get().budgets;
    let id: number;
    if (get().mode === 'tauri') id = await repo.insertBudget(draft);
    else id = localNextId(rows);
    const now = nowLocalIso();
    set({ budgets: [...rows, { ...draft, id, created_at: now, updated_at: now }] });
  },

  updateBudget: async (id, patch) => {
    if (get().mode === 'tauri') await repo.updateBudget(id, patch);
    set({ budgets: get().budgets.map((b) => (b.id === id ? { ...b, ...patch, updated_at: nowLocalIso() } : b)) });
  },

  deleteBudget: async (id) => {
    if (get().mode === 'tauri') await repo.deleteBudget(id);
    set({ budgets: get().budgets.filter((b) => b.id !== id) });
  },

  /* --------------------------- düzenli ödemeler --------------------------- */
  addRecurring: async (draft) => {
    const rows = get().recurring;
    let id: number;
    if (get().mode === 'tauri') id = await repo.insertRecurring(draft);
    else id = localNextId(rows);
    const now = nowLocalIso();
    set({ recurring: [...rows, { ...draft, id, created_at: now, updated_at: now }] });
  },

  updateRecurring: async (id, patch) => {
    if (get().mode === 'tauri') await repo.updateRecurring(id, patch);
    set({ recurring: get().recurring.map((r) => (r.id === id ? { ...r, ...patch, updated_at: nowLocalIso() } : r)) });
  },

  deleteRecurring: async (id) => {
    if (get().mode === 'tauri') await repo.deleteRecurring(id);
    set({ recurring: get().recurring.filter((r) => r.id !== id) });
  },

  runRecurringNow: async (id) => {
    const r = get().recurring.find((x) => x.id === id);
    if (!r) return { ok: false, message: 'Düzenli ödeme bulunamadı.' };

    const draft: TransactionDraft = {
      type: r.type,
      amount: r.amount,
      account_id: r.account_id,
      destination_account_id: r.destination_account_id,
      category_id: r.category_id,
      debt_id: r.debt_id,
      savings_goal_id: null,
      merchant: r.merchant,
      description: r.name,
      payment_method: null,
      transaction_date: toLocalIso(r.next_due_date, '12:00'),
      note: r.note,
      include_in_budget: r.type === 'expense' ? 1 : 0,
      has_receipt: 0,
      linked_transaction_id: null,
      is_recurring_instance: 1,
    };

    const isOnce = r.frequency === 'once';
    const patch: Partial<RecurringTransaction> = isOnce
      ? { is_active: 0, status: 'paid', last_run_date: todayLocalDate() }
      : { next_due_date: advanceDueDate(r.next_due_date, r.frequency, r.interval_days), status: 'pending', last_run_date: todayLocalDate() };

    if (get().mode === 'tauri') {
      await withTransaction(async () => {
        const txId = await repo.insertTransaction(draft);
        const now = nowLocalIso();
        set({ transactions: sortTxns([{ ...draft, id: txId, created_at: now, updated_at: now }, ...get().transactions]) });
        await repo.updateRecurring(id, patch);
        set({ recurring: get().recurring.map((x) => (x.id === id ? { ...x, ...patch, updated_at: now } : x)) });
      });
    } else {
      const now = nowLocalIso();
      set({
        transactions: sortTxns([{ ...draft, id: localNextId(get().transactions), created_at: now, updated_at: now }, ...get().transactions]),
        recurring: get().recurring.map((x) => (x.id === id ? { ...x, ...patch, updated_at: now } : x)),
      });
    }
    return { ok: true };
  },

  skipRecurringDue: async (id) => {
    const r = get().recurring.find((x) => x.id === id);
    if (!r) return;
    const isOnce = r.frequency === 'once';
    const patch: Partial<RecurringTransaction> = isOnce
      ? { is_active: 0, status: 'skipped' }
      : { next_due_date: advanceDueDate(r.next_due_date, r.frequency, r.interval_days), status: 'pending' };
    await get().updateRecurring(id, patch);
  },

  /* --------------------------- PIN --------------------------- */
  setPin: async (pin) => {
    const salt = generateSalt();
    const pin_hash = await hashPin(pin, salt);
    const user = get().user;
    if (!user) return;
    if (get().mode === 'tauri') await repo.updateUser(user.id, { pin_hash, pin_salt: salt });
    set({ user: { ...user, pin_hash, pin_salt: salt, updated_at: nowLocalIso() } });
  },

  removePin: async () => {
    const user = get().user;
    if (!user) return;
    if (get().mode === 'tauri') await repo.updateUser(user.id, { pin_hash: null, pin_salt: null });
    set({ user: { ...user, pin_hash: null, pin_salt: null, updated_at: nowLocalIso() } });
  },

  seedDemo: async () => {
    if (get().mode === 'tauri') {
      await loadDemoData();
      await get().reload();
    } else {
      set({ ...generateDemoData(), settings: { ...get().settings, is_demo: '1' } });
    }
  },

  clearData: async () => {
    if (get().mode === 'tauri') {
      await clearAllData(true);
      await get().reload();
    } else {
      set({
        accounts: [],
        transactions: [],
        transactionItems: [],
        debts: [],
        debtPayments: [],
        savingsGoals: [],
        budgets: [],
        wishlist: [],
        recurring: [],
        settings: { ...get().settings, is_demo: '0' },
      });
    }
  },

  buildBackup: () => {
    const st = get();
    const data: DataBundle = {
      user: st.user,
      settings: st.settings,
      accounts: st.accounts,
      categories: st.categories,
      transactions: st.transactions,
      transactionItems: st.transactionItems,
      debts: st.debts,
      debtPayments: st.debtPayments,
      savingsGoals: st.savingsGoals,
      budgets: st.budgets,
      wishlist: st.wishlist,
      recurring: st.recurring,
    };
    return { app: 'kalan', version: 1, exportedAt: nowLocalIso(), data };
  },

  restoreBackup: async (file) => {
    if (!file || file.app !== 'kalan' || !file.data) return { ok: false, message: 'Geçersiz yedek dosyası.' };
    const d = file.data;
    // Eksik alanları güvenle tamamla
    const bundle: DataBundle = {
      user: d.user ?? null,
      settings: d.settings ?? {},
      accounts: d.accounts ?? [],
      categories: d.categories ?? [],
      transactions: d.transactions ?? [],
      transactionItems: d.transactionItems ?? [],
      debts: d.debts ?? [],
      debtPayments: d.debtPayments ?? [],
      savingsGoals: d.savingsGoals ?? [],
      budgets: d.budgets ?? [],
      wishlist: d.wishlist ?? [],
      recurring: d.recurring ?? [],
    };
    try {
      if (get().mode === 'tauri') {
        await importBundle(bundle);
        await get().reload();
      } else {
        set({
          user: bundle.user,
          settings: { ...bundle.settings, is_demo: '0' },
          accounts: bundle.accounts,
          categories: bundle.categories,
          transactions: sortTxns(bundle.transactions),
          transactionItems: bundle.transactionItems,
          debts: bundle.debts,
          debtPayments: bundle.debtPayments,
          savingsGoals: bundle.savingsGoals,
          budgets: bundle.budgets,
          wishlist: bundle.wishlist,
          recurring: bundle.recurring,
        });
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'Geri yükleme başarısız.' };
    }
  },

  importTransactionsCsv: async (rows) => {
    if (rows.length === 0) return { ok: false, message: 'İçe aktarılacak satır bulunamadı.' };
    const catByName = new Map<string, number>();
    for (const c of get().categories) catByName.set(c.name.toLocaleLowerCase('tr'), c.id);

    let imported = 0;
    for (const r of rows) {
      // Kategori eşleştir / gerekiyorsa oluştur
      let categoryId: number | null = null;
      if (r.categoryName && r.categoryName.trim()) {
        const key = r.categoryName.trim().toLocaleLowerCase('tr');
        if (catByName.has(key)) {
          categoryId = catByName.get(key)!;
        } else {
          const newId = await get().addCategory({
            name: r.categoryName.trim(), parent_id: null, kind: r.type === 'income' ? 'income' : 'expense',
            color: '#6B7280', icon: 'tag', is_default: 0, sort_order: 99,
          });
          catByName.set(key, newId);
          categoryId = newId;
        }
      }
      const draft: TransactionDraft = {
        type: r.type,
        amount: r.amount,
        account_id: r.accountId,
        destination_account_id: null,
        category_id: categoryId,
        debt_id: null,
        savings_goal_id: null,
        merchant: r.description,
        description: r.description,
        payment_method: null,
        transaction_date: toLocalIso(r.date, '12:00'),
        note: null,
        include_in_budget: r.type === 'expense' ? 1 : 0,
        has_receipt: 0,
        linked_transaction_id: null,
        is_recurring_instance: 0,
      };
      await get().addTransaction(draft);
      imported++;
    }
    return { ok: true, message: `${imported} işlem içe aktarıldı.` };
  },
}));

/* --------------------------- yardımcılar --------------------------- */
function sortTxns(rows: Transaction[]): Transaction[] {
  return [...rows].sort((a, b) => (a.transaction_date < b.transaction_date ? 1 : a.transaction_date > b.transaction_date ? -1 : b.id - a.id));
}

function browserUser(payload: SetupPayload): User {
  return { id: 1, name: payload.name, currency: payload.currency, pin_hash: payload.pinHash, pin_salt: payload.pinSalt, spending_limit: payload.spendingLimit, created_at: nowLocalIso(), updated_at: nowLocalIso() };
}

function inflowDraft(debt: Omit<Debt, 'id' | 'created_at' | 'updated_at'>, debtId: number, accountId: number): TransactionDraft {
  return {
    type: 'debt_inflow',
    amount: debt.original_amount,
    account_id: accountId,
    destination_account_id: null,
    category_id: null,
    debt_id: debtId,
    savings_goal_id: null,
    merchant: debt.creditor,
    description: `${debt.name} — borç kullanımı`,
    payment_method: null,
    transaction_date: `${debt.start_date}T10:00:00`,
    note: null,
    include_in_budget: 0,
    has_receipt: 0,
    linked_transaction_id: null,
    is_recurring_instance: 0,
  };
}

/** Etkin işlemler + borç ödemeleri; hesaplama seçicileri için tek erişim noktası. */
export function useDebtRemaining(debtId: number): number {
  const debts = useFinanceStore((s) => s.debts);
  const payments = useFinanceStore((s) => s.debtPayments);
  const debt = debts.find((d) => d.id === debtId);
  if (!debt) return 0;
  return debtRemaining(debt, payments);
}
