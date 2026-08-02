import { useMemo, useState } from 'react';
import { ReceiptText, Plus, ChevronDown, ChevronRight, Tag, X } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUIStore } from '../store/useUIStore';
import { useSnapshot } from '../app/useSnapshot';
import { accountMap, categoryMap, itemsByTxn } from '../store/selectors';
import { parseAmountToKurus } from '../core/money';
import { todayLocalDate, formatDateTR, isInMonth } from '../core/date';
import type { TransactionDraft as _TD } from '../store/useFinanceStore';
import type { DetailedItemInput } from '../store/useFinanceStore';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatCard } from '../ui/StatCard';
import { Modal } from '../ui/Modal';
import { Field, Input, Select, MoneyInput } from '../ui/Field';
import { EmptyState } from '../ui/misc';
import { Money } from '../ui/Money';
import { cx } from '../ui/cx';
import { fmt } from './parts/format';

export function ExpensesPage() {
  const s = useSnapshot();
  const mKey = useUIStore((st) => st.selectedMonth);
  const amap = accountMap(s);
  const cmap = categoryMap(s);
  const itemMap = itemsByTxn(s);

  const [modal, setModal] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const expenses = useMemo(
    () => s.transactions.filter((t) => t.type === 'expense' && isInMonth(t.transaction_date, mKey)).sort((a, b) => (a.transaction_date < b.transaction_date ? 1 : -1)),
    [s.transactions, mKey],
  );
  const detailedCount = expenses.filter((t) => (itemMap.get(t.id)?.length ?? 0) > 0).length;
  const monthTotal = expenses.reduce((a, t) => a + t.amount, 0);

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Giderlerim</h2>
          <p className="text-[13px] text-muted mt-0.5">Bu ayki giderler; alışverişleri kalem kalem (fiş gibi) girebilirsin.</p>
        </div>
        <Button onClick={() => setModal(true)}><Plus size={16} /> Detaylı gider ekle</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Bu ayki gider" value={<Money value={monthTotal} tone="expense" />} icon={<ReceiptText size={18} />} accent="expense" />
        <StatCard label="Gider işlemi" value={String(expenses.length)} />
        <StatCard label="Kalemli gider" value={String(detailedCount)} hint="fiş satırlı" />
      </div>

      <Card padded>
        <CardHeader title="Gider işlemleri" subtitle={`${expenses.length} işlem`} />
        {expenses.length === 0 ? (
          <EmptyState
            icon={<ReceiptText size={26} />}
            title="Bu ay gider yok"
            description="Tek kalem giderleri hızlı-ekle menüsünden, kalemli (fiş satırlı) giderleri yukarıdaki düğmeden ekleyebilirsin."
            action={<Button onClick={() => setModal(true)}><Plus size={16} /> Detaylı gider ekle</Button>}
          />
        ) : (
          <div className="divide-y divide-line">
            {expenses.map((t) => {
              const items = itemMap.get(t.id) ?? [];
              const hasItems = items.length > 0;
              const isOpen = expanded.has(t.id);
              return (
                <div key={t.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => hasItems && toggle(t.id)}
                      className={cx('grid place-items-center h-9 w-9 rounded-lg shrink-0', hasItems ? 'bg-expense/10 text-expense hover:bg-expense/20' : 'bg-elevate text-muted cursor-default')}
                    >
                      {hasItems ? (isOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />) : <ReceiptText size={16} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-ink truncate">
                        {t.merchant || t.description || 'Gider'}
                        {hasItems && <span className="ml-2 text-[10.5px] uppercase tracking-wide text-expense bg-expense/10 px-1.5 py-0.5 rounded">{items.length} kalem</span>}
                      </div>
                      <div className="text-[12px] text-muted">
                        {formatDateTR(t.transaction_date)}
                        {t.account_id != null && ` · ${amap.get(t.account_id)?.name ?? ''}`}
                        {t.category_id != null && ` · ${cmap.get(t.category_id)?.name ?? ''}`}
                      </div>
                    </div>
                    <Money value={t.amount} tone="expense" className="text-[15px] font-semibold shrink-0" />
                  </div>

                  {hasItems && isOpen && (
                    <div className="mt-2.5 ml-12 rounded-lg border border-line bg-elevate/40 divide-y divide-line">
                      {items.map((it) => (
                        <div key={it.id} className="flex items-center gap-2 px-3 py-2 text-[13px]">
                          <span className="flex-1 min-w-0 text-ink truncate">
                            {it.name}
                            {it.quantity !== 1 && <span className="text-muted"> × {it.quantity}</span>}
                          </span>
                          {it.category_id != null && (
                            <span className="text-[11px] text-muted inline-flex items-center gap-1 shrink-0"><Tag size={10} /> {cmap.get(it.category_id)?.name}</span>
                          )}
                          <Money value={it.total_amount} className="text-muted shrink-0 w-24 text-right" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {modal && <DetailedExpenseModal onClose={() => setModal(false)} />}
    </div>
  );
}

interface DraftRow {
  key: number;
  name: string;
  categoryId: string;
  qty: string;
  unitPrice: string;
}

function lineTotalK(row: DraftRow): number {
  const unit = parseAmountToKurus(row.unitPrice) || 0;
  const qty = parseFloat(row.qty.replace(',', '.')) || 0;
  return Math.round(unit * qty);
}

function DetailedExpenseModal({ onClose }: { onClose: () => void }) {
  const s = useSnapshot();
  const addDetailedExpense = useFinanceStore((st) => st.addDetailedExpense);
  const pushToast = useUIStore((st) => st.pushToast);

  const activeAccounts = s.accounts.filter((a) => a.is_active === 1);
  const expenseCategories = s.categories.filter((c) => c.kind === 'expense');

  const [merchant, setMerchant] = useState('');
  const [accountId, setAccountId] = useState<string>(activeAccounts[0] ? String(activeAccounts[0].id) : '');
  const [date, setDate] = useState(todayLocalDate());
  const [rows, setRows] = useState<DraftRow[]>([{ key: 1, name: '', categoryId: '', qty: '1', unitPrice: '' }]);
  const [busy, setBusy] = useState(false);
  const nextKey = useMemo(() => ({ v: 2 }), []);

  const total = rows.reduce((a, r) => a + lineTotalK(r), 0);

  const addRow = () => setRows((rs) => [...rs, { key: nextKey.v++, name: '', categoryId: '', qty: '1', unitPrice: '' }]);
  const removeRow = (key: number) => setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r.key !== key)));
  const patchRow = (key: number, patch: Partial<DraftRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const save = async () => {
    if (!accountId) return pushToast('error', 'Bir hesap seç.');
    const validRows = rows.filter((r) => r.name.trim() && lineTotalK(r) > 0);
    if (validRows.length === 0) return pushToast('error', 'En az bir geçerli kalem gir (ad ve tutar).');
    const items: DetailedItemInput[] = validRows.map((r) => {
      const unit = parseAmountToKurus(r.unitPrice) || 0;
      const qty = parseFloat(r.qty.replace(',', '.')) || 1;
      return {
        name: r.name.trim(),
        category_id: r.categoryId ? Number(r.categoryId) : null,
        quantity: qty,
        unit_price: unit,
        total_amount: Math.round(unit * qty),
        note: null,
      };
    });
    const sum = items.reduce((a, it) => a + it.total_amount, 0);

    const draft: _TD = {
      type: 'expense',
      amount: sum,
      account_id: Number(accountId),
      destination_account_id: null,
      category_id: null, // kalem bazlı; işlem geneli kategorisiz
      debt_id: null,
      savings_goal_id: null,
      merchant: merchant.trim() || 'Detaylı gider',
      description: merchant.trim() || 'Detaylı gider',
      payment_method: null,
      transaction_date: `${date}T12:00:00`,
      note: null,
      include_in_budget: 1,
      has_receipt: 1,
      linked_transaction_id: null,
      is_recurring_instance: 0,
    };

    setBusy(true);
    const res = await addDetailedExpense(draft, items);
    setBusy(false);
    if (!res.ok) return pushToast('error', res.message ?? 'Kaydedilemedi.');
    pushToast('success', `Gider kaydedildi (${items.length} kalem).`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Detaylı gider (fiş)"
      subtitle="Her ürünü ayrı satır olarak gir; hesaptan yalnızca bir kez düşülür."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full gap-4">
          <div className="text-[13px] text-muted">
            Toplam: <Money value={total} tone="expense" className="font-semibold text-[15px]" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>Vazgeç</Button>
            <Button onClick={save} disabled={busy || total <= 0}>Kaydet</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="İşletme / mağaza"><Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="örn. Migros" autoFocus /></Field>
          <Field label="Hesap"><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Seç</option>{activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
          <Field label="Tarih"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-ink">Kalemler</span>
            <button onClick={addRow} className="text-[12.5px] text-brand hover:underline inline-flex items-center gap-1"><Plus size={13} /> Satır ekle</button>
          </div>

          {/* Başlık (geniş ekran) */}
          <div className="hidden sm:grid grid-cols-[1fr_60px_110px_110px_32px] gap-2 px-1 pb-1 text-[11px] uppercase tracking-wide text-muted">
            <span>Ürün</span><span className="text-center">Adet</span><span>Birim fiyat</span><span className="text-right">Satır</span><span />
          </div>

          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.key} className="grid grid-cols-2 sm:grid-cols-[1fr_60px_110px_110px_32px] gap-2 items-center">
                <Input className="col-span-2 sm:col-span-1" value={r.name} onChange={(e) => patchRow(r.key, { name: e.target.value })} placeholder="Ürün adı" />
                <Input className="text-center" inputMode="decimal" value={r.qty} onChange={(e) => patchRow(r.key, { qty: e.target.value })} placeholder="1" />
                <MoneyInput value={r.unitPrice} onChange={(e) => patchRow(r.key, { unitPrice: e.target.value })} placeholder="0,00" />
                <div className="text-right text-[13px] font-medium text-ink tabular pr-1">{fmt(lineTotalK(r))}</div>
                <button onClick={() => removeRow(r.key)} className={cx('grid place-items-center h-9 w-8 rounded-lg text-muted', rows.length === 1 ? 'opacity-30 cursor-default' : 'hover:text-expense hover:bg-expense/10')}>
                  <X size={15} />
                </button>
                <div className="col-span-2 sm:hidden">
                  <Select value={r.categoryId} onChange={(e) => patchRow(r.key, { categoryId: e.target.value })}>
                    <option value="">Kategorisiz</option>
                    {expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </div>
                {/* Geniş ekranda kategori ayrı satırda görünmesin diye gizli; masaüstünde kategori satır altı */}
                <div className="hidden sm:block sm:col-start-1 sm:col-span-4 -mt-1">
                  <Select className="text-[12.5px] h-8" value={r.categoryId} onChange={(e) => patchRow(r.key, { categoryId: e.target.value })}>
                    <option value="">Kategorisiz</option>
                    {expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[12px] text-muted">İşlem tutarı, kalemlerin toplamı olarak otomatik hesaplanır ve seçtiğin hesaptan yalnızca bir kez düşülür.</p>
      </div>
    </Modal>
  );
}
