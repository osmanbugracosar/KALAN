import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  ReceiptText,
  Landmark,
  PiggyBank,
  Target,
  CalendarClock,
  BarChart3,
  ArrowDownUp,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type PageId =
  | 'overview'
  | 'accounts'
  | 'transactions'
  | 'expenses'
  | 'debts'
  | 'savings'
  | 'budgets'
  | 'recurring'
  | 'reports'
  | 'transfer'
  | 'settings';

export interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
  /** Bu aşamada tam çalışıyor mu? (false ise "sıradaki aşama" olarak işaretlenir) */
  ready: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Genel Bakış', icon: LayoutDashboard, ready: true },
  { id: 'accounts', label: 'Hesaplarım', icon: Wallet, ready: true },
  { id: 'transactions', label: 'İşlemler', icon: ArrowLeftRight, ready: true },
  { id: 'expenses', label: 'Giderlerim', icon: ReceiptText, ready: true },
  { id: 'debts', label: 'Borçlarım', icon: Landmark, ready: true },
  { id: 'savings', label: 'Birikim Hedefleri', icon: Target, ready: true },
  { id: 'budgets', label: 'Bütçeler', icon: PiggyBank, ready: true },
  { id: 'recurring', label: 'Düzenli Ödemeler', icon: CalendarClock, ready: true },
  { id: 'reports', label: 'Raporlar', icon: BarChart3, ready: true },
  { id: 'transfer', label: 'Yedekle & İçe Aktar', icon: ArrowDownUp, ready: true },
  { id: 'settings', label: 'Ayarlar', icon: Settings, ready: true },
];
