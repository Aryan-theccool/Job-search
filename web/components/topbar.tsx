'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Play, Sun, Moon, Radar } from 'lucide-react';
import { useSnapshot } from './live-provider';
import { useRunCycle, savePrefs } from '@/lib/use-live';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export function Topbar() {
  const snap = useSnapshot();
  const { running, run } = useRunCycle();
  const lastRun = snap.runs[snap.runs.length - 1];

  const mode = snap.profile.isDemo
    ? 'demo'
    : snap.prefs.liveApply
      ? 'LIVE'
      : snap.prefs.autonomy
        ? 'dry run'
        : 'paused';

  const onRun = async () => {
    toast.loading('Hunt cycle started — scanning boards…', { id: 'hunt' });
    const r = await run();
    if (r?.busy) toast.dismiss('hunt');
    else if (r?.started) toast.success('Cycle started — watch the feed', { id: 'hunt' });
    else toast.error(r?.error ?? 'Could not start cycle', { id: 'hunt' });
  };

  const toggleTheme = async () => {
    const next = snap.prefs.theme === 'day' ? 'dusk' : 'day';
    document.documentElement.dataset.theme = next;
    await savePrefs({ theme: next });
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line px-6">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'relative flex h-2.5 w-2.5',
            snap.prefs.autonomy && !snap.profile.isDemo && 'animate-pulse-soft',
          )}
        >
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ background: snap.profile.isDemo ? 'var(--amber)' : snap.prefs.autonomy ? 'var(--sage)' : 'var(--ink-faint)' }}
          />
        </span>
        <div className="leading-tight">
          <div className="text-xs font-bold">Agent · {mode}</div>
          <div className="text-[10.5px] text-ink-faint">
            {lastRun ? `last cycle ${RelTimeString(lastRun.endedAt)}` : 'no cycle yet'}
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="amber" onClick={onRun} disabled={running} className="font-display">
          {running ? <Radar className="h-4 w-4 animate-pulse-soft" /> : <Play className="h-4 w-4" />}
          {running ? 'Hunting…' : 'Run hunt'}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle day/dusk theme"
          title={snap.prefs.theme === 'day' ? 'Switch to dusk' : 'Switch to day'}
        >
          {snap.prefs.theme === 'day' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}

/** tiny helper so we don't render a component inside a template string */
function RelTimeString(ts: string) {
  const diff = Math.max(0, Date.now() - new Date(ts).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}
