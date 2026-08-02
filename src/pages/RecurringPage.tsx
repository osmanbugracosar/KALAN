import { useState } from 'react';
import { Repeat, Plus, Pencil, Trash2, Play, SkipForward, Clock, TrendingUp, TrendingDown, ArrowLeftRight, Power } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUIStore } from '../store/useUIStore';
import { useSnapshot } from '../app/useSnapshot';
import { dueRecurring, accountMap, categoryMap } from '../store/selectors';
import { parseAmountToKurus } from '../core/money';
import { todayLocalDate, formatDateTR, daysBetween } from '../core/date';
import { PaymentFrequency, PAYMENT_FREQUENCY_LABELS } from '../domain/enums';
import type { RecurringTransaction } from '../domain/types';
import type { TransactionType } from '../domain/enums';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Field, Input, Textarea, Select, MoneyInput } from '../ui/Field';
import { EmptyState } from '../ui/misc';
import { Money } from '../ui/Money';
import { cx } from '../ui/cx';
import { centsToInput } from './parts/format';

const TYPE_META: Record<string, { icon: typeof TrendingUp; label: string; tone: string; sign: string }> = {
  income: { icon: TrendingUp, label: 'Gelir', tone: 'text-income', sign: '+' },
  expense: { icon: TrendingDown, label: 'Gider', tone: 'text-expense', sign: '−' },
  transfer: { icon: ArrowLeftRight, label: 'Transfer', tone: 'text-brand', sign: '' },
};

export function RecurringPage() {
  const s = useSnapshot();
  const pushToast = useUIStore((st) => st.pushToast);
  const runNow = useFinanceStore((st) => st.runRecurringNow);
  const skip = useFinanceStore((st) => st.skipRecurringDue);
  const updateRecurring = useFinanceStore((st) => st.updateRecurring);
  const deleteRecurring = useFinanceStore((st) => st.deleteRecurring);

  const [modal, setModal] = useState<{ editing?: RecurringTransaction } | null>(null);
  const [confirmDel, setConfirmDel] = useState<RecurringTransaction | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const due = dueRecurring(s);
  const all = [...s.recurring].sort((a, b) => (a.next_due_date < b.next_due_date ? -1 : 1));
  const amap = accountMap(s);
  const cmap = categoryMap(s);

  const runOne = async (id: number) => {
    setBusyId(id);
    const res = await runNow(id);
    setBusyId(null);
    pushToast(res.ok ? 'success' : 'error', res.ok ? 'İşlem kaydedildi.' : res.message ?? 'Kaydedilemedi.');
  };

  if (all.length === 0) {
    return (
      <>
        <PageHead onAdd={() => setModal({})} />
        <Card>
          <EmptyState
            icon={<Repeat size={26} />}
            title="Henüz düzenli ödemen yok"
            description="Kira, abonelik, maaş gibi tekrar eden gelir ve giderleri ekle; vadesi geldiğinde tek tıkla kaydet."
            action={<Button onClick={() => setModal({})}><Plus size={16} /> Düzenli ödeme ekle</Button>}
          />
        </Card>
        {modal && <RecurringModal editing={modal.editing} onClose={() => setModal(null)} />}
      </>
    );
  }

  return (
    <div className="space-y-5">
      <PageHead onAdd={() => setModal({})} />

      {/* Vadesi gelenler */}
      {due.length > 0 && (
        <Card padded>
          <CardHeader title="Vadesi gelenler" subtitle={`${due.length} ödeme bekliyor`} action={<Clock size={18} className="text-warn" />} />
          <div className="space-y-2.5">
            {due.map((r) => {
              const meta = TYPE_META[r.type] ?? TYPE_META.expense;
              const Icon = meta.icon;
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-warn/25 bg-warn/5 p-3">
                  <span className={cx('grid place-items-center h-10 w-10 rounded-lg bg-surface shrink-0', meta.tone)}><Icon size={18} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-ink truncate">{r.name}</div>
                    <div className="text-[12px] text-muted">Vade: {formatDateTR(r.next_due_date)} · {PAYMENT_FREQUENCY_LABELS[r.frequency]}</div>
                  </div>
                  <Money value={r.amount} className={cx('text-[15px] font-semibold shrink-0', meta.tone)} />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" onClick={() => runOne(r.id)} disabled={busyId === r.id}><Play size={14} /> Kaydet</Button>
                    <Button size="sm" variant="ghost" onClick={async () => { await skip(r.id); pushToast('info', 'Atlandı.'); }} title="Bu vadeyi atla"><SkipForward size={14} /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Tüm düzenli ödemeler */}
      <Card padded>
        <CardHeader title="Tüm düzenli ödemeler" subtitle={`${all.length} kayıt`} />
        <div className="divide-y divide-line">
          {all.map((r) => {
            const meta = TYPE_META[r.type] ?? TYPE_META.expense;
            const Icon = meta.icon;
            const inactive = r.is_active === 0;
            const dleft = daysBetween(todayLocalDate(), r.next_due_date);
            return (
              <div key={r.id} className={cx('flex items-center gap-3 py-3', inactive && 'opacity-55')}>
                <span className={cx('grid place-items-center h-10 w-10 rounded-lg bg-elevate shrink-0', meta.tone)}><Icon size={18} /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-ink truncate">{r.name}</span>
                    {inactive && <span className="text-[10px] uppercase tracking-wide text-muted bg-ink/5 px-1.5 py-0.5 rounded">pasif</span>}
                  </div>
                  <div className="text-[12px] text-muted">
                    {PAYMENT_FREQUENCY_LABELS[r.frequency]}
                    {r.account_id != null && ` · ${amap.get(r.account_id)?.name ?? ''}`}
                    {r.category_id != null && ` · ${cmap.get(r.category_id)?.name ?? ''}`}
                    {!inactive && ` · ${dleft < 0 ? 'vadesi geçti' : dleft === 0 ? 'bugün' : `${dleft} gün sonra`}`}
                  </div>
                </div>
                <Money value={r.amount} className={cx('text-[14.5px] font-semibold shrink-0', meta.tone)} />
                <div className="flex items-center gap-1 shrink-0">
                  <IconBtn title={inactive ? 'Etkinleştir' : 'Duraklat'} onClick={() => updateRecurring(r.id, { is_active: inactive ? 1 : 0 })}><Power size={15} /></IconBtn>
                  <IconBtn title="Düzenle" onClick={() => setModal({ editing: r })}><Pencil size={15} /></IconBtn>
                  <IconBtn title="Sil" danger onClick={() => setConfirmDel(r)}><Trash2 size={15} /></IconBtn>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {modal && <RecurringModal editing={modal.editing} onClose={() => setModal(null)} />}
      {confirmDel && (
        <Modal
          open onClose={() => setConfirmDel(null)} title="Düzenli ödemeyi sil" size="sm"
          footer={<><Button variant="ghost" onClick={() => setConfirmDel(null)}>Vazgeç</Button><Button variant="danger" onClick={async () => { await deleteRecurring(confirmDel.id); pushToast('success', 'Silindi.'); setConfirmDel(null); }}>Sil</Button></>}
        >
          <p className="text-[14px] text-ink/80">"{confirmDel.name}" düzenli ödemesi silinecek. Daha önce kaydedilmiş işlemler etkilenmez.</p>
        </Modal>
      )}
    </div>
  );
}

function PageHead({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-ink">Düzenli Ödemeler</h2>
        <p className="text-[13px] text-muted mt-0.5">Tekrar eden gelir ve giderler; vadesi gelince tek tıkla kaydet.</p>
      </div>
      <Button onClick={onAdd}><Plus size={16} /> Ekle</Button>
    </div>
  );
}

function RecurringModal({ editing, onClose }: { editing?: RecurringTransaction; onClose: () => void }) {
  const s = useSnapshot();
  const addRecurring = useFinanceStore((st) => st.addRecurring);
  const updateRecurring = useFinanceStore((st) => st.updateRecurring);
  const pushToast = useUIStore((st) => st.pushToast);

  const activeAccounts = s.accounts.filter((a) => a.is_active === 1);
  const expenseCategories = s.categories.filter((c) => c.kind === 'expense');
  const incomeCategories = s.categories.filter((c) => c.kind === 'income');

  const [type, setType] = useState<TransactionType>(editing?.type ?? 'expense');
  const [name, setName] = useState(editing?.name ?? '');
  const [amount, setAmount] = useState(editing ? centsToInput(editing.amount) : '');
  const [accountId, setAccountId] = useState<string>(editing?.account_id != null ? String(editing.account_id) : (activeAccounts[0] ? String(activeAccounts[0].id) : ''));
  const [destId, setDestId] = useState<string>(editing?.destination_account_id != null ? String(editing.destination_account_id) : '');
  const [categoryId, setCategoryId] = useState<string>(editing?.category_id != null ? String(editing.category_id) : '');
  const [merchant, setMerchant] = useState(editing?.merchant ?? '');
  const [frequency, setFrequency] = useState<PaymentFrequency>(editing?.frequency ?? 'monthly');
  const [intervalDays, setIntervalDays] = useState<string>(editing?.interval_days != null ? String(editing.interval_days) : '');
  const [nextDue, setNextDue] = useState(editing?.next_due_date ?? todayLocalDate());
  const [note, setNote] = useState(editing?.note ?? '');
  const [busy, setBusy] = useState(false);

  const isTransfer = type === 'transfer';
  const cats = type === 'income' ? incomeCategories : expenseCategories;

  const save = async () => {
    if (!name.trim()) return pushToast('error', 'Ad gerekli.');
    const amt = parseAmountToKurus(amount);
    if (!amt || amt <= 0) return pushToast('error', 'Geçerli bir tutar gir.');
    if (isTransfer && (!accountId || !destId || accountId === destId)) return pushToast('error', 'Transfer için farklı iki hesap seç.');
    if (frequency === 'custom' && (!intervalDays || Number(intervalDays) <= 0)) return pushToast('error', 'Özel aralık için gün sayısı gir.');
    setBusy(true);
    const base = {
      name: name.trim(),
      type,
      amount: amt,
      account_id: accountId ? Number(accountId) : null,
      destination_account_id: isTransfer && destId ? Number(destId) : null,
      category_id: !isTransfer && categoryId ? Number(categoryId) : null,
      debt_id: null,
      merchant: merchant.trim() || null,
      frequency,
      interval_days: frequency === 'custom' ? Number(intervalDays) : null,
      next_due_date: nextDue,
      note: note.trim() || null,
    };
    if (editing) {
      await updateRecurring(editing.id, base);
      pushToast('success', 'Güncellendi.');
    } else {
      await addRecurring({ ...base, last_run_date: null, status: 'pending', is_active: 1 });
      pushToast('success', 'Düzenli ödeme eklendi.');
    }
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open onClose={onClose} title={editing ? 'Düzenli ödemeyi düzenle' : 'Yeni düzenli ödeme'}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button onClick={save} disabled={busy}>{editing ? 'Kaydet' : 'Ekle'}</Button></>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(['income', 'expense', 'transfer'] as const).map((t) => {
            const meta = TYPE_META[t];
            const Icon = meta.icon;
            return (
              <button key={t} type="button" onClick={() => setType(t)} className={cx('flex flex-col items-center gap-1 rounded-lg border py-2.5 transition-colors', type === t ? 'border-brand bg-brand-soft' : 'border-line hover:bg-ink/5')}>
                <Icon size={17} className={type === t ? meta.tone : 'text-muted'} />
                <span className={cx('text-[12px]', type === t ? 'text-ink font-medium' : 'text-muted')}>{meta.label}</span>
              </button>
            );
          })}
        </div>

        <Field label="Ad"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isTransfer ? 'örn. Birikim aktarımı' : type === 'income' ? 'örn. Maaş' : 'örn. Kira'} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tutar"><MoneyInput value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></Field>
          <Field label="İlk/sonraki vade"><Input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} /></Field>
        </div>

        {isTransfer ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kaynak hesap"><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>{activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
            <Field label="Hedef hesap"><Select value={destId} onChange={(e) => setDestId(e.target.value)}><option value="">Seç</option>{activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Hesap"><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Seç</option>{activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
            <Field label="Kategori" hint="isteğe bağlı"><Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Kategorisiz</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          </div>
        )}

        <div className={cx('grid gap-4', frequency === 'custom' ? 'grid-cols-2' : 'grid-cols-1')}>
          <Field label="Sıklık">
            <Select value={frequency} onChange={(e) => setFrequency(e.target.value as PaymentFrequency)}>
              {Object.values(PaymentFrequency).map((f) => <option key={f} value={f}>{PAYMENT_FREQUENCY_LABELS[f]}</option>)}
            </Select>
          </Field>
          {frequency === 'custom' && (
            <Field label="Kaç günde bir?"><Input type="number" min={1} value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} placeholder="30" /></Field>
          )}
        </div>

        {!isTransfer && <Field label="Açıklama / işletme" hint="isteğe bağlı"><Input value={merchant} onChange={(e) => setMerchant(e.target.value)} /></Field>}
        <Field label="Not" hint="isteğe bağlı"><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></Field>
      </div>
    </Modal>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={title} className={cx('grid place-items-center h-8 w-8 rounded-lg text-muted transition-colors', danger ? 'hover:text-expense hover:bg-expense/10' : 'hover:text-brand hover:bg-brand/10')}>
      {children}
    </button>
  );
}
