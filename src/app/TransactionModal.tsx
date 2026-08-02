import { useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, Input, Select, MoneyInput, Textarea } from '../ui/Field';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUIStore } from '../store/useUIStore';
import { useModals, type TxModalMode } from './useModals';
import { parseAmountToKurus } from '../core/money';
import { toLocalIso, todayLocalDate } from '../core/date';
import { PAYMENT_METHODS } from '../domain/enums';
import type { TransactionType } from '../domain/enums';
import { debtRemaining } from '../services/calculations';

const TITLES: Record<TxModalMode, string> = {
  income: 'Gelir ekle',
  expense: 'Gider ekle',
  transfer: 'Hesaplar arası transfer',
  savings: 'Birikime aktar',
};

export function TransactionModal() {
  const mode = useModals((s) => s.txModal);
  const close = useModals((s) => s.closeTx);
  return mode ? <Inner mode={mode} onClose={close} /> : null;
}

function Inner({ mode, onClose }: { mode: TxModalMode; onClose: () => void }) {
  const accounts = useFinanceStore((s) => s.accounts);
  const categories = useFinanceStore((s) => s.categories);
  const debts = useFinanceStore((s) => s.debts);
  const debtPayments = useFinanceStore((s) => s.debtPayments);
  const savingsGoals = useFinanceStore((s) => s.savingsGoals);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const addIncomeRoutedToDebt = useFinanceStore((s) => s.addIncomeRoutedToDebt);
  const pushToast = useUIStore((s) => s.pushToast);

  const activeAccounts = accounts.filter((a) => a.is_active === 1);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<number | ''>(activeAccounts[0]?.id ?? '');
  const [destId, setDestId] = useState<number | ''>(activeAccounts[1]?.id ?? activeAccounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [goalId, setGoalId] = useState<number | ''>(savingsGoals[0]?.id ?? '');
  const [merchant, setMerchant] = useState('');
  const [method, setMethod] = useState('');
  const [date, setDate] = useState(todayLocalDate());
  const [note, setNote] = useState('');
  const [inBudget, setInBudget] = useState(true);

  // Gelirden borca yönlendirme
  const [routeToDebt, setRouteToDebt] = useState(false);
  const [routeDebtId, setRouteDebtId] = useState<number | ''>('');
  const [routeAmount, setRouteAmount] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catOptions = useMemo(
    () => categories.filter((c) => (mode === 'income' ? c.kind === 'income' : c.kind === 'expense')),
    [categories, mode],
  );
  const openDebts = debts.filter((d) => debtRemaining(d, debtPayments) > 0);

  const submit = async () => {
    setError(null);
    const amt = parseAmountToKurus(amount);
    if (amt == null || amt <= 0) {
      setError('Geçerli bir tutar girin.');
      return;
    }
    if ((mode === 'income' || mode === 'expense' || mode === 'savings') && accountId === '') {
      setError('Hesap seçin.');
      return;
    }
    if (mode === 'transfer') {
      if (accountId === '' || destId === '') {
        setError('Gönderen ve alıcı hesabı seçin.');
        return;
      }
      if (accountId === destId) {
        setError('Gönderen ve alıcı hesap aynı olamaz.');
        return;
      }
    }
    if (mode === 'savings' && goalId === '') {
      setError('Birikim hedefi seçin.');
      return;
    }

    const iso = toLocalIso(date, '12:00');
    setBusy(true);
    try {
      if (mode === 'income' && routeToDebt) {
        const portion = parseAmountToKurus(routeAmount);
        if (routeDebtId === '' || portion == null || portion <= 0) {
          setError('Borç ve borca ayrılan tutarı girin.');
          setBusy(false);
          return;
        }
        const income = {
          type: 'income' as TransactionType,
          amount: amt,
          account_id: accountId === '' ? null : Number(accountId),
          destination_account_id: null,
          category_id: categoryId === '' ? null : Number(categoryId),
          debt_id: null,
          savings_goal_id: null,
          merchant: merchant || null,
          description: null,
          payment_method: null,
          transaction_date: iso,
          note: note || null,
          include_in_budget: 0,
          has_receipt: 0,
          linked_transaction_id: null,
          is_recurring_instance: 0,
        };
        const res = await addIncomeRoutedToDebt(income, Number(routeDebtId), portion, accountId === '' ? null : Number(accountId));
        if (!res.ok) {
          setError(res.message ?? 'İşlem tamamlanamadı.');
          setBusy(false);
          return;
        }
        pushToast('success', 'Gelir eklendi ve bir kısmı borca yönlendirildi.');
        onClose();
        return;
      }

      const type: TransactionType =
        mode === 'income' ? 'income' : mode === 'expense' ? 'expense' : mode === 'transfer' ? 'transfer' : 'savings_contribution';

      await addTransaction({
        type,
        amount: amt,
        account_id: accountId === '' ? null : Number(accountId),
        destination_account_id: mode === 'transfer' || mode === 'savings' ? (mode === 'transfer' ? Number(destId) : null) : null,
        category_id: mode === 'expense' || mode === 'income' ? (categoryId === '' ? null : Number(categoryId)) : null,
        debt_id: null,
        savings_goal_id: mode === 'savings' ? Number(goalId) : null,
        merchant: merchant || null,
        description: null,
        payment_method: mode === 'expense' ? method || null : null,
        transaction_date: iso,
        note: note || null,
        include_in_budget: mode === 'expense' ? (inBudget ? 1 : 0) : 0,
        has_receipt: 0,
        linked_transaction_id: null,
        is_recurring_instance: 0,
      });
      pushToast('success', `${TITLES[mode]} tamamlandı.`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beklenmeyen bir hata oluştu.');
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={TITLES[mode]}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Tutar" error={error && !amount ? error : null}>
          <MoneyInput placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>

        {mode === 'transfer' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gönderen hesap">
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value === '' ? '' : Number(e.target.value))}>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Alıcı hesap">
              <Select value={destId} onChange={(e) => setDestId(e.target.value === '' ? '' : Number(e.target.value))}>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : (
          <Field label={mode === 'income' ? 'Hangi hesaba girdi?' : mode === 'savings' ? 'Hangi hesaptan?' : 'Hangi hesaptan çıktı?'}>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value === '' ? '' : Number(e.target.value))}>
              {activeAccounts.length === 0 && <option value="">Önce hesap ekleyin</option>}
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {(mode === 'income' || mode === 'expense') && (
          <Field label="Kategori" hint={catOptions.length === 0 ? 'Kategori bulunamadı' : undefined}>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Kategorisiz</option>
              {catOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_id ? '— ' : ''}
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {mode === 'savings' && (
          <Field label="Birikim hedefi">
            <Select value={goalId} onChange={(e) => setGoalId(e.target.value === '' ? '' : Number(e.target.value))}>
              {savingsGoals.length === 0 && <option value="">Önce birikim hedefi ekleyin</option>}
              {savingsGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {mode !== 'transfer' && mode !== 'savings' && (
          <Field label={mode === 'income' ? 'Kaynak (kişi/kurum)' : 'İşletme / kime'}>
            <Input placeholder={mode === 'income' ? 'örn. Serbest iş, kira geliri' : 'örn. Market, akaryakıt'} value={merchant} onChange={(e) => setMerchant(e.target.value)} />
          </Field>
        )}

        {mode === 'expense' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ödeme yöntemi">
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="">Seçilmedi</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tarih">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
        )}

        {mode !== 'expense' && (
          <Field label="Tarih">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        )}

        {mode === 'income' && openDebts.length > 0 && (
          <div className="rounded-lg border border-line bg-elevate/60 p-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={routeToDebt} onChange={(e) => setRouteToDebt(e.target.checked)} className="h-4 w-4 accent-brand" />
              <span className="text-[13px] font-medium text-ink">Bu gelirin bir kısmını borca ayır</span>
            </label>
            {routeToDebt && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Borç">
                  <Select value={routeDebtId} onChange={(e) => setRouteDebtId(e.target.value === '' ? '' : Number(e.target.value))}>
                    <option value="">Seçin</option>
                    {openDebts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Borca ayrılan">
                  <MoneyInput placeholder="0,00" value={routeAmount} onChange={(e) => setRouteAmount(e.target.value)} />
                </Field>
              </div>
            )}
          </div>
        )}

        {mode === 'expense' && (
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={inBudget} onChange={(e) => setInBudget(e.target.checked)} className="h-4 w-4 accent-brand" />
            <span className="text-[13px] text-ink/80">Bütçe/harcama sınırına dahil et</span>
          </label>
        )}

        <Field label="Not (isteğe bağlı)">
          <Textarea placeholder="Kısa bir açıklama…" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        {error && amount && <p className="text-[13px] text-expense">{error}</p>}
      </div>
    </Modal>
  );
}
