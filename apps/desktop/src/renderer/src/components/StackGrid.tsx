import { AnimatePresence, motion } from 'framer-motion';

import type { StackItem } from '@bridge/core';

import { StackCard } from './StackCard';

interface StackGridProps {
  items: StackItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function StackGrid({ items, selectedId, onSelect }: StackGridProps): JSX.Element {
  return (
    <motion.div layout className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
          >
            <StackCard
              item={item}
              selected={item.id === selectedId}
              onSelect={() => onSelect(item.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
