import {
  ChevronsLeft,
  ChevronsRight,
  Compass,
  Github,
  RefreshCw,
  Search,
  Settings,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import {
  CategoryIcon,
  CATEGORIES_ORDER,
  CATEGORY_LABELS,
} from './CategoryIcon';
import {
  type CategoryFilter,
  getCategoryCounts,
  useStackStore,
} from '@/store/stack';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenImport: () => void;
  onOpenSettings: () => void;
  onOpenPalette: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  onOpenImport,
  onOpenSettings,
  onOpenPalette,
}: SidebarProps): JSX.Element {
  const items = useStackStore((s) => s.items);
  const filter = useStackStore((s) => s.filter);
  const setFilter = useStackStore((s) => s.setFilter);
  const rescan = useStackStore((s) => s.rescan);
  const view = useStackStore((s) => s.view);
  const setView = useStackStore((s) => s.setView);

  const counts = getCategoryCounts(items);
  const totalActive = items.filter((it) => it.status !== 'disabled').length;
  const stackActive = view === 'stack';

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 56 : 220 }}
      transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
      className="flex h-full flex-col border-r border-border-subtle bg-bg"
    >
      <div className="flex h-12 items-center justify-between px-3">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-text">Bridge</span>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text"
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <ChevronsLeft className="h-4 w-4" strokeWidth={1.75} />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 pb-2">
        {!collapsed && <SectionLabel>Stack</SectionLabel>}

        <NavItem
          collapsed={collapsed}
          active={stackActive && filter === 'all'}
          onClick={() => setFilter('all')}
          label="All"
          count={totalActive}
          icon={<AllGlyph />}
        />

        {CATEGORIES_ORDER.map((cat) => (
          <NavItem
            key={cat}
            collapsed={collapsed}
            active={stackActive && filter === cat}
            onClick={() => setFilter(cat)}
            label={CATEGORY_LABELS[cat]}
            count={counts[cat]}
            icon={<CategoryIcon category={cat} size={18} />}
          />
        ))}

        {!collapsed && <SectionLabel className="mt-6">Browse</SectionLabel>}

        <NavItem
          collapsed={collapsed}
          active={view === 'discover'}
          onClick={() => setView('discover')}
          label="Discover"
          icon={<Compass className="h-4 w-4" strokeWidth={1.75} />}
        />

        {!collapsed && <SectionLabel className="mt-6">Actions</SectionLabel>}

        <NavItem
          collapsed={collapsed}
          active={false}
          onClick={onOpenPalette}
          label="Command palette"
          shortcut="⌘K"
          icon={<Search className="h-4 w-4" strokeWidth={1.75} />}
        />
        <NavItem
          collapsed={collapsed}
          active={false}
          onClick={onOpenImport}
          label="Import from GitHub"
          shortcut="⌘N"
          icon={<Github className="h-4 w-4" strokeWidth={1.75} />}
        />
        <NavItem
          collapsed={collapsed}
          active={false}
          onClick={() => void rescan()}
          label="Rescan"
          shortcut="⌘R"
          icon={<RefreshCw className="h-4 w-4" strokeWidth={1.75} />}
        />
      </nav>

      <div className="border-t border-border-subtle p-2">
        <NavItem
          collapsed={collapsed}
          active={false}
          onClick={onOpenSettings}
          label="Settings"
          shortcut="⌘,"
          icon={<Settings className="h-4 w-4" strokeWidth={1.75} />}
        />
      </div>
    </motion.aside>
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        'px-2 pb-1.5 pt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-subtle',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface NavItemProps {
  collapsed: boolean;
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  shortcut?: string;
  icon: React.ReactNode;
}

function NavItem({
  collapsed,
  active,
  onClick,
  label,
  count,
  shortcut,
  icon,
}: NavItemProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? `${label}${shortcut ? ` (${shortcut})` : ''}` : undefined}
      aria-pressed={active}
      className={cn(
        'group flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-colors duration-fast',
        active
          ? 'bg-surface-raised text-text'
          : 'text-muted hover:bg-surface-raised hover:text-text',
        collapsed && 'justify-center',
      )}
    >
      <span className="grid h-5 w-5 place-items-center text-muted group-aria-pressed:text-text">
        {icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{label}</span>
          {count !== undefined && (
            <span className="text-[10px] tabular-nums text-subtle">{count}</span>
          )}
          {shortcut && count === undefined && (
            <span className="text-[10px] tabular-nums text-subtle">{shortcut}</span>
          )}
        </>
      )}
    </button>
  );
}

function AllGlyph(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="2" y="2" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="2" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="10" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="10" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export type { CategoryFilter };
