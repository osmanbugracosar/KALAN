/**
 * Eşleme katmanı.
 * Borç ödemeleri ayrı tabloda tutulur; hesaplama motoru ve birleşik işlem
 * listesi için sentetik 'debt_payment' işlemlerine çevrilir.
 * Sentetik işlemler asla veritabanına yazılmaz (negatif id ile işaretlenir).
 */

import type { DebtPayment, Transaction } from '../domain/types';

/** Bir borç ödemesini sentetik nakit-çıkış işlemine çevirir. */
export function debtPaymentToTransaction(p: DebtPayment): Transaction {
  return {
    id: -p.id, // sentetik: negatif id, DB'ye yazılmaz
    type: 'debt_payment',
    amount: p.amount,
    account_id: p.account_id,
    destination_account_id: null,
    category_id: null,
    debt_id: p.debt_id,
    savings_goal_id: null,
    merchant: null,
    description: p.description,
    payment_method: null,
    transaction_date: p.payment_date.length === 10 ? `${p.payment_date}T00:00:00` : p.payment_date,
    note: null,
    include_in_budget: 0,
    has_receipt: 0,
    linked_transaction_id: p.linked_transaction_id,
    is_recurring_instance: 0,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

/**
 * Gerçek işlemler + borç ödemelerinden türeyen sentetik işlemler.
 * Hesaplamalar ve birleşik "İşlemler" listesi bunu kullanır.
 */
export function effectiveTransactions(transactions: Transaction[], debtPayments: DebtPayment[]): Transaction[] {
  return [...transactions, ...debtPayments.map(debtPaymentToTransaction)];
}

/** Sentetik (borç ödemesinden türeyen) işlem mi? */
export function isSyntheticTxn(t: Transaction): boolean {
  return t.id < 0;
}
