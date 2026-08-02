import type { Kurus } from '../core/money';
import type {
  AccountType,
  DebtStatus,
  PaymentFrequency,
  RecurringStatus,
  TransactionType,
} from './enums';

/**
 * Tüm para alanları KURUŞ (tam sayı) cinsindendir.
 * Tarih alanları yerel "YYYY-MM-DDTHH:mm:ss" biçimindedir.
 */

export interface User {
  id: number;
  name: string;
  currency: string; // ISO kodu, örn. "TRY"
  pin_hash: string | null;
  pin_salt: string | null;
  spending_limit: Kurus | null; // isteğe bağlı aylık harcama sınırı
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  initial_balance: Kurus;
  currency: string;
  color: string;
  icon: string;
  is_protected: number; // 1 ise "korumalı birikim" (kullanılabilir bakiyeden düşülür)
  is_active: number; // 1 aktif, 0 pasif
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  parent_id: number | null; // alt kategori ise ana kategori id'si
  kind: 'expense' | 'income';
  color: string;
  icon: string;
  is_default: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: Kurus; // adjustment dışında daima pozitif
  account_id: number | null;
  destination_account_id: number | null;
  category_id: number | null;
  debt_id: number | null; // borç kaynaklı/borç ödemesi işlemlerinde ilgili borç
  savings_goal_id: number | null;
  merchant: string | null; // işletme veya kişi
  description: string | null;
  payment_method: string | null;
  transaction_date: string;
  note: string | null;
  include_in_budget: number; // 1 dahil, 0 hariç
  has_receipt: number;
  linked_transaction_id: number | null; // bağlantılı işlem (örn. gelir->borç ödemesi)
  is_recurring_instance: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionItem {
  id: number;
  transaction_id: number;
  name: string;
  quantity: number;
  unit_price: Kurus;
  total_amount: Kurus;
  category_id: number | null;
  subcategory_id: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: number;
  transaction_id: number;
  file_name: string;
  mime_type: string;
  data_base64: string | null;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface Debt {
  id: number;
  name: string;
  creditor: string | null; // borç alınan kişi/kurum
  original_amount: Kurus; // başlangıç (anapara) tutarı
  total_repayment_amount: Kurus; // toplam geri ödenecek tutar
  previously_paid_amount: Kurus; // uygulama dışında daha önce ödenen
  start_date: string;
  due_date: string | null;
  planned_payment_amount: Kurus | null;
  payment_frequency: PaymentFrequency;
  status: DebtStatus;
  color: string;
  icon: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DebtPayment {
  id: number;
  debt_id: number;
  account_id: number | null;
  amount: Kurus;
  payment_date: string;
  description: string | null;
  linked_income_transaction_id: number | null;
  linked_transaction_id: number | null; // oluşturulan nakit çıkış işlemi
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: number;
  name: string;
  method: 'balance_based' | 'manual_limit' | 'category_based' | 'weekly_limit';
  category_id: number | null; // kategori bazlı ise
  limit_amount: Kurus;
  period: 'monthly' | 'weekly';
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: Kurus;
  account_id: number | null; // biriktirilen hesap
  start_date: string;
  target_date: string | null;
  contribution_type: 'manual' | 'automatic';
  color: string;
  icon: string;
  note: string | null;
  is_completed: number;
  created_at: string;
  updated_at: string;
}

export interface SavingsContribution {
  id: number;
  savings_goal_id: number;
  amount: Kurus;
  contribution_date: string;
  linked_transaction_id: number | null;
  created_at: string;
}

export interface RecurringTransaction {
  id: number;
  name: string;
  type: TransactionType;
  amount: Kurus;
  account_id: number | null;
  destination_account_id: number | null;
  category_id: number | null;
  debt_id: number | null;
  merchant: string | null;
  frequency: PaymentFrequency;
  interval_days: number | null; // özel aralık için
  next_due_date: string;
  last_run_date: string | null;
  status: RecurringStatus;
  is_active: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: number;
  name: string;
  estimated_price: Kurus;
  priority: 'low' | 'medium' | 'high';
  planned_date: string | null;
  savings_goal_id: number | null;
  note: string | null;
  is_purchased: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  title: string;
  body: string;
  kind: 'info' | 'warning' | 'due';
  is_read: number;
  related_type: string | null;
  related_id: number | null;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
}
