-- Kalan — başlangıç şeması (v1)
-- Tüm para alanları KURUŞ (tam sayı). Tarihler yerel "YYYY-MM-DDTHH:mm:ss" metni.

CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL,
  currency       TEXT    NOT NULL DEFAULT 'TRY',
  pin_hash       TEXT,
  pin_salt       TEXT,
  spending_limit INTEGER,
  created_at     TEXT    NOT NULL,
  updated_at     TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  type            TEXT    NOT NULL,
  initial_balance INTEGER NOT NULL DEFAULT 0,
  currency        TEXT    NOT NULL DEFAULT 'TRY',
  color           TEXT    NOT NULL DEFAULT '#0E5E63',
  icon            TEXT    NOT NULL DEFAULT 'wallet',
  is_protected    INTEGER NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  parent_id  INTEGER,
  kind       TEXT    NOT NULL DEFAULT 'expense',
  color      TEXT    NOT NULL DEFAULT '#6B7280',
  icon       TEXT    NOT NULL DEFAULT 'tag',
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  type                   TEXT    NOT NULL,
  amount                 INTEGER NOT NULL,
  account_id             INTEGER,
  destination_account_id INTEGER,
  category_id            INTEGER,
  debt_id                INTEGER,
  savings_goal_id        INTEGER,
  merchant               TEXT,
  description            TEXT,
  payment_method         TEXT,
  transaction_date       TEXT    NOT NULL,
  note                   TEXT,
  include_in_budget      INTEGER NOT NULL DEFAULT 1,
  has_receipt            INTEGER NOT NULL DEFAULT 0,
  linked_transaction_id  INTEGER,
  is_recurring_instance  INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT    NOT NULL,
  updated_at             TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  name           TEXT    NOT NULL,
  quantity       REAL    NOT NULL DEFAULT 1,
  unit_price     INTEGER NOT NULL DEFAULT 0,
  total_amount   INTEGER NOT NULL DEFAULT 0,
  category_id    INTEGER,
  subcategory_id INTEGER,
  note           TEXT,
  created_at     TEXT    NOT NULL,
  updated_at     TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  file_name      TEXT    NOT NULL,
  mime_type      TEXT    NOT NULL,
  data_base64    TEXT,
  created_at     TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  color      TEXT    NOT NULL DEFAULT '#6B7280',
  created_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS debts (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  name                    TEXT    NOT NULL,
  creditor                TEXT,
  original_amount         INTEGER NOT NULL DEFAULT 0,
  total_repayment_amount  INTEGER NOT NULL DEFAULT 0,
  previously_paid_amount  INTEGER NOT NULL DEFAULT 0,
  start_date              TEXT    NOT NULL,
  due_date                TEXT,
  planned_payment_amount  INTEGER,
  payment_frequency       TEXT    NOT NULL DEFAULT 'monthly',
  status                  TEXT    NOT NULL DEFAULT 'active',
  color                   TEXT    NOT NULL DEFAULT '#D9822B',
  icon                    TEXT    NOT NULL DEFAULT 'landmark',
  note                    TEXT,
  created_at              TEXT    NOT NULL,
  updated_at              TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id                            INTEGER PRIMARY KEY AUTOINCREMENT,
  debt_id                       INTEGER NOT NULL,
  account_id                    INTEGER,
  amount                        INTEGER NOT NULL,
  payment_date                  TEXT    NOT NULL,
  description                   TEXT,
  linked_income_transaction_id  INTEGER,
  linked_transaction_id         INTEGER,
  created_at                    TEXT    NOT NULL,
  updated_at                    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS budgets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  method       TEXT    NOT NULL DEFAULT 'manual_limit',
  category_id  INTEGER,
  limit_amount INTEGER NOT NULL DEFAULT 0,
  period       TEXT    NOT NULL DEFAULT 'monthly',
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS savings_goals (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL,
  target_amount     INTEGER NOT NULL DEFAULT 0,
  account_id        INTEGER,
  start_date        TEXT    NOT NULL,
  target_date       TEXT,
  contribution_type TEXT    NOT NULL DEFAULT 'manual',
  color             TEXT    NOT NULL DEFAULT '#2563C7',
  icon              TEXT    NOT NULL DEFAULT 'target',
  note              TEXT,
  is_completed      INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    NOT NULL,
  updated_at        TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS savings_contributions (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  savings_goal_id       INTEGER NOT NULL,
  amount                INTEGER NOT NULL,
  contribution_date     TEXT    NOT NULL,
  linked_transaction_id INTEGER,
  created_at            TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  name                   TEXT    NOT NULL,
  type                   TEXT    NOT NULL,
  amount                 INTEGER NOT NULL,
  account_id             INTEGER,
  destination_account_id INTEGER,
  category_id            INTEGER,
  debt_id                INTEGER,
  merchant               TEXT,
  frequency              TEXT    NOT NULL DEFAULT 'monthly',
  interval_days          INTEGER,
  next_due_date          TEXT    NOT NULL,
  last_run_date          TEXT,
  status                 TEXT    NOT NULL DEFAULT 'pending',
  is_active              INTEGER NOT NULL DEFAULT 1,
  note                   TEXT,
  created_at             TEXT    NOT NULL,
  updated_at             TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_wishlist (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  estimated_price INTEGER NOT NULL DEFAULT 0,
  priority        TEXT    NOT NULL DEFAULT 'medium',
  planned_date    TEXT,
  savings_goal_id INTEGER,
  note            TEXT,
  is_purchased    INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  body         TEXT    NOT NULL,
  kind         TEXT    NOT NULL DEFAULT 'info',
  is_read      INTEGER NOT NULL DEFAULT 0,
  related_type TEXT,
  related_id   INTEGER,
  created_at   TEXT    NOT NULL
);

-- Sık kullanılan sorgular için indeksler
CREATE INDEX IF NOT EXISTS idx_txn_date        ON transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_txn_account     ON transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_txn_category    ON transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_txn_type        ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_pay_debt        ON debt_payments (debt_id);
CREATE INDEX IF NOT EXISTS idx_items_txn       ON transaction_items (transaction_id);
CREATE INDEX IF NOT EXISTS idx_contrib_goal    ON savings_contributions (savings_goal_id);
CREATE INDEX IF NOT EXISTS idx_recurring_due   ON recurring_transactions (next_due_date);
