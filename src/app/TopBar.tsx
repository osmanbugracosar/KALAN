import { useEffect, useRef, useState } from 'react';
import { Plus, Sun, Moon, ChevronDown, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';
import { NAV_ITEMS, type PageId } from './nav';
import { useUIStore } from '../store/useUIStore';
import { useModals, type TxModalMode } from './useModals';
import { currentMonthKey, formatMonthYearTR, monthsBack } from '../core/date';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';

const PAGE_SUBTITLE: Partial<Record<PageId, string>> = {
  overview: 'Ne geldi, ne gitti, ne kaldı?',
  accounts: 'Nakit, banka ve birikim hesaplarınız',
  transactions: 'Tüm gelir, gider ve hareketler',
  debts: 'Borçlar ve kalan bakiyeler',
};

function useOutsideClose<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return ref;
}

export function TopBar() {
  const page = useUIStore((s) => s.page);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const selectedMonth = useUIStore((s) => s.selectedMonth);
  const setSelectedMonth = useUIStore((s) => s.setSelectedMonth);
  const openTx = useModals((s) => s.openTx);

  const [monthOpen, setMonthOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const monthRef = useOutsideClose<HTMLDivElement>(() => setMonthOpen(false));
  const addRef = useOutsideClose<HTMLDivElement>(() => setAddOpen(false));

  const item = NAV_ITEMS.find((n) => n.id === page)!;
  const months = monthsBack(12).reverse();
  const isCurrent = selectedMonth === currentMonthKey();

  const quickItems: { mode: TxModalMode; label: string; icon: typeof Plus; cls: string }[] = [
    { mode: 'income', label: 'Gelir ekle', icon: TrendingUp, cls: 'text-income' },
    { mode: 'expense', label: 'Gider ekle', icon: TrendingDown, cls: 'text-expense' },
    { mode: 'transfer', label: 'Transfer', icon: ArrowLeftRight, cls: 'text-brand' },
  ];

  return (
    <header className="h-16 shrink-0 bg-surface/80 backdrop-blur border-b border-line flex items-center justify-between px-5 gap-4">
      <div className="min-w-0">
        <h1 className="text-[19px] font-semibold text-ink leading-tight truncate">{item.label}</h1>
        {PAGE_SUBTITLE[page] && <p className="text-[12.5px] text-muted truncate">{PAGE_SUBTITLE[page]}</p>}
      </div>

      <div className="flex items-center gap-2">
        {/* Ay seçici */}
        <div className="relative" ref={monthRef}>
          <button
            onClick={() => setMonthOpen((v) => !v)}
            className={cx(
              'h-10 pl-3 pr-2.5 rounded-lg border text-sm font-medium flex items-center gap-2 transition-colors',
              monthOpen ? 'border-brand bg-surface' : 'border-line bg-elevate hover:bg-line/40',
            )}
          >
            <span className="text-ink">{formatMonthYearTR(selectedMonth)}</span>
            {isCurrent && <span className="text-[10px] text-brand bg-brand-soft px-1.5 py-0.5 rounded">bu ay</span>}
            <ChevronDown size={15} className="text-muted" />
          </button>
          {monthOpen && (
            <div className="absolute right-0 mt-1.5 w-56 max-h-72 overflow-y-auto bg-surface border border-line rounded-card shadow-pop p-1.5 z-40 animate-[popIn_.12s_ease]">
              {months.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setSelectedMonth(m);
                    setMonthOpen(false);
                  }}
                  className={cx(
                    'w-full text-left px-3 h-9 rounded-lg text-sm flex items-center justify-between transition-colors',
                    m === selectedMonth ? 'bg-brand-soft text-brand font-medium' : 'text-ink/80 hover:bg-ink/5',
                  )}
                >
                  {formatMonthYearTR(m)}
                  {m === currentMonthKey() && <span className="text-[10px] text-muted">bu ay</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hızlı ekle */}
        <div className="relative" ref={addRef}>
          <Button onClick={() => setAddOpen((v) => !v)} size="md">
            <Plus size={17} />
            <span className="hidden sm:inline">Ekle</span>
          </Button>
          {addOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-surface border border-line rounded-card shadow-pop p-1.5 z-40 animate-[popIn_.12s_ease]">
              {quickItems.map((q) => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.mode}
                    onClick={() => {
                      openTx(q.mode);
                      setAddOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 h-9 rounded-lg text-sm text-ink/85 hover:bg-ink/5 transition-colors"
                  >
                    <Icon size={16} className={q.cls} />
                    {q.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tema */}
        <button
          onClick={toggleTheme}
          className="grid place-items-center h-10 w-10 rounded-lg border border-line bg-elevate text-muted hover:text-ink hover:bg-line/40 transition-colors"
          title={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
