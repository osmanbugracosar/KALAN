import { useState } from 'react';
import { Lock, Delete } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUIStore } from '../store/useUIStore';
import { verifyPin } from '../core/security';
import { LogoMark } from './Logo';
import { cx } from '../ui/cx';

export function LockScreen() {
  const user = useFinanceStore((s) => s.user);
  const setLocked = useUIStore((s) => s.setLocked);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const MAX = 8;

  const submit = async (value: string) => {
    if (!user?.pin_hash || !user.pin_salt) {
      setLocked(false);
      return;
    }
    const ok = await verifyPin(value, user.pin_salt, user.pin_hash);
    if (ok) {
      setLocked(false);
    } else {
      setError(true);
      setShake(true);
      setPin('');
      setTimeout(() => setShake(false), 400);
    }
  };

  const press = (d: string) => {
    setError(false);
    setPin((p) => {
      const next = (p + d).slice(0, MAX);
      return next;
    });
  };

  const backspace = () => {
    setError(false);
    setPin((p) => p.slice(0, -1));
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="min-h-screen w-screen grid place-items-center bg-base p-4">
      <div className={cx('w-full max-w-[320px] flex flex-col items-center', shake && 'animate-[shake_.4s]')}>
        <LogoMark size={52} />
        <h1 className="text-lg font-semibold text-ink mt-4">Kalan kilitli</h1>
        <p className="text-[13px] text-muted mt-1 flex items-center gap-1.5">
          <Lock size={13} /> Devam etmek için PIN gir
        </p>

        {/* PIN göstergesi */}
        <div className="flex items-center gap-2.5 my-7 h-4">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span
              key={i}
              className={cx('h-3 w-3 rounded-full transition-colors', i < pin.length ? (error ? 'bg-expense' : 'bg-brand') : 'bg-ink/15')}
            />
          ))}
        </div>

        {error && <p className="text-[12.5px] text-expense -mt-4 mb-3">Yanlış PIN, tekrar dene.</p>}

        {/* Tuş takımı */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {keys.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              className="h-16 rounded-2xl bg-surface border border-line text-xl font-medium text-ink hover:bg-elevate active:scale-95 transition"
            >
              {k}
            </button>
          ))}
          <button onClick={() => submit(pin)} disabled={pin.length === 0} className="h-16 rounded-2xl bg-brand text-white text-[13px] font-semibold hover:opacity-90 active:scale-95 transition disabled:opacity-40">
            Aç
          </button>
          <button onClick={() => press('0')} className="h-16 rounded-2xl bg-surface border border-line text-xl font-medium text-ink hover:bg-elevate active:scale-95 transition">
            0
          </button>
          <button onClick={backspace} disabled={pin.length === 0} className="h-16 rounded-2xl bg-surface border border-line text-muted grid place-items-center hover:bg-elevate active:scale-95 transition disabled:opacity-40">
            <Delete size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
