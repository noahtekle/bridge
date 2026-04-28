import { Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';
import { useStackStore } from '@/store/stack';

export function SearchBar(): JSX.Element {
  const search = useStackStore((s) => s.search);
  const setSearch = useStackStore((s) => s.setSearch);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Cmd/Ctrl-F focuses the search bar from anywhere in the app.
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (event.key === 'Escape' && document.activeElement === inputRef.current) {
        setSearch('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSearch]);

  return (
    <div
      className={cn(
        'flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3',
        'transition-colors duration-fast focus-within:border-accent/60',
      )}
    >
      <Search className="h-4 w-4 text-subtle" strokeWidth={1.75} />
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, description, or source..."
        className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-subtle"
        aria-label="Search stack"
      />
      <kbd className="hidden rounded border border-border-subtle bg-surface-raised px-1.5 text-[10px] tabular-nums text-subtle md:inline-block">
        ⌘F
      </kbd>
      {search && (
        <button
          type="button"
          onClick={() => setSearch('')}
          aria-label="Clear search"
          className="grid h-5 w-5 cursor-pointer place-items-center rounded text-subtle hover:text-text"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}
