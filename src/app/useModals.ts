import { create } from 'zustand';

export type TxModalMode = 'income' | 'expense' | 'transfer' | 'savings';

interface ModalState {
  txModal: TxModalMode | null;
  openTx: (m: TxModalMode) => void;
  closeTx: () => void;
}

export const useModals = create<ModalState>((set) => ({
  txModal: null,
  openTx: (m) => set({ txModal: m }),
  closeTx: () => set({ txModal: null }),
}));
