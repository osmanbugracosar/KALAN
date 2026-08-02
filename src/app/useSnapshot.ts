import { useShallow } from 'zustand/react/shallow';
import { useFinanceStore } from '../store/useFinanceStore';
import type { Snapshot } from '../store/selectors';

/**
 * Finans store'undan seçicilerin beklediği anlık görüntüyü üretir.
 * useShallow ile sığ karşılaştırma yapılır; gereksiz yeniden render önlenir.
 */
export function useSnapshot(): Snapshot {
  return useFinanceStore(
    useShallow((s) => ({
      user: s.user,
      accounts: s.accounts,
      categories: s.categories,
      transactions: s.transactions,
      transactionItems: s.transactionItems,
      debts: s.debts,
      debtPayments: s.debtPayments,
      savingsGoals: s.savingsGoals,
      budgets: s.budgets,
      recurring: s.recurring,
      settings: s.settings,
    })),
  );
}
