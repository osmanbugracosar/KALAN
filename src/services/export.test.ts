import { describe, it, expect } from 'vitest';
import { transactionsToCsv } from './export';
import type { Transaction } from '../domain/types';

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: 1, type: 'expense', amount: 12345, account_id: 1, destination_account_id: null,
    category_id: 1, debt_id: null, savings_goal_id: null, merchant: 'Market', description: null,
    payment_method: null, transaction_date: '2026-01-15T12:00:00', note: null,
    include_in_budget: 1, has_receipt: 0, linked_transaction_id: null, is_recurring_instance: 0,
    created_at: '', updated_at: '', ...partial,
  };
}

const lookups = { accountName: () => 'Nakit', categoryName: () => 'Market' };

describe('transactionsToCsv', () => {
  it('BOM ile başlar ve başlık satırı içerir', () => {
    const csv = transactionsToCsv([], lookups);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Tarih;Tür;Tutar');
  });

  it('gider negatif, gelir pozitif işaretli; TR ondalık virgülü', () => {
    const csv = transactionsToCsv([tx({ type: 'expense', amount: 12345 }), tx({ id: 2, type: 'income', amount: 500000 })], lookups);
    const lines = csv.split('\r\n');
    expect(lines[1]).toContain('-123,45');
    expect(lines[2]).toContain('5000,00');
  });

  it('virgül/noktalı virgül içeren alanları tırnaklar', () => {
    const csv = transactionsToCsv([tx({ merchant: 'A; B, C' })], lookups);
    expect(csv).toContain('"A; B, C"');
  });

  it('tarihi GG.AA.YYYY biçimler', () => {
    const csv = transactionsToCsv([tx({ transaction_date: '2026-01-15T12:00:00' })], lookups);
    expect(csv).toContain('15.01.2026');
  });
});
