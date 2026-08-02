import { useMemo, useState } from 'react';
import { Search, Plus, TrendingUp, TrendingDown, ArrowLeftRight, ArrowRightLeft, Pencil, Trash2 } from 'lucide-react';
import { useSnapshot } from '../app/useSnapshot';
import { useUIStore } from '../store/useUIStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useModals } from '../app/useModals';
import { effective, accountMap, categoryMap } from '../store/selectors';
import { isSyntheticTxn } from '../db/mapping';
import { isInMonth, formatDateTR, weekdayNameTR, formatMonthYearTR, toLocalIso } from '../core/date';
import { monthlyRealIncome, monthlyConsumptionExpense } from '../services/calculations';
import { parseAmountToKurus } from '../core/money';
import { TRANSACTION_TYPE_LABELS } from '../domain/enums';
import type { Transaction } from '../domain/types';
import { Card } from '../ui/Card';
import { Money } from '../ui/Money';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Field, Input, Select, Textarea, MoneyInput } from '../ui/Field';
import { EmptyState } from '../ui/misc';
import { TransactionList } from './parts/TransactionList';
import { centsToInput } from './parts/format';
import { cx } from '../ui/cx';

type Filter = 'all' | 'income' | 'expense' | 'transfer' | 'other';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'income', label: 'Gelir' },
  { id: 'expense', label: 'Gider' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'other', label: 'Diğer' },
];

export function TransactionsPage() {
  const snap = useSnapshot();
  const mKey = useUIStore((s) => s.selectedMonth);
  const pushToast = useUIStore((s) => s.pushToast);
  const openTx = useModals((s) => s.openTx);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [accFilter, setAccFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Transaction | null>(null);

  const amap = accountMap(snap);
  const cmap = categoryMap(snap);
  const eff = effective(snap);
  const monthTxns = eff.filter((t) => isInMonth(t.transaction_date, mKey));
  const income = monthlyRealIncome(monthTxns, mKey);
  const expense = monthlyConsumptionExpense(monthTxns, mKey);

  const handleSelect = (t: Transaction) => {
    if (isSyntheticTxn(t)) {
      pushToast('info', 'Bu bir borç ödemesidir; Borçlar sayfasından düzenlenir.');
      return;
    }
    setEditing(t);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    return monthTxns.filter((t) => {
      if (filter === 'income' && t.type !== 'income') return false;
      if (filter === 'expense' && t.type !== 'expense') return false;
      if (filter === 'transfer' && t.type !== 'transfer') return false;
      if (filter === 'other' && ['income', 'expense', 'transfer'].includes(t.type)) return false;
      if (accFilter !== 'all') {
        const aid = Number(accFilter);
        if (t.account_id !== aid && t.destination_account_id !== aid) return false;
      }
      if (q) {
        const cat = t.category_id != null ? cmap.get(t.category_id)?.name ?? '' : '';
        const hay = `${t.merchant ?? ''} ${t.note ?? ''} ${t.description ?? ''} ${cat}`.toLocaleLowerCase('tr');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [monthTxns, filter, query, accFilter, cmap]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <div className="space-y-5">
      {/* Özet + hızlı ekle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openTx('income')}>
            <TrendingUp size={15} className="text-income" /> Gelir
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openTx('expense')}>
            <TrendingDown size={15} className="text-expense" /> Gider
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openTx('transfer')}>
            <ArrowLeftRight size={15} className="text-brand" /> Transfer
          </Button>
        </div>
        <div className="flex items-center gap-4 text-[13px]">
          <span className="text-muted">{formatMonthYearTR(mKey)}:</span>
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp size={14} className="text-income" /> <Money value={income} tone="income" className="font-semibold" />
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TrendingDown size={14} className="text-expense" /> <Money value={expense} tone="expense" className="font-semibold" />
          </span>
        </div>
      </div>

      <Card padded={false}>
        {/* Filtre çubuğu */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-line">
          <div className="flex gap-1 bg-elevate rounded-lg p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cx(
                  'px-3 h-8 rounded-md text-[13px] font-medium transition-colors',
                  filter === f.id ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input placeholder="İşletme, kategori veya notta ara…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={accFilter} onChange={(e) => setAccFilter(e.target.value)} className="w-auto min-w-[130px]">
            <option value="all">Tüm hesaplar</option>
            {snap.accounts.filter((a) => a.is_active === 1).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ArrowRightLeft size={22} />}
            title={monthTxns.length === 0 ? 'Bu ay işlem yok' : 'Eşleşen işlem yok'}
            description={monthTxns.length === 0 ? 'Seçili ayda henüz bir hareket kaydedilmemiş.' : 'Filtre veya aramayı değiştirmeyi deneyin.'}
            action={monthTxns.length === 0 ? <Button onClick={() => openTx('expense')}><Plus size={16} /> İşlem ekle</Button> : undefined}
          />
        ) : (
          <div className="px-4 pb-2">
            {groups.map((g) => (
              <div key={g.day}>
                <div className="flex items-center justify-between pt-4 pb-1">
                  <span className="text-[12px] font-medium text-muted">
                    {formatDateTR(`${g.day}T00:00:00`)} · {weekdayNameTR(`${g.day}T00:00:00`)}
                  </span>
                  <span className="tabular text-[12px] text-muted">
                    <Money value={g.net} signed tone={g.net >= 0 ? 'income' : 'expense'} />
                  </span>
                </div>
                <TransactionList items={g.items} accountMap={amap} categoryMap={cmap} onSelect={handleSelect} dense />
              </div>
            ))}
          </div>
        )}
      </Card>

      {editing && <TxnEditModal txn={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function groupByDay(items: Transaction[]): { day: string; items: Transaction[]; net: number }[] {
  const map = new Map<string, Transaction[]>();
  for (const t of items) {
    const day = t.transaction_date.slice(0, 10);
    const arr = map.get(day) ?? [];
    arr.push(t);
    map.set(day, arr);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, its]) => {
      let net = 0;
      for (const t of its) {
        if (t.type === 'income' || t.type === 'refund' || t.type === 'debt_inflow') net += t.amount;
        else if (t.type === 'expense' || t.type === 'debt_payment') net -= t.amount;
      }
      return { day, items: its, net };
    });
}

function TxnEditModal({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
  const snap = useSnapshot();
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const pushToast = useUIStore((s) => s.pushToast);

  const activeAccounts = snap.accounts.filter((a) => a.is_active === 1);
  const isTransfer = txn.type === 'transfer';
  const showCategory = txn.type === 'income' || txn.type === 'expense';
  const cats = snap.categories.filter((c) => c.kind === (txn.type === 'income' ? 'income' : 'expense'));

  const [amount, setAmount] = useState(centsToInput(txn.amount));
  const [date, setDate] = useState(txn.transaction_date.slice(0, 10));
  const [accountId, setAccountId] = useState<string>(txn.account_id != null ? String(txn.account_id) : '');
  const [destId, setDestId] = useState<string>(txn.destination_account_id != null ? String(txn.destination_account_id) : '');
  const [categoryId, setCategoryId] = useState<string>(txn.category_id != null ? String(txn.category_id) : '');
  const [merchant, setMerchant] = useState(txn.merchant ?? '');
  const [note, setNote] = useState(txn.note ?? '');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const save = async () => {
    const amt = parseAmountToKurus(amount);
    if (!amt || amt <= 0) return pushToast('error', 'Geçerli bir tutar gir.');
    if (isTransfer && (!accountId || !destId || accountId === destId)) return pushToast('error', 'Transfer için farklı iki hesap seç.');
    const timePart = txn.transaction_date.slice(11, 16) || '12:00';
    const patch: Partial<Transaction> = {
      amount: amt,
      account_id: accountId ? Number(accountId) : null,
      destination_account_id: isTransfer ? (destId ? Number(destId) : null) : txn.destination_account_id,
      category_id: showCategory ? (categoryId ? Number(categoryId) : null) : txn.category_id,
      merchant: merchant.trim() || null,
      description: merchant.trim() || txn.description,
      note: note.trim() || null,
      transaction_date: toLocalIso(date, timePart),
    };
    setBusy(true);
    await updateTransaction(txn.id, patch);
    setBusy(false);
    pushToast('success', 'İşlem güncellendi.');
    onClose();
  };

  const doDelete = async () => {
    setBusy(true);
    await deleteTransaction(txn.id);
    setBusy(false);
    pushToast('success', 'İşlem silindi.');
    onClose();
  };

  if (confirming) {
    return (
      <Modal
        open
        onClose={() => setConfirming(false)}
        title="İşlemi sil"
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>Vazgeç</Button><Button variant="danger" onClick={doDelete} disabled={busy}>Sil</Button></>}
      >
        <p className="text-[14px] text-ink/80">Bu işlem kalıcı olarak silinecek ve ilgili hesabın bakiyesi buna göre güncellenecek. Emin misin?</p>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="İşlemi düzenle"
      subtitle={TRANSACTION_TYPE_LABELS[txn.type]}
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={() => setConfirming(true)} disabled={busy}><Trash2 size={15} className="text-expense" /> Sil</Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Vazgeç</Button>
            <Button onClick={save} disabled={busy}><Pencil size={15} /> Kaydet</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tutar"><MoneyInput value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field>
          <Field label="Tarih"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>

        {isTransfer ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kaynak hesap"><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>{activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
            <Field label="Hedef hesap"><Select value={destId} onChange={(e) => setDestId(e.target.value)}><option value="">Seç</option>{activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Hesap"><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Seç</option>{activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
            {showCategory && <Field label="Kategori"><Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Kategorisiz</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}
          </div>
        )}

        <Field label="Açıklama / işletme"><Input value={merchant} onChange={(e) => setMerchant(e.target.value)} /></Field>
        <Field label="Not" hint="isteğe bağlı"><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></Field>
      </div>
    </Modal>
  );
}
