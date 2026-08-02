import { useEffect, useRef } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useFinanceStore } from './store/useFinanceStore';
import { useUIStore } from './store/useUIStore';
import { AppShell } from './app/AppShell';
import { SetupWizard } from './app/SetupWizard';
import { LockScreen } from './app/LockScreen';
import { LogoMark } from './app/Logo';
import { Button } from './ui/Button';

export default function App() {
  const status = useFinanceStore((s) => s.status);
  const errorMessage = useFinanceStore((s) => s.errorMessage);
  const user = useFinanceStore((s) => s.user);
  const init = useFinanceStore((s) => s.init);
  const locked = useUIStore((s) => s.locked);
  const setLocked = useUIStore((s) => s.setLocked);
  const didInitLock = useRef(false);

  useEffect(() => {
    void init();
  }, [init]);

  // Açılışta PIN varsa kilitle (yalnızca bir kez)
  useEffect(() => {
    if (status === 'ready' && !didInitLock.current) {
      didInitLock.current = true;
      if (user?.pin_hash) setLocked(true);
    }
  }, [status, user, setLocked]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen w-screen grid place-items-center bg-base">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-[popIn_.4s_ease]">
            <LogoMark size={56} />
          </div>
          <div className="flex items-center gap-2 text-muted text-[13px]">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
            Yükleniyor…
          </div>
        </div>
      </div>
    );
  }

  if (status === 'needs_setup') {
    return <SetupWizard />;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen w-screen grid place-items-center bg-base p-4">
        <div className="max-w-md text-center bg-surface border border-line rounded-card shadow-card p-8">
          <div className="grid place-items-center h-12 w-12 rounded-xl bg-expense/10 text-expense mx-auto mb-4">
            <AlertTriangle size={24} />
          </div>
          <h1 className="text-lg font-semibold text-ink">Bir şeyler ters gitti</h1>
          <p className="text-[13.5px] text-muted mt-2">Uygulama verileri yüklenirken bir sorun oluştu.</p>
          {errorMessage && <pre className="text-[12px] text-muted bg-elevate rounded-lg p-3 mt-3 text-left overflow-x-auto whitespace-pre-wrap">{errorMessage}</pre>}
          <Button className="mt-5" onClick={() => location.reload()}>
            <RefreshCw size={15} /> Yeniden dene
          </Button>
        </div>
      </div>
    );
  }

  if (locked && user?.pin_hash) {
    return <LockScreen />;
  }

  return <AppShell />;
}
