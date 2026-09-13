'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Radar, ScanSearch, FileCheck2, Send, AlertTriangle, Activity,
  Sparkles, Target, Cpu, Clock3, Check, XCircle, ExternalLink, Bot,
} from 'lucide-react';
import { useSnapshot } from '@/components/live-provider';
import { useNow, sendCommand } from '@/lib/use-live';
import { useCountUp } from '@/components/use-count-up';
import { GlassCard, Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GradeBadge, Pill, RelTime, EmptyState, PARK_META } from '@/components/visuals';
import { cn } from '@/lib/utils';
import type { ActivityEvent } from '@/lib/types';

/* ---------------- pieces ---------------- */

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ElementType; tone: string }) {
  const n = useCountUp(value);
  return (
    <GlassCard className="flex items-center gap-4 p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${tone}22`, color: tone }}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-display text-3xl font-black leading-none tracking-tight tabular-nums">{n}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{label}</div>
      </div>
    </GlassCard>
  );
}

const PHASE_ICON: Record<ActivityEvent['phase'], React.ElementType> = {
  scan: Radar,
  score: Target,
  tailor: FileCheck2,
  apply: Send,
  command: Cpu,
  run: Sparkles,
  system: Activity,
};

function levelColor(level: ActivityEvent['level']): string {
  switch (level) {
    case 'good': return 'var(--sage)';
    case 'warn': return 'var(--amber)';
    case 'bad': return 'var(--rose)';
    default: return 'var(--ink-faint)';
  }
}

function FeedRow({ evt, now }: { evt: ActivityEvent; now: number }) {
  const Icon = PHASE_ICON[evt.phase] ?? Activity;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-ink/4"
    >
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${levelColor(evt.level)}1e`, color: levelColor(evt.level) }}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs leading-snug">
          {evt.grade && <GradeBadge grade={evt.grade} className="h-4.5 w-4.5 text-[9px]" />}
          <span className="text-ink">{evt.message}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-ink-faint">
          <span className="font-semibold uppercase tracking-wider">{evt.phase}</span>
          {evt.company && <span>· {evt.company}</span>}
          <span className="ml-auto inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            <RelTime ts={evt.ts} now={now} />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- page ---------------- */

export default function DashboardPage() {
  const snap = useSnapshot();
  const now = useNow(15000);

  const active = snap.jobs.filter((j) => j.status !== 'discarded' && j.status !== 'skip');
  const rolesSwept = active.length;
  const applications = active.filter((j) => ['applied', 'responded', 'interview', 'offer'].includes(j.status)).length;
  const interviews = active.filter((j) => j.status === 'interview').length;
  const cvs = active.filter((j) => j.cvPath).length;
  const parked = active.filter((j) => j.status === 'needs_you');
  const boards = snap.companies.filter((c) => c.enabled).length;
  const topMatches = [...active]
    .filter((j) => j.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 5);

  const firstName = snap.profile.firstName || snap.profile.fullName || 'there';
  const lastRun = snap.runs[snap.runs.length - 1];

  const needAction = async (type: 'mark_applied' | 'discard', jobId: string) => {
    const r = await sendCommand(type, { jobId });
    if (r.ok) toast.success(type === 'mark_applied' ? 'Marked applied' : 'Discarded');
    else toast.error(r.error ?? 'Command failed');
  };

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5">
      {/* hero */}
      <GlassCard className="relative overflow-hidden p-6">
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full opacity-50 animate-float" style={{ background: 'radial-gradient(circle, var(--sky-soft), transparent 70%)' }} />
        <div className="relative">
          <div className="font-hand text-sm text-ink-muted">your desk for the hunt</div>
          <h1 className="font-display mt-1 text-[26px] font-black leading-tight tracking-tight">
            Good hunting, {firstName}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-muted">
            <HeroFact label="roles swept" value={rolesSwept} />
            <HeroFact label="boards" value={boards} />
            <HeroFact label="CVs prepared" value={cvs} />
            <HeroFact label="applications sent" value={applications} />
            <HeroFact label="parked for you" value={parked.length} tone={parked.length ? 'var(--amber)' : undefined} />
          </div>
        </div>
      </GlassCard>

      {/* big stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Roles swept" value={rolesSwept} icon={ScanSearch} tone="var(--sky)" />
        <Stat label="Applications sent" value={applications} icon={Send} tone="var(--sage)" />
        <Stat label="Interviews" value={interviews} icon={Sparkles} tone="var(--amber)" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        {/* activity feed */}
        <Card className="xl:col-span-3">
          <div className="flex items-center gap-2 p-5 pb-2">
            <Activity className="h-4 w-4 text-amber" />
            <h2 className="font-display text-base font-bold">Active Hunt</h2>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              <span className={cn('h-1.5 w-1.5 rounded-full', snap.prefs.autonomy ? 'bg-sage animate-pulse-soft' : 'bg-ink-faint')} />
              {snap.prefs.autonomy ? 'live' : 'idle'}
            </span>
          </div>
          <CardContent className="pt-1">
            {snap.activity.length === 0 ? (
              <EmptyState title="nothing here yet" sub="Run a hunt from the top bar — the feed will fill up as the engine scans, scores and prepares." />
            ) : (
              <div className="flex max-h-[460px] flex-col overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {snap.activity.slice(0, 40).map((evt) => (
                    <FeedRow key={evt.id} evt={evt} now={now} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5 xl:col-span-2">
          {/* top matches */}
          <Card>
            <div className="flex items-center gap-2 p-5 pb-2">
              <Target className="h-4 w-4 text-sage" />
              <h2 className="font-display text-base font-bold">Top Matches</h2>
            </div>
            <CardContent className="flex flex-col gap-2 pt-1">
              {topMatches.length === 0 ? (
                <EmptyState title="nothing here yet" sub="Scored matches will line up here, strongest first." />
              ) : (
                topMatches.map((j) => (
                  <a
                    key={j.id}
                    href={j.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex items-center gap-3 rounded-2xl border border-line bg-paper/40 px-3 py-2.5 transition-all hover:border-amber/50 hover:bg-amber-soft/40"
                  >
                    <GradeBadge grade={j.grade} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold group-hover:underline underline-offset-2">{j.title}</div>
                      <div className="mt-0.5 truncate text-[10.5px] text-ink-muted">
                        {j.company} · {j.location}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-sm font-black tabular-nums" style={{ color: 'var(--sage)' }}>
                        {j.matchPct}%
                      </div>
                      <div className="text-[9px] font-semibold uppercase tracking-wider text-ink-faint">match</div>
                    </div>
                  </a>
                ))
              )}
            </CardContent>
          </Card>

          {/* needs you */}
          <Card>
            <div className="flex items-center gap-2 p-5 pb-2">
              <AlertTriangle className="h-4 w-4 text-rose" />
              <h2 className="font-display text-base font-bold">Needs You</h2>
              {parked.length > 0 && <Pill tone="rose">{parked.length}</Pill>}
            </div>
            <CardContent className="flex flex-col gap-2 pt-1">
              {parked.length === 0 ? (
                <EmptyState title="all clear" sub="Parked applications (CAPTCHAs, legal questions, walls) will wait here for you." />
              ) : (
                parked.slice(0, 4).map((j) => (
                  <div key={j.id} className="rounded-2xl border border-rose/30 bg-rose-soft/50 p-3">
                    <div className="flex items-start gap-2">
                      <GradeBadge grade={j.grade} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold">{j.title}</div>
                        <div className="text-[10.5px] text-ink-muted">
                          {j.company} · {PARK_META[j.parkedReason ?? 'unknown_form'] ?? j.parkedReason}
                        </div>
                        {j.parkedNote && (
                          <div className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-ink-faint">{j.parkedNote}</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <a
                        href={j.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-xl bg-ink text-[11px] font-semibold text-paper hover:opacity-90"
                      >
                        <ExternalLink className="h-3 w-3" /> Open posting
                      </a>
                      <Button variant="sage" size="sm" className="flex-1" onClick={() => needAction('mark_applied', j.id)}>
                        <Check className="h-3 w-3" /> Applied
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => needAction('discard', j.id)}>
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* agent status */}
          <GlassCard className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-soft text-ink">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold">
                Agent · {snap.profile.isDemo ? 'demo mode' : snap.prefs.liveApply ? 'LIVE apply' : snap.prefs.autonomy ? 'autonomous, dry run' : 'paused'}
              </div>
              <div className="mt-0.5 truncate text-[10.5px] text-ink-muted">
                {lastRun
                  ? `last cycle: ${lastRun.boards} boards · ${lastRun.newJobs} new · ${lastRun.scored} scored · ${lastRun.cvs} CVs`
                  : 'no cycle recorded yet — press Run hunt'}
              </div>
            </div>
            <Pill tone={snap.prefs.autonomy && !snap.profile.isDemo ? 'sage' : 'default'}>
              every {snap.prefs.scanIntervalMin}m
            </Pill>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function HeroFact({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-display text-lg font-black tabular-nums" style={{ color: tone }}>{value}</span>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</span>
    </span>
  );
}
