/**
 * Kalıcılık düzenlemesi — ilk kurulum, demo tohumlama, tüm veriyi yükleme/temizleme.
 */

import { execute, select, withTransaction } from './database';
import { nowLocalIso } from '../core/date';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from './defaults';
import { generateDemoData, type DemoData } from './demoData';
import { insertAccount, insertCategory, setSetting } from './repositories';
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

export interface DataBundle {
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
}

export interface SetupAccountInput {
  name: string;
  type: Account['type'];
  initial_balance: number;
  is_protected?: number;
}

export interface SetupPayload {
  name: string;
  currency: string;
  spendingLimit: number | null;
  pinHash: string | null;
  pinSalt: string | null;
  accounts: SetupAccountInput[];
  useDemo: boolean;
}

/** Kurulum tamamlanmış mı? (users tablosunda kayıt varsa) */
export async function isInitialized(): Promise<boolean> {
  const rows = await select<{ c: number }>('SELECT COUNT(*) as c FROM users');
  return (rows[0]?.c ?? 0) > 0;
}

/** Varsayılan kategorileri ekler. */
async function seedDefaultCategories(): Promise<void> {
  const now = nowLocalIso();
  let order = 0;
  const all = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
  for (const c of all) {
    const parentId = await insertCategory({
      name: c.name,
      parent_id: null,
      kind: c.kind,
      color: c.color,
      icon: c.icon,
      is_default: 1,
      sort_order: order++,
    });
    for (const child of c.children ?? []) {
      await execute(
        `INSERT INTO categories (name, parent_id, kind, color, icon, is_default, sort_order, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [child, parentId, c.kind, c.color, 'dot', 1, order++, now, now],
      );
    }
  }
}

/** İlk kurulumu tamamlar (kullanıcı, kategoriler, hesaplar veya demo). */
export async function completeSetup(payload: SetupPayload): Promise<void> {
  const now = nowLocalIso();
  await withTransaction(async () => {
    await execute(
      `INSERT INTO users (name, currency, pin_hash, pin_salt, spending_limit, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [payload.name, payload.currency, payload.pinHash, payload.pinSalt, payload.spendingLimit, now, now],
    );

    await setSetting('currency', payload.currency);
    await setSetting('user_name', payload.name);
    await setSetting('theme', 'light');
    await setSetting('autolock_minutes', '0');

    if (payload.useDemo) {
      await seedDemoRows(generateDemoData());
      await setSetting('is_demo', '1');
    } else {
      await seedDefaultCategories();
      for (let i = 0; i < payload.accounts.length; i++) {
        const a = payload.accounts[i];
        await insertAccount({
          name: a.name,
          type: a.type,
          initial_balance: a.initial_balance,
          currency: payload.currency,
          color: '#0E5E63',
          icon: 'wallet',
          is_protected: a.is_protected ?? (a.type === 'savings' ? 1 : 0),
          is_active: 1,
          sort_order: i,
        });
      }
      await setSetting('is_demo', '0');
    }
  });
}

/** Demo verilerini id'leriyle birlikte ekler (FK'ler tutarlı kalsın diye). */
async function seedDemoRows(data: DemoData): Promise<void> {
  const bulk = async (table: string, cols: string[], rows: Record<string, unknown>[]) => {
    for (const row of rows) {
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
      await execute(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`, cols.map((c) => row[c]));
    }
  };

  await bulk('categories', ['id', 'name', 'parent_id', 'kind', 'color', 'icon', 'is_default', 'sort_order', 'created_at', 'updated_at'], data.categories as unknown as Record<string, unknown>[]);
  await bulk('accounts', ['id', 'name', 'type', 'initial_balance', 'currency', 'color', 'icon', 'is_protected', 'is_active', 'sort_order', 'created_at', 'updated_at'], data.accounts as unknown as Record<string, unknown>[]);
  await bulk('debts', ['id', 'name', 'creditor', 'original_amount', 'total_repayment_amount', 'previously_paid_amount', 'start_date', 'due_date', 'planned_payment_amount', 'payment_frequency', 'status', 'color', 'icon', 'note', 'created_at', 'updated_at'], data.debts as unknown as Record<string, unknown>[]);
  await bulk('transactions', ['id', 'type', 'amount', 'account_id', 'destination_account_id', 'category_id', 'debt_id', 'savings_goal_id', 'merchant', 'description', 'payment_method', 'transaction_date', 'note', 'include_in_budget', 'has_receipt', 'linked_transaction_id', 'is_recurring_instance', 'created_at', 'updated_at'], data.transactions as unknown as Record<string, unknown>[]);
  await bulk('debt_payments', ['id', 'debt_id', 'account_id', 'amount', 'payment_date', 'description', 'linked_income_transaction_id', 'linked_transaction_id', 'created_at', 'updated_at'], data.debtPayments as unknown as Record<string, unknown>[]);
  await bulk('savings_goals', ['id', 'name', 'target_amount', 'account_id', 'start_date', 'target_date', 'contribution_type', 'color', 'icon', 'note', 'is_completed', 'created_at', 'updated_at'], data.savingsGoals as unknown as Record<string, unknown>[]);
  await bulk('budgets', ['id', 'name', 'method', 'category_id', 'limit_amount', 'period', 'is_active', 'created_at', 'updated_at'], data.budgets as unknown as Record<string, unknown>[]);
  await bulk('purchase_wishlist', ['id', 'name', 'estimated_price', 'priority', 'planned_date', 'savings_goal_id', 'note', 'is_purchased', 'created_at', 'updated_at'], data.wishlist as unknown as Record<string, unknown>[]);
  await bulk('recurring_transactions', ['id', 'name', 'type', 'amount', 'account_id', 'destination_account_id', 'category_id', 'debt_id', 'merchant', 'frequency', 'interval_days', 'next_due_date', 'last_run_date', 'status', 'is_active', 'note', 'created_at', 'updated_at'], data.recurring as unknown as Record<string, unknown>[]);
}

/** Mevcut kurulu uygulamaya demo verisi yükler (ayarlardan). */
export async function loadDemoData(): Promise<void> {
  await clearAllData(true);
  await withTransaction(async () => {
    await seedDemoRows(generateDemoData());
    await setSetting('is_demo', '1');
  });
}

/** Tüm veriyi bir pakette yükler. */
export async function loadAllData(): Promise<DataBundle> {
  const [user] = await select<User>('SELECT * FROM users ORDER BY id LIMIT 1');
  const settingsRows = await select<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: Record<string, string> = {};
  for (const r of settingsRows) settings[r.key] = r.value;

  return {
    user: user ?? null,
    settings,
    accounts: await select<Account>('SELECT * FROM accounts ORDER BY sort_order, id'),
    categories: await select<Category>('SELECT * FROM categories ORDER BY sort_order, id'),
    transactions: await select<Transaction>('SELECT * FROM transactions ORDER BY transaction_date DESC, id DESC'),
    transactionItems: await select<TransactionItem>('SELECT * FROM transaction_items ORDER BY id'),
    debts: await select<Debt>('SELECT * FROM debts ORDER BY created_at DESC, id DESC'),
    debtPayments: await select<DebtPayment>('SELECT * FROM debt_payments ORDER BY payment_date DESC, id DESC'),
    savingsGoals: await select<SavingsGoal>('SELECT * FROM savings_goals ORDER BY id'),
    budgets: await select<Budget>('SELECT * FROM budgets ORDER BY id'),
    wishlist: await select<WishlistItem>('SELECT * FROM purchase_wishlist ORDER BY id'),
    recurring: await select<RecurringTransaction>('SELECT * FROM recurring_transactions ORDER BY next_due_date'),
  };
}

/** Tüm finansal verileri temizler. keepCategories=true ise varsayılan kategoriler kalır. */
export async function clearAllData(keepCategories = true): Promise<void> {
  const tables = [
    'transaction_tags',
    'attachments',
    'transaction_items',
    'transactions',
    'debt_payments',
    'debts',
    'savings_contributions',
    'savings_goals',
    'budgets',
    'purchase_wishlist',
    'recurring_transactions',
    'notifications',
    'tags',
    'accounts',
  ];
  await withTransaction(async () => {
    for (const t of tables) await execute(`DELETE FROM ${t}`);
    if (!keepCategories) await execute('DELETE FROM categories');
    await setSetting('is_demo', '0');
  });
}

/** Genel amaçlı: bir satır nesnesini (id dahil) tabloya ekler. */
async function insertRowWithId(table: string, row: Record<string, unknown>): Promise<void> {
  const keys = Object.keys(row).filter((k) => row[k] !== undefined);
  const cols = keys.join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values = keys.map((k) => row[k] as unknown);
  await execute(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values);
}

/**
 * Yedekten tüm veriyi geri yükler (Tauri/DB modu).
 * Mevcut tüm veriyi (kategoriler dahil) siler, ardından yedekteki satırları
 * ID'leri koruyarak yeniden yazar. Tek bir işlem (transaction) içinde çalışır.
 */
export async function importBundle(bundle: DataBundle): Promise<void> {
  const clearOrder = [
    'transaction_tags', 'attachments', 'transaction_items', 'transactions',
    'debt_payments', 'debts', 'savings_contributions', 'savings_goals',
    'budgets', 'purchase_wishlist', 'recurring_transactions', 'notifications',
    'tags', 'accounts', 'categories',
  ];

  await withTransaction(async () => {
    for (const t of clearOrder) await execute(`DELETE FROM ${t}`);

    // Bağımlılık sırasına göre ekle: hesaplar & kategoriler önce, sonra işlemler & kalemler.
    for (const a of bundle.accounts) await insertRowWithId('accounts', a as unknown as Record<string, unknown>);
    for (const c of bundle.categories) await insertRowWithId('categories', c as unknown as Record<string, unknown>);
    for (const t of bundle.transactions) await insertRowWithId('transactions', t as unknown as Record<string, unknown>);
    for (const it of bundle.transactionItems) await insertRowWithId('transaction_items', it as unknown as Record<string, unknown>);
    for (const d of bundle.debts) await insertRowWithId('debts', d as unknown as Record<string, unknown>);
    for (const p of bundle.debtPayments) await insertRowWithId('debt_payments', p as unknown as Record<string, unknown>);
    for (const g of bundle.savingsGoals) await insertRowWithId('savings_goals', g as unknown as Record<string, unknown>);
    for (const b of bundle.budgets) await insertRowWithId('budgets', b as unknown as Record<string, unknown>);
    for (const r of bundle.recurring) await insertRowWithId('recurring_transactions', r as unknown as Record<string, unknown>);
    for (const w of bundle.wishlist) await insertRowWithId('purchase_wishlist', w as unknown as Record<string, unknown>);

    // Kullanıcı & ayarlar
    if (bundle.user) {
      await execute('DELETE FROM users');
      await insertRowWithId('users', bundle.user as unknown as Record<string, unknown>);
    }
    for (const [k, v] of Object.entries(bundle.settings)) await setSetting(k, v);
    await setSetting('is_demo', '0');
  });
}
