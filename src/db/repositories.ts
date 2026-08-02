/**
 * Repository katmanı — her varlık için tipli okuma/yazma.
 * UI ve store yalnızca bu fonksiyonları kullanır; ham SQL burada kapsüllenir.
 */

import { execute, select } from './database';
import { nowLocalIso } from '../core/date';
import type {
  Account,
  Budget,
  Category,
  Debt,
  DebtPayment,
  RecurringTransaction,
  SavingsGoal,
  Setting,
  Transaction,
  TransactionItem,
  WishlistItem,
} from '../domain/types';

/* ------------------------- Ayarlar ------------------------- */
export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await select<Setting>('SELECT key, value FROM settings');
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}
export async function setSetting(key: string, value: string): Promise<void> {
  await execute('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2', [key, value]);
}

/* ------------------------- Kullanıcı ------------------------- */
export async function updateUser(
  id: number,
  patch: Partial<{ name: string; currency: string; spending_limit: number | null; pin_hash: string | null; pin_salt: string | null }>,
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = $${i++}`);
    values.push(v);
  }
  if (fields.length === 0) return;
  fields.push(`updated_at = $${i++}`);
  values.push(nowLocalIso());
  values.push(id);
  await execute(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);
}

/* ------------------------- Hesaplar ------------------------- */
export const listAccounts = () => select<Account>('SELECT * FROM accounts ORDER BY sort_order, id');

export async function insertAccount(a: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const now = nowLocalIso();
  const res = await execute(
    `INSERT INTO accounts (name, type, initial_balance, currency, color, icon, is_protected, is_active, sort_order, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [a.name, a.type, a.initial_balance, a.currency, a.color, a.icon, a.is_protected, a.is_active, a.sort_order, now, now],
  );
  return res.lastInsertId;
}
export async function updateAccount(id: number, a: Partial<Account>): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(a)) {
    if (k === 'id' || k === 'created_at') continue;
    fields.push(`${k} = $${i++}`);
    values.push(v);
  }
  fields.push(`updated_at = $${i++}`);
  values.push(nowLocalIso());
  values.push(id);
  await execute(`UPDATE accounts SET ${fields.join(', ')} WHERE id = $${i}`, values);
}

/* ------------------------- Kategoriler ------------------------- */
export const listCategories = () => select<Category>('SELECT * FROM categories ORDER BY sort_order, id');

export async function insertCategory(c: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const now = nowLocalIso();
  const res = await execute(
    `INSERT INTO categories (name, parent_id, kind, color, icon, is_default, sort_order, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [c.name, c.parent_id, c.kind, c.color, c.icon, c.is_default, c.sort_order, now, now],
  );
  return res.lastInsertId;
}

/* ------------------------- İşlemler ------------------------- */
export const listTransactions = () => select<Transaction>('SELECT * FROM transactions ORDER BY transaction_date DESC, id DESC');

export async function insertTransaction(t: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const now = nowLocalIso();
  const res = await execute(
    `INSERT INTO transactions
      (type, amount, account_id, destination_account_id, category_id, debt_id, savings_goal_id, merchant, description,
       payment_method, transaction_date, note, include_in_budget, has_receipt, linked_transaction_id, is_recurring_instance, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [
      t.type, t.amount, t.account_id, t.destination_account_id, t.category_id, t.debt_id, t.savings_goal_id, t.merchant,
      t.description, t.payment_method, t.transaction_date, t.note, t.include_in_budget, t.has_receipt, t.linked_transaction_id,
      t.is_recurring_instance, now, now,
    ],
  );
  return res.lastInsertId;
}
export async function updateTransactionLink(id: number, linkedId: number): Promise<void> {
  await execute('UPDATE transactions SET linked_transaction_id = $1, updated_at = $2 WHERE id = $3', [linkedId, nowLocalIso(), id]);
}
export async function deleteTransaction(id: number): Promise<void> {
  await execute('DELETE FROM transaction_items WHERE transaction_id = $1', [id]);
  await execute('DELETE FROM transactions WHERE id = $1', [id]);
}

/* ------------------------- İşlem kalemleri (detaylı gider) ------------------------- */
export const listTransactionItems = () => select<TransactionItem>('SELECT * FROM transaction_items ORDER BY id');

export async function insertTransactionItem(it: Omit<TransactionItem, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const now = nowLocalIso();
  const res = await execute(
    `INSERT INTO transaction_items (transaction_id, name, quantity, unit_price, total_amount, category_id, subcategory_id, note, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [it.transaction_id, it.name, it.quantity, it.unit_price, it.total_amount, it.category_id, it.subcategory_id, it.note, now, now],
  );
  return res.lastInsertId;
}

export async function deleteTransactionItemsFor(transactionId: number): Promise<void> {
  await execute('DELETE FROM transaction_items WHERE transaction_id = $1', [transactionId]);
}

/* ------------------------- Borçlar ------------------------- */
export const listDebts = () => select<Debt>('SELECT * FROM debts ORDER BY created_at DESC, id DESC');

export async function insertDebt(d: Omit<Debt, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const now = nowLocalIso();
  const res = await execute(
    `INSERT INTO debts
      (name, creditor, original_amount, total_repayment_amount, previously_paid_amount, start_date, due_date,
       planned_payment_amount, payment_frequency, status, color, icon, note, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [d.name, d.creditor, d.original_amount, d.total_repayment_amount, d.previously_paid_amount, d.start_date, d.due_date,
     d.planned_payment_amount, d.payment_frequency, d.status, d.color, d.icon, d.note, now, now],
  );
  return res.lastInsertId;
}
export async function updateDebt(id: number, d: Partial<Debt>): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(d)) {
    if (k === 'id' || k === 'created_at') continue;
    fields.push(`${k} = $${i++}`);
    values.push(v);
  }
  fields.push(`updated_at = $${i++}`);
  values.push(nowLocalIso());
  values.push(id);
  await execute(`UPDATE debts SET ${fields.join(', ')} WHERE id = $${i}`, values);
}
export async function deleteDebt(id: number): Promise<void> {
  await execute('DELETE FROM debt_payments WHERE debt_id = $1', [id]);
  await execute('DELETE FROM debts WHERE id = $1', [id]);
}

/* ------------------------- Borç ödemeleri ------------------------- */
export const listDebtPayments = () => select<DebtPayment>('SELECT * FROM debt_payments ORDER BY payment_date DESC, id DESC');

export async function insertDebtPayment(p: Omit<DebtPayment, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const now = nowLocalIso();
  const res = await execute(
    `INSERT INTO debt_payments (debt_id, account_id, amount, payment_date, description, linked_income_transaction_id, linked_transaction_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [p.debt_id, p.account_id, p.amount, p.payment_date, p.description, p.linked_income_transaction_id, p.linked_transaction_id, now, now],
  );
  return res.lastInsertId;
}
export async function updateDebtPayment(id: number, amount: number, paymentDate: string, description: string | null): Promise<void> {
  await execute('UPDATE debt_payments SET amount = $1, payment_date = $2, description = $3, updated_at = $4 WHERE id = $5', [
    amount, paymentDate, description, nowLocalIso(), id,
  ]);
}
export async function deleteDebtPayment(id: number): Promise<void> {
  await execute('DELETE FROM debt_payments WHERE id = $1', [id]);
}

/* ------------------------- Listeler ------------------------- */
export const listSavingsGoals = () => select<SavingsGoal>('SELECT * FROM savings_goals ORDER BY id');
export const listBudgets = () => select<Budget>('SELECT * FROM budgets ORDER BY id');
export const listWishlist = () => select<WishlistItem>('SELECT * FROM purchase_wishlist ORDER BY id');
export const listRecurring = () => select<RecurringTransaction>('SELECT * FROM recurring_transactions ORDER BY next_due_date');

/* Genel amaçlı kısmi güncelleme yardımcısı */
async function patchRow(table: string, id: number, patch: Record<string, unknown>): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'id' || k === 'created_at' || k === 'updated_at') continue;
    fields.push(`${k} = $${i++}`);
    values.push(v);
  }
  if (fields.length === 0) return;
  fields.push(`updated_at = $${i++}`);
  values.push(nowLocalIso());
  values.push(id);
  await execute(`UPDATE ${table} SET ${fields.join(', ')} WHERE id = $${i}`, values);
}

/* ------------------------- Birikim hedefleri ------------------------- */
export async function insertSavingsGoal(g: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const now = nowLocalIso();
  const res = await execute(
    `INSERT INTO savings_goals (name, target_amount, account_id, start_date, target_date, contribution_type, color, icon, note, is_completed, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [g.name, g.target_amount, g.account_id, g.start_date, g.target_date, g.contribution_type, g.color, g.icon, g.note, g.is_completed, now, now],
  );
  return res.lastInsertId;
}
export const updateSavingsGoal = (id: number, patch: Partial<SavingsGoal>) => patchRow('savings_goals', id, patch);
export async function deleteSavingsGoal(id: number): Promise<void> {
  // Katkılar gerçek işlemlerdir (para taşındı); hedef silinse de işlemler kalır, yalnızca bağ koparılır.
  await execute('UPDATE transactions SET savings_goal_id = NULL WHERE savings_goal_id = $1', [id]);
  await execute('DELETE FROM savings_goals WHERE id = $1', [id]);
}

/* ------------------------- Bütçeler ------------------------- */
export async function insertBudget(b: Omit<Budget, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const now = nowLocalIso();
  const res = await execute(
    `INSERT INTO budgets (name, method, category_id, limit_amount, period, is_active, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [b.name, b.method, b.category_id, b.limit_amount, b.period, b.is_active, now, now],
  );
  return res.lastInsertId;
}
export const updateBudget = (id: number, patch: Partial<Budget>) => patchRow('budgets', id, patch);
export async function deleteBudget(id: number): Promise<void> {
  await execute('DELETE FROM budgets WHERE id = $1', [id]);
}

/* ------------------------- Düzenli ödemeler ------------------------- */
export async function insertRecurring(r: Omit<RecurringTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const now = nowLocalIso();
  const res = await execute(
    `INSERT INTO recurring_transactions
      (name, type, amount, account_id, destination_account_id, category_id, debt_id, merchant, frequency, interval_days,
       next_due_date, last_run_date, status, is_active, note, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [r.name, r.type, r.amount, r.account_id, r.destination_account_id, r.category_id, r.debt_id, r.merchant, r.frequency,
     r.interval_days, r.next_due_date, r.last_run_date, r.status, r.is_active, r.note, now, now],
  );
  return res.lastInsertId;
}
export const updateRecurring = (id: number, patch: Partial<RecurringTransaction>) => patchRow('recurring_transactions', id, patch);
export async function deleteRecurring(id: number): Promise<void> {
  await execute('DELETE FROM recurring_transactions WHERE id = $1', [id]);
}
