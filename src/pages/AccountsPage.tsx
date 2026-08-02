import { useState } from 'react';
import { Wallet, Landmark, CreditCard, PiggyBank, Smartphone, Circle, Plus, Pencil, ShieldCheck } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUIStore } from '../store/useUIStore';
import { useSnapshot } from '../app/useSnapshot';
import { effective } from '../store/selectors';
import { computeBalances, totalBalance } from '../services/calculations';
import { ACCOUNT_TYPE_LABELS, AccountType } from '../domain/enums';
import type { Account } from '../domain/types';
import { parseAmountToKurus } from '../core/money';
import { Card } from '../ui/Card';
import { StatCard } from '../ui/StatCard';
import { Money } from '../ui/Money';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Field, Input, Select, MoneyInput } from '../ui/Field';
import { Badge, EmptyState } from '../ui/misc';
import { cx } from '../ui/cx';

const ACCOUNT_ICON: Record<string, typeof Wallet> = {
  cash: Wallet,
  bank: Landmark,
  card: CreditCard,
  savings: PiggyBank,
  wallet: Smartphone,
  other: Circle,
};
const ACCOUNT_PALETTE = ['#0E5E63', '#2563C7', '#1E8E5A', '#D9822B', '#7C3AED', '#DB2777'];

export function AccountsPage() {
  const snap = useSnapshot();
  const accounts = useFinanceStore((s) => s.accounts);
  const [modal, setModal] = useState<{ mode: 'add' } | { mode: 'edit'; account: Account } | null>(null);

  const eff = effective(snap);
  const balances = computeBalances(accounts, eff);
  const total = totalBalance(accounts, eff);
  const active = accounts.filter((a) => a.is_active === 1);
  const protectedTotal = active.filter((a) => a.is_protected === 1).reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Toplam bakiye" accent="brand" value={<Money value={total} tone="brand" />} icon={<Wallet size={17} />} />
        <StatCard label="Korumalı birikim" accent="savings" value={<Money value={protectedTotal} tone="savings" />} icon={<ShieldCheck size={17} />} hint="Kullanılabilir bakiyeden düşülür" />
        <StatCard label="Aktif hesap" accent="ink" value={active.length} hint={`${accounts.length} hesap tanımlı`} />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-ink">Hesaplar</h3>
          <Button size="sm" onClick={() => setModal({ mode: 'add' })}>
            <Plus size={16} /> Hesap ekle
          </Button>
        </div>

        {accounts.length === 0 ? (
          <EmptyState icon={<Wallet size={22} />} title="Henüz hesap yok" description="Nakit, banka, kart veya birikim hesabı ekleyerek başlayın." action={<Button onClick={() => setModal({ mode: 'add' })}>Hesap ekle</Button>} />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map((a) => {
              const Icon = ACCOUNT_ICON[a.type] ?? Wallet;
              const bal = balances.get(a.id) ?? a.initial_balance;
              return (
                <li key={a.id} className={cx('rounded-card border border-line p-4 flex items-center gap-3', a.is_active ? 'bg-elevate/50' : 'bg-elevate/20 opacity-60')}>
                  <span className="grid place-items-center h-11 w-11 rounded-xl shrink-0" style={{ background: `${a.color}1a`, color: a.color }}>
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14.5px] font-semibold text-ink truncate">{a.name}</span>
                      {a.is_protected === 1 && <Badge tone="savings"><ShieldCheck size={11} /> korumalı</Badge>}
                      {a.is_active === 0 && <Badge tone="muted">pasif</Badge>}
                    </div>
                    <div className="text-[12px] text-muted">{ACCOUNT_TYPE_LABELS[a.type]}</div>
                  </div>
                  <div className="text-right">
                    <Money value={bal} tone={bal < 0 ? 'expense' : 'default'} className="text-[15px] font-semibold" />
                    <button onClick={() => setModal({ mode: 'edit', account: a })} className="block ml-auto mt-1 text-[12px] text-muted hover:text-brand inline-flex items-center gap-1 transition-colors">
                      <Pencil size={12} /> Düzenle
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {modal && <AccountModal state={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function AccountModal({ state, onClose }: { state: { mode: 'add' } | { mode: 'edit'; account: Account }; onClose: () => void }) {
  const addAccount = useFinanceStore((s) => s.addAccount);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const accounts = useFinanceStore((s) => s.accounts);
  const user = useFinanceStore((s) => s.user);
  const pushToast = useUIStore((s) => s.pushToast);

  const editing = state.mode === 'edit' ? state.account : null;
  const [name, setName] = useState(editing?.name ?? '');
  const [type, setType] = useState<Account['type']>(editing?.type ?? 'cash');
  const [balance, setBalance] = useState(editing ? centsToInput(editing.initial_balance) : '');
  const [color, setColor] = useState(editing?.color ?? ACCOUNT_PALETTE[0]);
  const [isProtected, setIsProtected] = useState((editing?.is_protected ?? 0) === 1);
  const [isActive, setIsActive] = useState((editing?.is_active ?? 1) === 1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Hesap adı girin.');
      return;
    }
    const bal = parseAmountToKurus(balance) ?? 0;
    setBusy(true);
    try {
      if (editing) {
        await updateAccount(editing.id, { name: name.trim(), type, initial_balance: bal, color, is_protected: isProtected ? 1 : 0, is_active: isActive ? 1 : 0 });
        pushToast('success', 'Hesap güncellendi.');
      } else {
        await addAccount({
          name: name.trim(),
          type,
          initial_balance: bal,
          currency: user?.currency ?? 'TRY',
          color,
          icon: type,
          is_protected: isProtected ? 1 : 0,
          is_active: isActive ? 1 : 0,
          sort_order: accounts.length,
        });
        pushToast('success', 'Hesap eklendi.');
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hesap kaydedilemedi.');
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Hesabı düzenle' : 'Yeni hesap'}
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
        <Field label="Hesap adı">
          <Input placeholder="örn. Ziraat vadesiz, Cüzdan" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hesap türü">
            <Select value={type} onChange={(e) => setType(e.target.value as Account['type'])}>
              {Object.values(AccountType).map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={editing ? 'Başlangıç bakiyesi' : 'Mevcut bakiye'} hint={editing ? 'İşlemler bunun üzerine eklenir' : undefined}>
            <MoneyInput placeholder="0,00" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </Field>
        </div>

        <Field label="Renk">
          <div className="flex gap-2">
            {ACCOUNT_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cx('h-8 w-8 rounded-lg transition-transform', color === c ? 'ring-2 ring-offset-2 ring-offset-surface scale-105' : 'hover:scale-105')}
                style={{ background: c, ...(color === c ? { boxShadow: `0 0 0 2px ${c}` } : {}) }}
                aria-label={c}
              />
            ))}
          </div>
        </Field>

        <div className="space-y-2.5 pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={isProtected} onChange={(e) => setIsProtected(e.target.checked)} className="h-4 w-4 accent-brand" />
            <span className="text-[13px] text-ink/85">Korumalı birikim (kullanılabilir bakiyeden düşülür)</span>
          </label>
          {editing && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-brand" />
              <span className="text-[13px] text-ink/85">Aktif hesap</span>
            </label>
          )}
        </div>

        {error && <p className="text-[13px] text-expense">{error}</p>}
      </div>
    </Modal>
  );
}

function centsToInput(k: number): string {
  const lira = Math.trunc(k / 100);
  const kr = Math.abs(k % 100);
  return `${lira},${String(kr).padStart(2, '0')}`;
}
