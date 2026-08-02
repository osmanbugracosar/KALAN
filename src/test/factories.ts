/** Testler için varsayılan alanlarla domain nesnesi üreten yardımcılar. */

import type { Account, Debt, DebtPayment, Transaction } from '../domain/types';
import type { AccountType, DebtStatus, PaymentFrequency, TransactionType } from '../domain/enums';

let idSeq = 1;
export function nextId(): number {
  return idSeq++;
}
export function resetIds(): void {
  idSeq = 1;
}

const NOW = '2026-07-15T10:00:00';

export function makeAccount(over: Partial<Account> = {}): Account {
  return {
    id: over.id ?? nextId(),
    name: 'Hesap',
    type: (over.type ?? 'bank') as AccountType,
    initial_balance: 0,
    currency: 'TRY',
    color: '#0E5E63',
    icon: 'wallet',
    is_protected: 0,
    is_active: 1,
    sort_order: 0,
    created_at: NOW,
    updated_at: NOW,
    ...over,
  };
}

export function makeTransaction(over: Partial<Transaction> = {}): Transaction {
  return {
    id: over.id ?? nextId(),
    type: (over.type ?? 'expense') as TransactionType,
    amount: 0,
    account_id: null,
    destination_account_id: null,
    category_id: null,
    debt_id: null,
    savings_goal_id: null,
    merchant: null,
    description: null,
    payment_method: null,
    transaction_date: '2026-07-10T12:00:00',
    note: null,
    include_in_budget: 1,
    has_receipt: 0,
    linked_transaction_id: null,
    is_recurring_instance: 0,
    created_at: NOW,
    updated_at: NOW,
    ...over,
  };
}

export function makeDebt(over: Partial<Debt> = {}): Debt {
  return {
    id: over.id ?? nextId(),
    name: 'Borç',
    creditor: null,
    original_amount: 0,
    total_repayment_amount: 0,
    previously_paid_amount: 0,
    start_date: '2026-01-01',
    due_date: null,
    planned_payment_amount: null,
    payment_frequency: 'monthly' as PaymentFrequency,
    status: 'active' as DebtStatus,
    color: '#D9822B',
    icon: 'credit-card',
    note: null,
    created_at: NOW,
    updated_at: NOW,
    ...over,
  };
}

export function makeDebtPayment(over: Partial<DebtPayment> = {}): DebtPayment {
  return {
    id: over.id ?? nextId(),
    debt_id: over.debt_id ?? 0,
    account_id: null,
    amount: 0,
    payment_date: '2026-07-10',
    description: null,
    linked_income_transaction_id: null,
    linked_transaction_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...over,
  };
}
