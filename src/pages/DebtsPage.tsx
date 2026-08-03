import { useMemo, useState } from 'react';
import { Landmark, Plus, ChevronDown, Pencil, Trash2, HandCoins, CheckCircle2 } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUIStore } from '../store/useUIStore';
import { useSnapshot } from '../app/useSnapshot';
import { debtViews, type DebtView } from '../store/selectors';
import { totalRemainingDebt } from '../services/calculations';
import { DEBT_STATUS_LABELS, PaymentFrequency, PAYMENT_FREQUENCY_LABELS } from '../domain/enums';
import type { Debt, DebtPayment } from '../domain/types';
import { parseAmountToKurus, formatMoney } from '../core/money';
import { toLocalIso, todayLocalDate, formatDateTR } from '../core/date';
import { Card } from '../ui/Card';
import { StatCard } from '../ui/StatCard';
import { Money } from '../ui/Money';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Field, Input, Select, MoneyInput, Textarea } from '../ui/Field';
import { Progress, Badge, EmptyState } from '../ui/misc';
import { cx } from '../ui/cx';

const STATUS_TONE: Record<string, 'income' | 'expense' | 'debt' | 'warn' | 'muted' | 'brand'> = {
  active: 'brand',
  due_soon: 'debt',
  overdue: 'warn',
  completed: 'income',
  frozen: 'muted',
};

export function DebtsPage() {
  const snap = useSnapshot();
  const debts = useFinanceStore((s) => s.debts);
  const [addOpen, setAddOpen] = useState(false);

  const views = debtViews(snap);
  const totalRemaining = totalRemainingDebt(snap.debts, snap.debtPayments);
  const totalPaid = views.reduce((s, v) => s + v.paidTotal, 0);
  const activeCount = views.filter((v) => v.remaining > 0).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Kalan toplam borç" accent="debt" value={<Money value={totalRemaining} tone="debt" />} icon={<Landmark size={17} />} />
        <StatCard label="Toplam ödenen" accent="income" value={<Money value={totalPaid} tone="income" />} icon={<HandCoins size={17} />} />
        <StatCard label="Aktif borç" accent="ink" value={activeCount} hint={`${debts.length} borç kaydı`} />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-ink">Borçlar</h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Borç ekle
        </Button>
      </div>

      {views.length === 0 ? (
        <Card>
          <EmptyState icon={<Landmark size={22} />} title="Kayıtlı borç yok" description="Kredi, kredi kartı borcu veya kişisel borçlarınızı ekleyip kalan tutarı takip edin." action={<Button onClick={() => setAddOpen(true)}>Borç ekle</Button>} />
        </Card>
      ) : (
        <div className="space-y-3">
          {views.map((v) => (
            <DebtCard key={v.debt.id} view={v} />
          ))}
        </div>
      )}

      {addOpen && <DebtModal onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function DebtCard({ view }: { view: DebtView }) {
  const { debt, remaining, paidTotal, progress, status } = view;
  const allPayments = useFinanceStore((s) => s.debtPayments);
  const payments = useMemo(() => allPayments.filter((p) => p.debt_id === debt.id), [allPayments, debt.id]);
  const deleteDebt = useFinanceStore((s) => s.deleteDebt);
  const pushToast = useUIStore((s) => s.pushToast);
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<DebtPayment | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const done = remaining <= 0;

  const sortedPayments = [...payments].sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1));

  return (
    <Card padded={false}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-11 w-11 rounded-xl shrink-0" style={{ background: `${debt.color}1a`, color: debt.color }}>
            {done ? <CheckCircle2 size={20} /> : <Landmark size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] font-semibold text-ink truncate">{debt.name}</span>
              <Badge tone={STATUS_TONE[status]}>{DEBT_STATUS_LABELS[status]}</Badge>
            </div>
            {debt.creditor && <div className="text-[12.5px] text-muted">{debt.creditor}</div>}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] text-muted">Kalan</div>
            <Money value={remaining} tone={done ? 'income' : 'debt'} className="text-[17px] font-bold" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[12px] mb-1.5">
            <span className="text-muted">
              Ödenen <span className="tabular text-ink font-medium">{fmt(paidTotal)}</span> / {fmt(debt.total_repayment_amount)}
            </span>
            <span className="tabular text-brand font-medium">%{progress}</span>
          </div>
          <Progress value={progress} tone={done ? 'income' : 'debt'} />
        </div>

        <div className="flex items-center gap-4 mt-3 text-[12px] text-muted">
          {debt.due_date && <span>Son tarih: {formatDateTR(`${debt.due_date}T00:00:00`)}</span>}
          {debt.planned_payment_amount != null && <span>Taksit: {fmt(debt.planned_payment_amount)}</span>}
          <span>{PAYMENT_FREQUENCY_LABELS[debt.payment_frequency]}</span>
        </div>

        <div className="flex items-center gap-2 mt-4">
          {!done && (
            <Button size="sm" onClick={() => setPayOpen(true)}>
              <HandCoins size={15} /> Ödeme ekle
            </Button>
          )}
          <Button size="sm" variant="subtle" onClick={() => setOpen((o) => !o)}>
            <ChevronDown size={15} className={cx('transition-transform', open && 'rotate-180')} />
            {payments.length} ödeme
          </Button>
          <button onClick={() => setConfirmDel(true)} className="ml-auto grid place-items-center h-8 w-8 rounded-lg text-muted hover:text-expense hover:bg-expense/10 transition-colors" title="Borcu sil">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-elevate/40 px-4 py-3">
          {sortedPayments.length === 0 ? (
            <p className="text-[13px] text-muted py-2 text-center">Henüz ödeme kaydı yok.</p>
          ) : (
            <ul className="divide-y divide-line">
              {sortedPayments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] text-ink font-medium">{formatDateTR(`${p.payment_date}T00:00:00`)}</div>
                    {p.description && <div className="text-[12px] text-muted truncate">{p.description}</div>}
                  </div>
                  <Money value={p.amount} tone="income" className="text-[13.5px] font-semibold" />
                  <button onClick={() => setEditPayment(p)} className="grid place-items-center h-7 w-7 rounded-md text-muted hover:text-brand hover:bg-brand/10 transition-colors" title="Düzenle">
                    <Pencil size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {payOpen && <PaymentModal debt={debt} onClose={() => setPayOpen(false)} />}
      {editPayment && <PaymentModal debt={debt} payment={editPayment} onClose={() => setEditPayment(null)} />}
      {confirmDel && (
        <Modal
          open
          onClose={() => setConfirmDel(false)}
          title="Borcu sil"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmDel(false)}>
                Vazgeç
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await deleteDebt(debt.id);
                  pushToast('success', 'Borç ve ödemeleri silindi.');
                  setConfirmDel(false);
                }}
              >
                Sil
              </Button>
            </>
          }
        >
          <p className="text-[14px] text-ink/80">
            <span className="font-medium text-ink">{debt.name}</span> borcunu ve tüm ödeme kayıtlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
        </Modal>
      )}
    </Card>
  );
}

function PaymentModal({ debt, payment, onClose }: { debt: Debt; payment?: DebtPayment; onClose: () => void }) {
  const accounts = useFinanceStore((s) => s.accounts).filter((a) => a.is_active === 1);
  const addDebtPayment = useFinanceStore((s) => s.addDebtPayment);
  const editDebtPayment = useFinanceStore((s) => s.editDebtPayment);
  const deleteDebtPayment = useFinanceStore((s) => s.deleteDebtPayment);
  const pmPayments = useFinanceStore((s) => s.debtPayments);
  const remaining = useMemo(() => {
    // kalan borç (bilgi amaçlı)
    const ps = pmPayments.filter((p) => p.debt_id === debt.id);
    const paid = debt.previously_paid_amount + ps.reduce((x, p) => x + p.amount, 0);
    return Math.max(0, debt.total_repayment_amount - paid);
  }, [pmPayments, debt.id, debt.previously_paid_amount, debt.total_repayment_amount]);
  const pushToast = useUIStore((s) => s.pushToast);

  const editing = payment ?? null;
  const [amount, setAmount] = useState(editing ? centsToInput(editing.amount) : '');
  const [accountId, setAccountId] = useState<number | ''>(editing?.account_id ?? accounts[0]?.id ?? '');
  const [date, setDate] = useState(editing?.payment_date ?? todayLocalDate());
  const [description, setDescription] = useState(editing?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    const amt = parseAmountToKurus(amount);
    if (amt == null || amt <= 0) {
      setError('Geçerli bir tutar girin.');
      return;
    }
    setBusy(true);
    const iso = toLocalIso(date, '12:00').slice(0, 10);
    const res = editing
      ? await editDebtPayment(editing.id, amt, iso, description || null)
      : await addDebtPayment({ debtId: debt.id, accountId: accountId === '' ? null : Number(accountId), amount: amt, date: iso, description: description || null });
    if (!res.ok) {
      setError(res.message ?? 'Ödeme kaydedilemedi.');
      setBusy(false);
      return;
    }
    pushToast('success', editing ? 'Ödeme güncellendi.' : 'Ödeme eklendi.');
    onClose();
  };

  const remove = async () => {
    if (!editing) return;
    setBusy(true);
    await deleteDebtPayment(editing.id);
    pushToast('success', 'Ödeme silindi.');
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Ödemeyi düzenle' : 'Borç ödemesi ekle'}
      subtitle={`${debt.name} · kalan ${fmt(remaining)}`}
      footer={
        <div className="flex items-center justify-between w-full">
          {editing ? (
            <Button variant="ghost" onClick={remove} disabled={busy} className="text-expense">
              <Trash2 size={15} /> Sil
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Vazgeç
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Ödeme tutarı" hint={`En fazla ${fmt(remaining + (editing?.amount ?? 0))} ödenebilir`}>
          <MoneyInput placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hangi hesaptan?">
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Hesap dışı / nakit</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tarih">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Açıklama (isteğe bağlı)">
          <Textarea placeholder="örn. Ocak taksiti" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {error && <p className="text-[13px] text-expense">{error}</p>}
      </div>
    </Modal>
  );
}

function DebtModal({ onClose }: { onClose: () => void }) {
  const accounts = useFinanceStore((s) => s.accounts).filter((a) => a.is_active === 1);
  const addDebt = useFinanceStore((s) => s.addDebt);
  const pushToast = useUIStore((s) => s.pushToast);

  const [name, setName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [total, setTotal] = useState('');
  const [previouslyPaid, setPreviouslyPaid] = useState('');
  const [planned, setPlanned] = useState('');
  const [frequency, setFrequency] = useState<Debt['payment_frequency']>('monthly');
  const [startDate, setStartDate] = useState(todayLocalDate());
  const [dueDate, setDueDate] = useState('');
  const [addInflow, setAddInflow] = useState(false);
  const [inflowAccount, setInflowAccount] = useState<number | ''>(accounts[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Borç adı girin.');
      return;
    }
    const totalK = parseAmountToKurus(total);
    if (totalK == null || totalK <= 0) {
      setError('Toplam geri ödeme tutarını girin.');
      return;
    }
    const prevK = parseAmountToKurus(previouslyPaid) ?? 0;
    if (prevK > totalK) {
      setError('Daha önce ödenen tutar toplamdan büyük olamaz.');
      return;
    }
    const plannedK = parseAmountToKurus(planned);

    setBusy(true);
    try {
      await addDebt(
        {
          name: name.trim(),
          creditor: creditor.trim() || null,
          original_amount: totalK,
          total_repayment_amount: totalK,
          previously_paid_amount: prevK,
          start_date: startDate,
          due_date: dueDate || null,
          planned_payment_amount: plannedK,
          payment_frequency: frequency,
          status: 'active',
          color: '#D9822B',
          icon: 'landmark',
          note: null,
        },
        addInflow && inflowAccount !== '' ? { accountId: Number(inflowAccount) } : undefined,
      );
      pushToast('success', 'Borç eklendi.');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Borç kaydedilemedi.');
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Yeni borç"
      size="lg"
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Borç adı">
            <Input placeholder="örn. İhtiyaç kredisi" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Alacaklı (kişi/kurum)">
            <Input placeholder="örn. X Bankası" value={creditor} onChange={(e) => setCreditor(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Toplam geri ödenecek" hint="Anapara + faiz dahil">
            <MoneyInput placeholder="0,00" value={total} onChange={(e) => setTotal(e.target.value)} />
          </Field>
          <Field label="Daha önce ödenen" hint="Uygulama dışında ödediğiniz">
            <MoneyInput placeholder="0,00" value={previouslyPaid} onChange={(e) => setPreviouslyPaid(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Taksit tutarı">
            <MoneyInput placeholder="0,00" value={planned} onChange={(e) => setPlanned(e.target.value)} />
          </Field>
          <Field label="Ödeme sıklığı">
            <Select value={frequency} onChange={(e) => setFrequency(e.target.value as Debt['payment_frequency'])}>
              {Object.values(PaymentFrequency).map((f) => (
                <option key={f} value={f}>
                  {PAYMENT_FREQUENCY_LABELS[f]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Son ödeme tarihi">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Başlangıç tarihi">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>

        {accounts.length > 0 && (
          <div className="rounded-lg border border-line bg-elevate/60 p-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={addInflow} onChange={(e) => setAddInflow(e.target.checked)} className="h-4 w-4 accent-brand" />
              <span className="text-[13px] font-medium text-ink">Bu borçla hesabıma para girdi</span>
            </label>
            <p className="text-[12px] text-muted mt-1 ml-[26px]">İşaretlerseniz seçili hesaba borç tutarı kadar giriş kaydedilir (gelir sayılmaz).</p>
            {addInflow && (
              <div className="mt-3">
                <Field label="Hangi hesaba girdi?">
                  <Select value={inflowAccount} onChange={(e) => setInflowAccount(e.target.value === '' ? '' : Number(e.target.value))}>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-[13px] text-expense">{error}</p>}
      </div>
    </Modal>
  );
}

/* yardımcılar */
function fmt(k: number): string {
  return formatMoney(k);
}
function centsToInput(k: number): string {
  const lira = Math.trunc(k / 100);
  const kr = Math.abs(k % 100);
  return `${lira},${String(kr).padStart(2, '0')}`;
}
