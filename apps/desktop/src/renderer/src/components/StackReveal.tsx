import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import type { StackCategory } from '@bridge/core';

import { cn } from '@/lib/utils';
import { CategoryIcon, CATEGORIES_ORDER, CATEGORY_LABELS } from './CategoryIcon';

interface StackRevealProps {
  counts: Record<StackCategory, number>;
  onContinue: () => void;
}

const STAGGER_MS = 200;
const COUNT_DURATION_MS = 600;

/**
 * First-run takeover. Animates a count-up per category, then reveals a
 * continue button. Plays once per install (state in localStorage).
 *
 * Background uses a subtle radial gradient — no aurora SVG yet to keep
 * Day-of-Week-1 perf budget honest. The aurora ships when we hit polish in
 * Week 4 alongside the README screenshots.
 */
export function StackReveal({ counts, onContinue }: StackRevealProps): JSX.Element {
  const [revealedCount, setRevealedCount] = useState(0);
  const total = CATEGORIES_ORDER.length;
  const allRevealed = revealedCount >= total;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < total; i += 1) {
      timers.push(
        setTimeout(() => {
          setRevealedCount(i + 1);
        }, i * STAGGER_MS),
      );
    }
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [total]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: [0, 0, 0.2, 1] }}
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center px-12',
        'bg-bg [background:radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.10),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(168,85,247,0.10),transparent_55%)]',
      )}
    >
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.32, ease: [0, 0, 0.2, 1] }}
        className="mb-10 text-center"
      >
        <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-subtle">
          Welcome to Bridge
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">
          Here&apos;s what we found in your stack.
        </h1>
      </motion.div>

      <ul className="space-y-4">
        {CATEGORIES_ORDER.map((cat, idx) => (
          <RevealRow
            key={cat}
            category={cat}
            count={counts[cat]}
            revealed={idx < revealedCount}
          />
        ))}
      </ul>

      <motion.button
        type="button"
        onClick={onContinue}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: allRevealed ? 1 : 0, y: allRevealed ? 0 : 6 }}
        transition={{ duration: 0.28, ease: [0, 0, 0.2, 1], delay: allRevealed ? 0.12 : 0 }}
        className={cn(
          'mt-12 flex cursor-pointer items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium',
          'bg-text text-bg transition-colors duration-fast hover:bg-text/90',
          !allRevealed && 'pointer-events-none',
        )}
      >
        Continue to your stack
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </motion.button>
    </motion.div>
  );
}

interface RevealRowProps {
  category: StackCategory;
  count: number;
  revealed: boolean;
}

function RevealRow({ category, count, revealed }: RevealRowProps): JSX.Element {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 8 }}
      transition={{ duration: 0.32, ease: [0, 0, 0.2, 1] }}
      className="flex items-center gap-5"
    >
      <CategoryIcon category={category} size={28} />
      <CountUp value={revealed ? count : 0} className={cn('w-[120px] text-3xl tabular-nums')} />
      <span className="text-md font-medium text-muted">{CATEGORY_LABELS[category]}</span>
    </motion.li>
  );
}

function CountUp({
  value,
  className,
}: {
  value: number;
  className?: string;
}): JSX.Element {
  const [display, setDisplay] = useState(0);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 24 });
  const rounded = useTransform(spring, (v) => Math.round(v));

  useEffect(() => {
    motionValue.set(value);
    const unsubscribe = rounded.on('change', (v) => setDisplay(v));
    // Hard cap at the end of the count duration.
    const timer = setTimeout(() => setDisplay(value), COUNT_DURATION_MS);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [value, motionValue, rounded]);

  return <span className={className}>{display}</span>;
}
