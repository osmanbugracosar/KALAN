import { useState } from 'react';
import { Target, Plus, PiggyBank, Pencil, Trash2, Check, Wallet, CalendarClock } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUIStore } from '../store/useUIStore';
import { useSnapshot } from '../app/useSnapshot';
import { savingsViews, accountMap, type SavingsView } from '../store/selectors';
import { parseAmountToKurus } from '../core/money';
import { todayLocalDate, formatDateTR } from '../core/date';
import type { SavingsGoal } from '../domain/types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatCard } from '../ui/StatCard';
import { Modal } from '../ui/Modal';
import { Field, Input, Textarea, Select, MoneyInput } from '../ui/Field';
import { EmptyState, Progress } from '../ui/misc';
import { Money } from '../ui/Money';
import { cx } from '../ui/cx';
import { fmt, centsToInput, PALETTE } from './parts/format';

export function SavingsPage() {
  const s = useSnapshot();
  const views = savingsViews(s);
  const amap = accountMap(s);
  const pushToast = useUIStore((s) => s.pushToast);

  const [goalModal, setGoalModal] = useState<{ editing?: SavingsGoal } | null>(null);
  const [contribFor, setContribFor] = useState<SavingsView | null>(null);
  const [confirmDel, setConfirmDel] = useState<SavingsGoal | null>(null);
  const deleteSavingsGoal = useFinanceStore((s) => s.deleteSavingsGoal);

  const totalSaved = views.reduce((a, v) => a + v.saved, 0);
  const totalTarget = views.reduce((a, v) => a + v.goal.target_amount, 0);
  const activeCount = views.filter((v) => v.goal.is_completed === 0).length;

  if (views.length === 0) {
    return (
      <>
        <PageHead onAdd={() => setGoalModal({})} />
        <Card>
          <EmptyState
            icon={<Target size={26} />}
            title="Henüz birikim hedefin yok"
            description="Tatil, acil durum fonu ya da yeni bir alım için hedef belirle; katkılarını takip et."
            action={<Button onClick={() => setGoalModal({})}><Plus size={16} /> Hedef ekle</Button>}
          />
        </Card>
        {goalModal && <GoalModal editing={goalModal.editing} onClose={() => setGoalModal(null)} />}
      </>
    );
  }

  return (
    <div className="space-y-5">
      <PageHead onAdd={() => setGoalModal({})} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Toplam biriken" value={<Money value={totalSaved} tone="savings" />} icon={<PiggyBank size={18} />} accent="savings" />
        <StatCard label="Toplam hedef" value={<Money value={totalTarget} />} icon={<Target size={18} />} />
        <StatCard label="Aktif hedef" value={String(activeCount)} icon={<CalendarClock size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {views.map((v) => {
          const m = v.metrics;
          const done = v.goal.is_completed === 1 || m.isComplete;
          return (
            <Card key={v.goal.id} padded>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid place-items-center h-11 w-11 rounded-xl shrink-0" style={{ backgroundColor: `${v.goal.color}1a`, color: v.goal.color }}>
                    <Target size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-semibold text-ink truncate">{v.goal.name}</h3>
                      {done && <span className="text-[10.5px] uppercase tracking-wide text-income bg-income/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Check size={11} /> tamam</span>}
                    </div>
                    <p className="text-[12.5px] text-muted mt-0.5">
                      {v.goal.account_id != null ? amap.get(v.goal.account_id)?.name ?? 'Hesap' : 'Hesaba bağlı değil'}
                      {v.goal.target_date && ` · hedef ${formatDateTR(v.goal.target_date)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <IconBtn title="Düzenle" onClick={() => setGoalModal({ editing: v.goal })}><Pencil size={15} /></IconBtn>
                  <IconBtn title="Sil" danger onClick={() => setConfirmDel(v.goal)}><Trash2 size={15} /></IconBtn>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-end justify-between mb-1.5">
                  <Money value={v.saved} tone="savings" className="text-[17px] font-semibold" />
                  <span className="text-[12.5px] text-muted">/ {fmt(v.goal.target_amount)}</span>
                </div>
                <Progress value={m.percent} tone={done ? 'income' : 'savings'} />
                <div className="flex items-center justify-between mt-2 text-[12.5px]">
                  <span className="text-muted">%{Math.round(m.percent)}</span>
                  {!done && m.remainingK > 0 && <span className="text-muted">kalan {fmt(m.remainingK)}</span>}
                </div>
              </div>

              {!done && (m.daysLeft != null || m.requiredDailyK != null) && (
                <div className="mt-3 pt-3 border-t border-line grid grid-cols-2 gap-3 text-[12.5px]">
                  {m.daysLeft != null && (
                    <div>
                      <div className="text-muted">Kalan süre</div>
                      <div className="text-ink font-medium mt-0.5">{m.daysLeft > 0 ? `${m.daysLeft} gün` : 'Süre doldu'}</div>
                    </div>
                  )}
                  {m.requiredDailyK != null && m.requiredDailyK > 0 && (
                    <div>
                      <div className="text-muted">Günlük gereken</div>
                      <div className="text-ink font-medium mt-0.5">{fmt(m.requiredDailyK)}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4">
                <Button variant={done ? 'secondary' : 'primary'} block onClick={() => setContribFor(v)}>
                  <PiggyBank size={16} /> {done ? 'Katkı ekle (tamamlandı)' : 'Katkı ekle'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {goalModal && <GoalModal editing={goalModal.editing} onClose={() => setGoalModal(null)} />}
      {contribFor && <ContributeModal view={contribFor} onClose={() => setContribFor(null)} />}
      {confirmDel && (
        <Modal
          open
          onClose={() => setConfirmDel(null)}
          title="Hedefi sil"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmDel(null)}>Vazgeç</Button>
              <Button variant="danger" onClick={async () => { await deleteSavingsGoal(confirmDel.id); pushToast('success', 'Hedef silindi.'); setConfirmDel(null); }}>Sil</Button>
            </>
          }
        >
          <p className="text-[14px] text-ink/80">
            "{confirmDel.name}" hedefi silinecek. Bugüne dek yaptığın katkı işlemleri korunur (para hesaplarında kalır); yalnızca hedef takibi kaldırılır.
          </p>
        </Modal>
      )}
    </div>
  );
}

function PageHead({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-ink">Birikim Hedefleri</h2>
        <p className="text-[13px] text-muted mt-0.5">Hedeflerine düzenli katkı yap, ilerlemeni gör.</p>
      </div>
      <Button onClick={onAdd}><Plus size={16} /> Hedef ekle</Button>
    </div>
  );
}

function GoalModal({ editing, onClose }: { editing?: SavingsGoal; onClose: () => void }) {
  const s = useSnapshot();
  const addSavingsGoal = useFinanceStore((st) => st.addSavingsGoal);
  const updateSavingsGoal = useFinanceStore((st) => st.updateSavingsGoal);
  const pushToast = useUIStore((st) => st.pushToast);

  const [name, setName] = useState(editing?.name ?? '');
  const [target, setTarget] = useState(editing ? centsToInput(editing.target_amount) : '');
  const [accountId, setAccountId] = useState<string>(editing?.account_id != null ? String(editing.account_id) : '');
  const [targetDate, setTargetDate] = useState(editing?.target_date ?? '');
  const [color, setColor] = useState(editing?.color ?? PALETTE[1]);
  const [note, setNote] = useState(editing?.note ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return pushToast('error', 'Hedef adı gerekli.');
    const targetK = parseAmountToKurus(target);
    if (!targetK || targetK <= 0) return pushToast('error', 'Geçerli bir hedef tutarı gir.');
    setBusy(true);
    const base = {
      name: name.trim(),
      target_amount: targetK,
      account_id: accountId ? Number(accountId) : null,
      target_date: targetDate || null,
      color,
      note: note.trim() || null,
    };
    if (editing) {
      await updateSavingsGoal(editing.id, base);
      pushToast('success', 'Hedef güncellendi.');
    } else {
      await addSavingsGoal({ ...base, start_date: todayLocalDate(), contribution_type: 'manual', icon: 'target', is_completed: 0 });
      pushToast('success', 'Hedef eklendi.');
    }
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Hedefi düzenle' : 'Yeni birikim hedefi'}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button onClick={save} disabled={busy}>{editing ? 'Kaydet' : 'Ekle'}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Hedef adı"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="örn. Yaz tatili" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Hedef tutar"><MoneyInput value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0,00" /></Field>
          <Field label="Hedef tarih" hint="isteğe bağlı"><Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></Field>
        </div>
        <Field label="Biriktirilen hesap" hint="isteğe bağlı — katkılar bu hesaba aktarılır">
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Hesaba bağlama</option>
            {s.accounts.filter((a) => a.is_active === 1).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label="Renk">
          <div className="flex gap-2 flex-wrap">
            {PALETTE.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className={cx('h-8 w-8 rounded-lg border-2 transition-transform', color === c ? 'border-ink scale-110' : 'border-transparent')} style={{ backgroundColor: c }} />
            ))}
          </div>
        </Field>
        <Field label="Not" hint="isteğe bağlı"><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></Field>
      </div>
    </Modal>
  );
}

function ContributeModal({ view, onClose }: { view: SavingsView; onClose: () => void }) {
  const s = useSnapshot();
  const contribute = useFinanceStore((st) => st.contributeToSavings);
  const pushToast = useUIStore((st) => st.pushToast);

  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<string>(view.goal.account_id != null ? String(view.goal.account_id) : (s.accounts[0] ? String(s.accounts[0].id) : ''));
  const [date, setDate] = useState(todayLocalDate());
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const amt = parseAmountToKurus(amount);
    if (!amt || amt <= 0) return pushToast('error', 'Geçerli bir tutar gir.');
    setBusy(true);
    const res = await contribute({ goalId: view.goal.id, fromAccountId: accountId ? Number(accountId) : null, amount: amt, date });
    setBusy(false);
    if (!res.ok) return pushToast('error', res.message ?? 'Katkı eklenemedi.');
    pushToast('success', 'Katkı eklendi.');
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${view.goal.name} — katkı ekle`}
      subtitle={`Biriken: ${fmt(view.saved)} / ${fmt(view.goal.target_amount)}`}
      size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button onClick={save} disabled={busy}><PiggyBank size={15} /> Katkı ekle</Button></>}
    >
      <div className="space-y-4">
        <Field label="Tutar"><MoneyInput value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" autoFocus /></Field>
        <Field label="Hangi hesaptan?" hint="para bu hesaptan birikime aktarılır">
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Hesap seçme (yalnızca kayıt)</option>
            {s.accounts.filter((a) => a.is_active === 1).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label="Tarih"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        {view.goal.account_id != null && (
          <p className="text-[12px] text-muted flex items-center gap-1.5"><Wallet size={13} /> Katkı, hedefin bağlı olduğu hesaba aktarılır.</p>
        )}
      </div>
    </Modal>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cx('grid place-items-center h-8 w-8 rounded-lg text-muted transition-colors', danger ? 'hover:text-expense hover:bg-expense/10' : 'hover:text-brand hover:bg-brand/10')}
    >
      {children}
    </button>
  );
}
