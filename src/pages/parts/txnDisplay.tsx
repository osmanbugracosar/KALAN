import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Landmark,
  PiggyBank,
  Undo2,
  Wrench,
  Banknote,
  type LucideIcon,
} from 'lucide-react';
import type { Transaction } from '../../domain/types';
import type { TransactionType } from '../../domain/enums';

export interface TxnVisual {
  icon: LucideIcon;
  label: string;
  /** +1 hesaba giriş, -1 hesaptan çıkış, 0 nötr (transfer) */
  direction: 1 | -1 | 0;
  tone: 'income' | 'expense' | 'debt' | 'savings' | 'muted' | 'brand';
}

const MAP: Record<TransactionType, TxnVisual> = {
  income: { icon: TrendingUp, label: 'Gelir', direction: 1, tone: 'income' },
  expense: { icon: TrendingDown, label: 'Gider', direction: -1, tone: 'expense' },
  transfer: { icon: ArrowLeftRight, label: 'Transfer', direction: 0, tone: 'brand' },
  debt_inflow: { icon: Banknote, label: 'Borç girişi', direction: 1, tone: 'debt' },
  debt_payment: { icon: Landmark, label: 'Borç ödemesi', direction: -1, tone: 'debt' },
  savings_contribution: { icon: PiggyBank, label: 'Birikime aktarma', direction: -1, tone: 'savings' },
  savings_withdrawal: { icon: PiggyBank, label: 'Birikimden çekme', direction: 1, tone: 'savings' },
  refund: { icon: Undo2, label: 'İade', direction: 1, tone: 'income' },
  adjustment: { icon: Wrench, label: 'Düzeltme', direction: 0, tone: 'muted' },
};

export function txnVisual(t: Transaction): TxnVisual {
  return MAP[t.type];
}
