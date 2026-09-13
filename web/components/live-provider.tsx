'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useLive, runCycle } from '@/lib/use-live';
import type { Snapshot } from '@/lib/types';

const LiveContext = createContext<Snapshot | null>(null);

/**
 * Wraps the app: seeds state from the server-rendered snapshot, then keeps it
 * live over /api/stream. When autonomy is on, it also schedules /api/run-cycle
 * every prefs.scanIntervalMin (the server lock prevents overlapping cycles).
 */
export function LiveProvider({ initial, children }: { initial: Snapshot; children: ReactNode }) {
  const snap = useLive(initial);

  const autonomy = snap?.prefs.autonomy;
  const interval = snap?.prefs.scanIntervalMin ?? 30;

  useEffect(() => {
    if (!autonomy) return;
    const ms = Math.max(5, interval) * 60 * 1000;
    const t = setInterval(() => {
      void runCycle();
    }, ms);
    return () => clearInterval(t);
  }, [autonomy, interval]);

  return <LiveContext.Provider value={snap}>{children}</LiveContext.Provider>;
}

export function useSnapshot(): Snapshot {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error('useSnapshot must be used inside <LiveProvider>');
  return ctx;
}
