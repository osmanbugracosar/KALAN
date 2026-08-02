import { useState } from 'react';
import { Wallet, Plus, Pencil, Trash2, AlertTriangle, TrendingUp } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUIStore } from '../store/useUIStore';
import { useSnapshot } from '../app/useSnapshot';
import { budgetViews, type BudgetView } from '../store/selectors';
import { parseAmountToKurus } from '../core/money';
import { formatMonthYearTR } from '../core/date';
import type { Budget } from '../domain/types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatCard } from '../ui/StatCard';
import { Modal } from '../ui/Modal';
import { Field, Input, Select, MoneyInput } from '../ui/Field';
import { EmptyState, Progress } from '../ui/misc';
import { Money } from '../ui/Money';
import { cx } from '../ui/cx';
import { fmt, centsToInput } from './parts/format';

const LEVEL_TONE: Record<BudgetView['usage']['level'], 'brand' | 'income' | 'warn' | 'expense'> = {
  ok: 'income',
  warn: 'warn',
  critical: 'expense',
  over: 'expense',
};
const LEVEL_LABEL: Record<BudgetView['usage']['level'], string> = {
  ok: 'Yolunda',
  warn: 'Dikkat',
  critical: 'Sınıra yakın',
  over: 'Aşıldı',
};

export function BudgetsPage() {
  const s = useSnapshot();
  const mKey = useUIStore((st) => st.selectedMonth);
  const pushToast = useUIStore((st) => st.pushToast);
  const views = budgetViews(s, mKey);

  const [modal, setModal] = useState<{ editing?: Budget } | null>(null);
  const [confirmDel, setConfirmDel] = useState<Budget | null>(null);
  const deleteBudget = useFinanceStore((st) => st.deleteBudget);

  const totalLimit = views.reduce((a, v) => a + v.budget.limit_amount, 0);
  const totalSpent = views.reduce((a, v) => a + v.spent, 0);
  const totalRemaining = totalLimit - totalSpent;

  if (views.length === 0) {
    return (
      <>
        <PageHead onAdd={() => setModal({})} mKey={mKey} />
        <Card>
          <EmptyState
            icon={<Wallet size={26} />}
            title="Henüz bütçen yok"
            description="Genel bir aylık sınır ya da kategori bazlı bütçeler oluştur; harcamalarını sınırla."
            action={<Button onClick={() => setModal({})}><Plus size={16} /> Bütçe ekle</Button>}
          />
        </Card>
        {modal && <BudgetModal editing={modal.editing} onClose={() => setModal(null)} />}
      </>
    );
  }

  return (
    <div className="space-y-5">
      <PageHead onAdd={() => setModal({})} mKey={mKey} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Toplam sınır" value={<Money value={totalLimit} />} icon={<Wallet size={18} />} />
        <StatCard label="Harcanan" value={<Money value={totalSpent} tone="expense" />} icon={<TrendingUp size={18} />} accent="expense" />
        <StatCard label="Kalan" value={<Money value={totalRemaining} tone={totalRemaining < 0 ? 'expense' : 'income'} />} accent={totalRemaining < 0 ? 'expense' : 'income'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {views.map((v) => {
          const u = v.usage;
          return (
            <Card key={v.budget.id} padded>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-ink truncate">{v.budget.name}</h3>
                    <span className={cx('text-[10.5px] uppercase tracking-wide px-2 py-0.5 rounded-full',
                      u.level === 'ok' ? 'text-income bg-income/10' : u.level === 'warn' ? 'text-warn bg-warn/10' : 'text-expense bg-expense/10')}>
                      {LEVEL_LABEL[u.level]}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-muted mt-0.5">
                    {v.categoryName ? `${v.categoryName} · ` : 'Tüm giderler · '}
                    {v.budget.period === 'weekly' ? 'haftalık' : 'aylık'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <IconBtn title="Düzenle" onClick={() => setModal({ editing: v.budget })}><Pencil size={15} /></IconBtn>
                  <IconBtn title="Sil" danger onClick={() => setConfirmDel(v.budget)}><Trash2 size={15} /></IconBtn>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-end justify-between mb-1.5">
                  <Money value={v.spent} tone={u.over ? 'expense' : 'default'} className="text-[17px] font-semibold" />
                  <span className="text-[12.5px] text-muted">/ {fmt(v.budget.limit_amount)}</span>
                </div>
                <Progress value={Math.min(100, u.usagePercent)} tone={LEVEL_TONE[u.level]} />
                <div className="flex items-center justify-between mt-2 text-[12.5px]">
                  <span className="text-muted">%{Math.round(u.usagePercent)}</span>
                  {u.over ? (
                    <span className="text-expense font-medium inline-flex items-center gap-1"><AlertTriangle size={12} /> {fmt(u.overByK)} aşıldı</span>
                  ) : (
                    <span className="text-muted">kalan {fmt(u.remainingK)}</span>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-line text-[12.5px] flex items-center justify-between">
                <span className="text-muted">Dönem sonu tahmini</span>
                <span className={cx('font-medium', u.projectionK > v.budget.limit_amount ? 'text-expense' : 'text-ink')}>{fmt(u.projectionK)}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {modal && <BudgetModal editing={modal.editing} onClose={() => setModal(null)} />}
      {confirmDel && (
        <Modal
          open onClose={() => setConfirmDel(null)} title="Bütçeyi sil" size="sm"
          footer={<><Button variant="ghost" onClick={() => setConfirmDel(null)}>Vazgeç</Button><Button variant="danger" onClick={async () => { await deleteBudget(confirmDel.id); pushToast('success', 'Bütçe silindi.'); setConfirmDel(null); }}>Sil</Button></>}
        >
          <p className="text-[14px] text-ink/80">"{confirmDel.name}" bütçesi silinecek. İşlemlerin etkilenmez.</p>
        </Modal>
      )}
    </div>
  );
}

function PageHead({ onAdd, mKey }: { onAdd: () => void; mKey: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-ink">Bütçeler</h2>
        <p className="text-[13px] text-muted mt-0.5">{formatMonthYearTR(mKey)} dönemine göre kullanım.</p>
      </div>
      <Button onClick={onAdd}><Plus size={16} /> Bütçe ekle</Button>
    </div>
  );
}

function BudgetModal({ editing, onClose }: { editing?: Budget; onClose: () => void }) {
  const s = useSnapshot();
  const addBudget = useFinanceStore((st) => st.addBudget);
  const updateBudget = useFinanceStore((st) => st.updateBudget);
  const pushToast = useUIStore((st) => st.pushToast);

  const expenseCategories = s.categories.filter((c) => c.kind === 'expense');

  const [name, setName] = useState(editing?.name ?? '');
  const [limit, setLimit] = useState(editing ? centsToInput(editing.limit_amount) : '');
  const [categoryId, setCategoryId] = useState<string>(editing?.category_id != null ? String(editing.category_id) : '');
  const [period, setPeriod] = useState<'monthly' | 'weekly'>(editing?.period ?? 'monthly');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return pushToast('error', 'Bütçe adı gerekli.');
    const limitK = parseAmountToKurus(limit);
    if (!limitK || limitK <= 0) return pushToast('error', 'Geçerli bir sınır tutarı gir.');
    setBusy(true);
    const catId = categoryId ? Number(categoryId) : null;
    const method: Budget['method'] = catId != null ? 'category_based' : period === 'weekly' ? 'weekly_limit' : 'manual_limit';
    const base = { name: name.trim(), limit_amount: limitK, category_id: catId, period, method };
    if (editing) {
      await updateBudget(editing.id, base);
      pushToast('success', 'Bütçe güncellendi.');
    } else {
      await addBudget({ ...base, is_active: 1 });
      pushToast('success', 'Bütçe eklendi.');
    }
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open onClose={onClose} title={editing ? 'Bütçeyi düzenle' : 'Yeni bütçe'}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button onClick={save} disabled={busy}>{editing ? 'Kaydet' : 'Ekle'}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Bütçe adı"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="örn. Aylık market" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sınır tutarı"><MoneyInput value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0,00" /></Field>
          <Field label="Dönem">
            <Select value={period} onChange={(e) => setPeriod(e.target.value as 'monthly' | 'weekly')}>
              <option value="monthly">Aylık</option>
              <option value="weekly">Haftalık</option>
            </Select>
          </Field>
        </div>
        <Field label="Kategori" hint="boş bırakılırsa tüm giderleri kapsar (genel bütçe)">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Tüm giderler (genel)</option>
            {expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
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
