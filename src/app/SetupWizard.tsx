import { useState } from 'react';
import { ArrowRight, ArrowLeft, Plus, Trash2, Wallet, Landmark, CreditCard, PiggyBank, Sparkles, Check } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUIStore } from '../store/useUIStore';
import type { SetupAccountInput } from '../db/persistence';
import { AccountType, ACCOUNT_TYPE_LABELS } from '../domain/enums';
import { parseAmountToKurus } from '../core/money';
import { LogoMark } from './Logo';
import { Button } from '../ui/Button';
import { Field, Input, Select, MoneyInput } from '../ui/Field';
import { cx } from '../ui/cx';

interface DraftAccount {
  name: string;
  type: SetupAccountInput['type'];
  balance: string;
  is_protected: boolean;
}

const TYPE_ICON: Record<string, typeof Wallet> = { cash: Wallet, bank: Landmark, card: CreditCard, savings: PiggyBank };

const STARTER: DraftAccount[] = [
  { name: 'Nakit', type: 'cash', balance: '', is_protected: false },
  { name: 'Banka hesabı', type: 'bank', balance: '', is_protected: false },
];

export function SetupWizard() {
  const completeSetup = useFinanceStore((s) => s.completeSetup);
  const pushToast = useUIStore((s) => s.pushToast);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [accounts, setAccounts] = useState<DraftAccount[]>(STARTER);
  const [limit, setLimit] = useState('');
  const [busy, setBusy] = useState(false);

  const finish = async (useDemo: boolean) => {
    setBusy(true);
    try {
      const validAccounts: SetupAccountInput[] = accounts
        .filter((a) => a.name.trim())
        .map((a) => ({ name: a.name.trim(), type: a.type, initial_balance: parseAmountToKurus(a.balance) ?? 0, is_protected: a.is_protected ? 1 : 0 }));

      await completeSetup({
        name: name.trim() || 'Kullanıcı',
        currency: 'TRY',
        spendingLimit: limit.trim() ? parseAmountToKurus(limit) : null,
        pinHash: null,
        pinSalt: null,
        accounts: useDemo ? [] : validAccounts,
        useDemo,
      });
      pushToast('success', useDemo ? 'Örnek veriyle başlatıldı.' : 'Kurulum tamamlandı. Hoş geldiniz!');
    } catch (e) {
      pushToast('error', e instanceof Error ? e.message : 'Kurulum tamamlanamadı.');
      setBusy(false);
    }
  };

  const updateAccount = (i: number, patch: Partial<DraftAccount>) => setAccounts((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const removeAccount = (i: number) => setAccounts((prev) => prev.filter((_, idx) => idx !== i));
  const addAccount = () => setAccounts((prev) => [...prev, { name: '', type: 'cash', balance: '', is_protected: false }]);

  return (
    <div className="min-h-screen w-screen grid place-items-center bg-base p-4 overflow-y-auto">
      <div className="w-full max-w-lg">
        {/* Marka */}
        <div className="flex flex-col items-center mb-6">
          <LogoMark size={52} />
          <h1 className="text-2xl font-bold text-ink mt-3">Kalan</h1>
          <p className="text-[13.5px] text-muted mt-1">ne geldi, ne gitti, ne kaldı</p>
        </div>

        {/* Adım göstergesi */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[0, 1, 2].map((s) => (
            <span key={s} className={cx('h-1.5 rounded-full transition-all', s === step ? 'w-7 bg-brand' : s < step ? 'w-4 bg-brand/50' : 'w-4 bg-line')} />
          ))}
        </div>

        <div className="bg-surface border border-line rounded-card shadow-card p-6">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">Hoş geldiniz</h2>
                <p className="text-[13.5px] text-muted mt-1">Kalan, paranızın nereye gittiğini sade bir şekilde takip etmenizi sağlar. Verileriniz yalnızca bu cihazda saklanır.</p>
              </div>
              <Field label="Size nasıl hitap edelim?">
                <Input placeholder="Adınız" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </Field>
              <div className="flex flex-col gap-2 pt-1">
                <Button block onClick={() => setStep(1)}>
                  Devam <ArrowRight size={16} />
                </Button>
                <button
                  onClick={() => finish(true)}
                  disabled={busy}
                  className="text-[13px] text-muted hover:text-brand transition-colors inline-flex items-center justify-center gap-1.5 py-1"
                >
                  <Sparkles size={14} /> Örnek veriyle keşfet
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Hesaplarınız</h2>
                <p className="text-[13.5px] text-muted mt-1">Paranızın durduğu yerleri ekleyin. Şimdiki bakiyeyi girmeniz yeterli; dilediğiniz zaman değiştirebilirsiniz.</p>
              </div>

              <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1 -mr-1">
                {accounts.map((a, i) => {
                  const Icon = TYPE_ICON[a.type] ?? Wallet;
                  return (
                    <div key={i} className="rounded-lg border border-line bg-elevate/50 p-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid place-items-center h-9 w-9 rounded-lg bg-brand-soft text-brand shrink-0">
                          <Icon size={17} />
                        </span>
                        <Input placeholder="Hesap adı" value={a.name} onChange={(e) => updateAccount(i, { name: e.target.value })} className="flex-1" />
                        {accounts.length > 1 && (
                          <button onClick={() => removeAccount(i)} className="grid place-items-center h-8 w-8 rounded-lg text-muted hover:text-expense hover:bg-expense/10 transition-colors shrink-0" title="Kaldır">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                        <Select value={a.type} onChange={(e) => updateAccount(i, { type: e.target.value as DraftAccount['type'], is_protected: e.target.value === 'savings' })}>
                          {Object.values(AccountType).map((t) => (
                            <option key={t} value={t}>
                              {ACCOUNT_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </Select>
                        <MoneyInput placeholder="Bakiye 0,00" value={a.balance} onChange={(e) => updateAccount(i, { balance: e.target.value })} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button onClick={addAccount} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border border-dashed border-line text-[13px] text-muted hover:text-brand hover:border-brand/40 transition-colors">
                <Plus size={16} /> Hesap ekle
              </button>

              <div className="flex gap-2 pt-1">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  <ArrowLeft size={16} /> Geri
                </Button>
                <Button block onClick={() => setStep(2)}>
                  Devam <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">Aylık harcama sınırı</h2>
                <p className="text-[13.5px] text-muted mt-1">İsterseniz aylık bir harcama sınırı belirleyin. Genel bakışta kalan bütçenizi bu sınıra göre gösteririz. Bu adımı atlayabilirsiniz.</p>
              </div>
              <Field label="Aylık sınır (isteğe bağlı)" hint="Boş bırakabilirsiniz">
                <MoneyInput placeholder="örn. 20.000,00" value={limit} onChange={(e) => setLimit(e.target.value)} autoFocus />
              </Field>

              <div className="rounded-lg border border-line bg-elevate/50 p-3.5 text-[13px] text-ink/80 space-y-1.5">
                <div className="flex items-center gap-2 text-ink font-medium">
                  <Check size={15} className="text-income" /> Kuruluma hazır
                </div>
                <p className="text-muted text-[12.5px]">{accounts.filter((a) => a.name.trim()).length} hesap eklenecek. Verileriniz güvenle cihazınızda tutulacak.</p>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft size={16} /> Geri
                </Button>
                <Button block onClick={() => finish(false)} disabled={busy}>
                  {busy ? 'Hazırlanıyor…' : 'Kalan’ı başlat'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[11.5px] text-muted mt-5">Kalan · çevrimdışı çalışır · verileriniz cihazınızda kalır</p>
      </div>
    </div>
  );
}
