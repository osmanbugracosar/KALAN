import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { TransactionModal } from './TransactionModal';
import { useUIStore } from '../store/useUIStore';
import { Toasts } from '../ui/Toasts';
import { OverviewPage } from '../pages/OverviewPage';
import { AccountsPage } from '../pages/AccountsPage';
import { TransactionsPage } from '../pages/TransactionsPage';
import { DebtsPage } from '../pages/DebtsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { SavingsPage } from '../pages/SavingsPage';
import { BudgetsPage } from '../pages/BudgetsPage';
import { RecurringPage } from '../pages/RecurringPage';
import { ReportsPage } from '../pages/ReportsPage';
import { ExpensesPage } from '../pages/ExpensesPage';
import { BackupPage } from '../pages/BackupPage';

export function AppShell() {
  const page = useUIStore((s) => s.page);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-base">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1240px] mx-auto p-5">
            <PageRouter page={page} />
          </div>
        </main>
      </div>

      {/* Global bileşenler */}
      <TransactionModal />
      <Toasts />
    </div>
  );
}

function PageRouter({ page }: { page: ReturnType<typeof useUIStore.getState>['page'] }) {
  switch (page) {
    case 'overview':
      return <OverviewPage />;
    case 'accounts':
      return <AccountsPage />;
    case 'transactions':
      return <TransactionsPage />;
    case 'debts':
      return <DebtsPage />;
    case 'settings':
      return <SettingsPage />;
    case 'expenses':
      return <ExpensesPage />;
    case 'savings':
      return <SavingsPage />;
    case 'budgets':
      return <BudgetsPage />;
    case 'recurring':
      return <RecurringPage />;
    case 'reports':
      return <ReportsPage />;
    case 'transfer':
      return <BackupPage />;
    default:
      return <OverviewPage />;
  }
}
