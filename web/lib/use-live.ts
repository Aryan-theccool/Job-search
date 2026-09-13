'use client';

// Live client layer: starts from the server snapshot, subscribes to /api/stream
// (EventSource), replaces state on `snapshot` / `update` events, and exposes
// command helpers (sendCommand, savePrefs, runCycle, saveProfile).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Prefs, Profile, Snapshot, CommandType } from './types';

export function useLive(initial: Snapshot): Snapshot {
  const [snap, setSnap] = useState<Snapshot>(initial);
  const retriesRef = useRef(0);

  useEffect(() => {
    let es: EventSource | null = null;
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const apply = (data: string) => {
      try {
        setSnap(JSON.parse(data) as Snapshot);
      } catch {
        /* ignore malformed frame */
      }
    };

    const connect = () => {
      es = new EventSource('/api/stream');
      es.onopen = () => {
        retriesRef.current = 0;
      };
      es.addEventListener('snapshot', (e) => apply((e as MessageEvent).data));
      es.addEventListener('update', (e) => apply((e as MessageEvent).data));
      es.onerror = () => {
        es?.close();
        es = null;
        if (closed) return;
        const delay = Math.min(1000 * 2 ** retriesRef.current, 10000);
        retriesRef.current += 1;
        timer = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      es?.close();
    };
  }, []);

  return snap;
}

/** Re-render on an interval for relative timestamps. */
export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export async function sendCommand(type: CommandType, { jobId, payload }: { jobId?: string; payload?: Record<string, unknown> } = {}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, jobId, payload }),
    });
    return (await res.json()) as { ok: boolean; error?: string };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function savePrefs(patch: Partial<Prefs>): Promise<{ ok: boolean; prefs?: Prefs }> {
  const res = await fetch('/api/prefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return (await res.json()) as { ok: boolean; prefs?: Prefs };
}

export async function saveProfile(patch: Partial<Profile>): Promise<{ ok: boolean; profile?: Profile }> {
  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return (await res.json()) as { ok: boolean; profile?: Profile };
}

export async function runCycle(): Promise<{ started?: boolean; busy?: boolean; error?: string }> {
  const res = await fetch('/api/run-cycle', { method: 'POST' });
  return (await res.json()) as { started?: boolean; busy?: boolean; error?: string };
}

export function useRunCycle() {
  const [running, setRunning] = useState(false);
  const run = useCallback(async () => {
    if (running) return { busy: true };
    setRunning(true);
    try {
      const r = await runCycle();
      return r;
    } finally {
      // the cycle itself takes a few seconds; allow re-run after ~8s
      setTimeout(() => setRunning(false), 8000);
    }
  }, [running]);
  return { running, run };
}
