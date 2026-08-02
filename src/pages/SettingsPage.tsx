import { useState } from 'react';
import { Sun, Moon, Database, Trash2, Info, User as UserIcon, Check, Sparkles, ShieldCheck, Lock } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUIStore } from '../store/useUIStore';
import { parseAmountToKurus } from '../core/money';
import { APP_VERSION } from '../app/version';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Field, Input, MoneyInput } from '../ui/Field';
import { cx } from '../ui/cx';

export function SettingsPage() {
  const user = useFinanceStore((s) => s.user);
  const mode = useFinanceStore((s) => s.mode);
  const accounts = useFinanceStore((s) => s.accounts);
  const transactions = useFinanceStore((s) => s.transactions);
  const settings = useFinanceStore((s) => s.settings);
  const updateUser = useFinanceStore((s) => s.updateUser);
  const seedDemo = useFinanceStore((s) => s.seedDemo);
  const clearData = useFinanceStore((s) => s.clearData);
  const removePin = useFinanceStore((s) => s.removePin);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const setLocked = useUIStore((s) => s.setLocked);
  const pushToast = useUIStore((s) => s.pushToast);

  const [name, setName] = useState(user?.name ?? '');
  const [limit, setLimit] = useState(user?.spending_limit != null ? centsToInput(user.spending_limit) : '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busyData, setBusyData] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [confirmRemovePin, setConfirmRemovePin] = useState(false);

  const hasPin = !!user?.pin_hash;

  const isDemo = settings.is_demo === '1';

  const saveProfile = async () => {
    setSavingProfile(true);
    const lim = limit.trim() === '' ? null : parseAmountToKurus(limit);
    await updateUser({ name: name.trim() || (user?.name ?? 'Kullanıcı'), spending_limit: lim });
    pushToast('success', 'Profil güncellendi.');
    setSavingProfile(false);
  };

  return (
    <div className="max-w-3xl space-y-5">
      {/* Profil */}
      <Card>
        <CardHeader title="Profil" subtitle="Adınız ve aylık harcama sınırınız" action={<UserIcon size={18} className="text-muted" />} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ad">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Adınız" />
          </Field>
          <Field label="Aylık harcama sınırı" hint="Boş bırakılırsa sınır uygulanmaz">
            <MoneyInput value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="Sınır yok" />
          </Field>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Button onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
          </Button>
          <span className="text-[12.5px] text-muted">Para birimi: {user?.currency ?? 'TRY'}</span>
        </div>
      </Card>

      {/* Görünüm */}
      <Card>
        <CardHeader title="Görünüm" subtitle="Uygulama teması" />
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {(['light', 'dark'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cx(
                'flex items-center gap-3 rounded-card border p-3 transition-colors text-left',
                theme === t ? 'border-brand bg-brand-soft' : 'border-line hover:bg-ink/5',
              )}
            >
              <span className={cx('grid place-items-center h-9 w-9 rounded-lg', theme === t ? 'bg-brand text-white' : 'bg-elevate text-muted')}>
                {t === 'light' ? <Sun size={18} /> : <Moon size={18} />}
              </span>
              <div className="flex-1">
                <div className="text-[14px] font-medium text-ink">{t === 'light' ? 'Açık' : 'Koyu'}</div>
              </div>
              {theme === t && <Check size={16} className="text-brand" />}
            </button>
          ))}
        </div>
      </Card>

      {/* Güvenlik */}
      <Card>
        <CardHeader title="Güvenlik" subtitle="PIN ile uygulama kilidi" action={<ShieldCheck size={18} className="text-muted" />} />
        <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-elevate/50 p-3.5">
          <div>
            <div className="text-[14px] font-medium text-ink flex items-center gap-2">
              PIN koruması
              <span className={cx('text-[10.5px] uppercase tracking-wide px-2 py-0.5 rounded-full', hasPin ? 'text-income bg-income/10' : 'text-muted bg-ink/5')}>
                {hasPin ? 'açık' : 'kapalı'}
              </span>
            </div>
            <p className="text-[12.5px] text-muted mt-0.5">
              {hasPin ? 'Uygulama açılışta PIN ister. PIN cihazınızda şifreli saklanır.' : 'Açılışta PIN sorulmasını istiyorsanız bir PIN oluşturun.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasPin ? (
              <>
                <Button variant="secondary" onClick={() => setLocked(true)}><Lock size={15} /> Kilitle</Button>
                <Button variant="secondary" onClick={() => setPinModal(true)}>Değiştir</Button>
                <Button variant="ghost" onClick={() => setConfirmRemovePin(true)}>Kaldır</Button>
              </>
            ) : (
              <Button onClick={() => setPinModal(true)}><Lock size={15} /> PIN oluştur</Button>
            )}
          </div>
        </div>
      </Card>

      {/* Veri yönetimi */}
      <Card>
        <CardHeader title="Veri yönetimi" subtitle="Örnek veri veya sıfırlama" action={<Database size={18} className="text-muted" />} />
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-elevate/50 p-3.5">
            <div>
              <div className="text-[14px] font-medium text-ink flex items-center gap-2">
                Örnek veri yükle
                {isDemo && <span className="text-[10.5px] uppercase tracking-wide text-brand bg-brand-soft px-2 py-0.5 rounded-full">etkin</span>}
              </div>
              <p className="text-[12.5px] text-muted mt-0.5">Uygulamayı denemek için gerçekçi hesap, işlem ve borç verisi oluşturur.</p>
            </div>
            <Button
              variant="secondary"
              disabled={busyData}
              onClick={async () => {
                setBusyData(true);
                await seedDemo();
                pushToast('success', 'Örnek veri yüklendi.');
                setBusyData(false);
              }}
            >
              <Sparkles size={15} /> Yükle
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-expense/25 bg-expense/5 p-3.5">
            <div>
              <div className="text-[14px] font-medium text-expense">Tüm verileri temizle</div>
              <p className="text-[12.5px] text-muted mt-0.5">Hesaplar, işlemler ve borçlar dahil tüm veriler silinir. Geri alınamaz.</p>
            </div>
            <Button variant="danger" onClick={() => setConfirmClear(true)} disabled={busyData}>
              <Trash2 size={15} /> Temizle
            </Button>
          </div>
        </div>
      </Card>

      {/* Uygulama bilgisi */}
      <Card>
        <CardHeader title="Uygulama" subtitle="Sürüm ve durum" action={<Info size={18} className="text-muted" />} />
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
          <Info2 label="Sürüm" value={APP_VERSION} />
          <Info2 label="Çalışma modu" value={mode === 'tauri' ? 'Masaüstü' : 'Tarayıcı önizleme'} />
          <Info2 label="Hesap sayısı" value={String(accounts.length)} />
          <Info2 label="İşlem sayısı" value={String(transactions.length)} />
        </dl>
        {mode === 'browser' && (
          <p className="text-[12.5px] text-muted mt-4 pt-4 border-t border-line">
            Tarayıcı önizlemesinde veriler kalıcı değildir. Verilerinizin cihazınızda güvenle saklanması için masaüstü
            uygulamasını kullanın.
          </p>
        )}
      </Card>

      {confirmClear && (
        <Modal
          open
          onClose={() => setConfirmClear(false)}
          title="Tüm verileri temizle"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmClear(false)} disabled={busyData}>
                Vazgeç
              </Button>
              <Button
                variant="danger"
                disabled={busyData}
                onClick={async () => {
                  setBusyData(true);
                  await clearData();
                  pushToast('success', 'Tüm veriler temizlendi.');
                  setBusyData(false);
                  setConfirmClear(false);
                }}
              >
                Evet, temizle
              </Button>
            </>
          }
        >
          <p className="text-[14px] text-ink/80">Bu işlem tüm hesap, işlem, borç ve birikim verilerinizi kalıcı olarak siler. Devam etmek istiyor musunuz?</p>
        </Modal>
      )}

      {pinModal && <PinModal change={hasPin} onClose={() => setPinModal(false)} />}

      {confirmRemovePin && (
        <Modal
          open
          onClose={() => setConfirmRemovePin(false)}
          title="PIN'i kaldır"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmRemovePin(false)}>Vazgeç</Button>
              <Button variant="danger" onClick={async () => { await removePin(); pushToast('success', 'PIN kaldırıldı.'); setConfirmRemovePin(false); }}>Kaldır</Button>
            </>
          }
        >
          <p className="text-[14px] text-ink/80">PIN koruması kapatılacak ve uygulama açılışta PIN sormayacak. Emin misiniz?</p>
        </Modal>
      )}
    </div>
  );
}

function PinModal({ change, onClose }: { change: boolean; onClose: () => void }) {
  const setPin = useFinanceStore((s) => s.setPin);
  const pushToast = useUIStore((s) => s.pushToast);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);

  const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 8);

  const save = async () => {
    if (p1.length < 4) return pushToast('error', 'PIN en az 4 haneli olmalı.');
    if (p1 !== p2) return pushToast('error', 'PIN’ler eşleşmiyor.');
    setBusy(true);
    await setPin(p1);
    setBusy(false);
    pushToast('success', change ? 'PIN güncellendi.' : 'PIN oluşturuldu.');
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={change ? 'PIN’i değiştir' : 'PIN oluştur'}
      subtitle="4–8 haneli bir PIN belirleyin"
      size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button onClick={save} disabled={busy}>{change ? 'Güncelle' : 'Oluştur'}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Yeni PIN">
          <Input inputMode="numeric" type="password" value={p1} onChange={(e) => setP1(onlyDigits(e.target.value))} placeholder="••••" autoFocus />
        </Field>
        <Field label="PIN’i tekrar gir">
          <Input inputMode="numeric" type="password" value={p2} onChange={(e) => setP2(onlyDigits(e.target.value))} placeholder="••••" />
        </Field>
      </div>
    </Modal>
  );
}

function Info2({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink font-medium mt-0.5 tabular">{value}</dd>
    </div>
  );
}

function centsToInput(k: number): string {
  const lira = Math.trunc(k / 100);
  const kr = Math.abs(k % 100);
  return `${lira},${String(kr).padStart(2, '0')}`;
}
