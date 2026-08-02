import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_ITEMS } from './nav';
import { Wordmark } from './Logo';
import { useUIStore } from '../store/useUIStore';
import { cx } from '../ui/cx';

export function Sidebar() {
  const page = useUIStore((s) => s.page);
  const setPage = useUIStore((s) => s.setPage);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cx(
        'shrink-0 h-full bg-surface border-r border-line flex flex-col transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-[248px]',
      )}
    >
      <div className={cx('h-16 flex items-center border-b border-line', collapsed ? 'justify-center px-2' : 'px-4')}>
        <Wordmark collapsed={collapsed} />
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = page === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              title={collapsed ? item.label : undefined}
              className={cx(
                'group w-full flex items-center gap-3 rounded-lg px-3 h-10 text-sm font-medium transition-colors relative',
                collapsed && 'justify-center px-0',
                active ? 'bg-brand-soft text-brand' : 'text-ink/75 hover:bg-ink/5 hover:text-ink',
              )}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-brand" />}
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}
              {!collapsed && !item.ready && (
                <span className="text-[9.5px] uppercase tracking-wide text-muted/70 bg-ink/5 px-1.5 py-0.5 rounded">yakında</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-2.5 border-t border-line">
        <button
          onClick={toggle}
          className={cx('w-full flex items-center gap-3 rounded-lg px-3 h-10 text-sm text-muted hover:bg-ink/5 hover:text-ink transition-colors', collapsed && 'justify-center px-0')}
          title={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          {!collapsed && <span>Menüyü daralt</span>}
        </button>
      </div>
    </aside>
  );
}
