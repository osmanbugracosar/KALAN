import { create } from 'zustand';
import { currentMonthKey } from '../core/date';
import type { PageId } from '../app/nav';

export type Theme = 'light' | 'dark';
export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

const THEME_KEY = 'kalan.theme';
const SIDEBAR_KEY = 'kalan.sidebar';

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* yoksay */
  }
  return 'light';
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

function readSidebar(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1';
  } catch {
    return false;
  }
}

interface UIState {
  theme: Theme;
  sidebarCollapsed: boolean;
  locked: boolean;
  page: PageId;
  selectedMonth: string;
  toasts: Toast[];
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setLocked: (v: boolean) => void;
  setPage: (p: PageId) => void;
  setSelectedMonth: (m: string) => void;
  pushToast: (kind: Toast['kind'], message: string) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 1;

export const useUIStore = create<UIState>((set, get) => ({
  theme: readTheme(),
  sidebarCollapsed: readSidebar(),
  locked: false,
  page: 'overview',
  selectedMonth: currentMonthKey(),
  toasts: [],

  setTheme: (t) => {
    applyTheme(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* yoksay */
    }
    set({ theme: t });
  },

  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
    } catch {
      /* yoksay */
    }
    set({ sidebarCollapsed: next });
  },

  setLocked: (v) => set({ locked: v }),

  setPage: (p) => set({ page: p }),
  setSelectedMonth: (m) => set({ selectedMonth: m }),

  pushToast: (kind, message) => {
    const id = toastSeq++;
    set({ toasts: [...get().toasts, { id, kind, message }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, 4200);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

// Modül yüklenirken temayı uygula
applyTheme(readTheme());
