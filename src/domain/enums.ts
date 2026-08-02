/** İşlem türleri. Değerler veritabanında saklanır; etiketler arayüzde gösterilir. */
export const TransactionType = {
  income: 'income',
  expense: 'expense',
  transfer: 'transfer',
  debt_inflow: 'debt_inflow',
  debt_payment: 'debt_payment',
  savings_contribution: 'savings_contribution',
  savings_withdrawal: 'savings_withdrawal',
  refund: 'refund',
  adjustment: 'adjustment',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Gelir',
  expense: 'Gider',
  transfer: 'Hesaplar arası transfer',
  debt_inflow: 'Borç kaynaklı para girişi',
  debt_payment: 'Borç ödemesi',
  savings_contribution: 'Birikime aktarma',
  savings_withdrawal: 'Birikimden geri çekme',
  refund: 'İade',
  adjustment: 'Bakiye düzeltmesi',
};

/** Gelir ve gider toplamlarına dahil edilmeyen (nakit akışını çarpıtmayan) çift bacaklı türler. */
export const TWO_LEGGED_TYPES: TransactionType[] = ['transfer', 'savings_contribution', 'savings_withdrawal'];

export const AccountType = {
  cash: 'cash',
  bank: 'bank',
  card: 'card',
  savings: 'savings',
  wallet: 'wallet',
  other: 'other',
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Nakit',
  bank: 'Banka hesabı',
  card: 'Banka kartı',
  savings: 'Birikim hesabı',
  wallet: 'Dijital cüzdan',
  other: 'Diğer',
};

export const DebtStatus = {
  active: 'active',
  due_soon: 'due_soon',
  overdue: 'overdue',
  completed: 'completed',
  frozen: 'frozen',
} as const;
export type DebtStatus = (typeof DebtStatus)[keyof typeof DebtStatus];

export const DEBT_STATUS_LABELS: Record<DebtStatus, string> = {
  active: 'Aktif',
  due_soon: 'Ödemesi yaklaşıyor',
  overdue: 'Gecikmiş',
  completed: 'Tamamlandı',
  frozen: 'Donduruldu',
};

export const PaymentFrequency = {
  once: 'once',
  weekly: 'weekly',
  monthly: 'monthly',
  yearly: 'yearly',
  custom: 'custom',
} as const;
export type PaymentFrequency = (typeof PaymentFrequency)[keyof typeof PaymentFrequency];

export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  once: 'Tek seferlik',
  weekly: 'Haftalık',
  monthly: 'Aylık',
  yearly: 'Yıllık',
  custom: 'Özel aralık',
};

export const RecurringStatus = {
  pending: 'pending',
  paid: 'paid',
  postponed: 'postponed',
  skipped: 'skipped',
} as const;
export type RecurringStatus = (typeof RecurringStatus)[keyof typeof RecurringStatus];

export const RECURRING_STATUS_LABELS: Record<RecurringStatus, string> = {
  pending: 'Bekliyor',
  paid: 'Ödendi',
  postponed: 'Ertelendi',
  skipped: 'Atlandı',
};

/** Ödeme yöntemleri (serbest metin de olabilir; bunlar öneri listesidir). */
export const PAYMENT_METHODS = [
  'Nakit',
  'Banka Kartı',
  'Kredi Kartı',
  'Havale/EFT',
  'Otomatik Ödeme',
  'QR / Dijital Cüzdan',
  'Diğer',
] as const;
