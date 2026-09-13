'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  X, ExternalLink, FileText, Check, XCircle, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import type { Job } from '@/lib/types';
import { Sheet, SheetContent, SheetHeader } from './ui/sheet';
import { Button } from './ui/button';
import { GradeBadge, Pill, StatusDot, RelTime, PARK_META } from './visuals';
import { sendCommand } from '@/lib/use-live';
import { useNow } from '@/lib/use-live';

export function JobSheet({ job, onClose }: { job: Job | null; onClose: () => void }) {
  const now = useNow(30000);

  const markApplied = async () => {
    if (!job) return;
    const r = await sendCommand('mark_applied', { jobId: job.id });
    toast.success(r.ok ? `Marked applied — ${job.title}` : 'Could not mark applied');
  };

  const notForMe = async () => {
    if (!job) return;
    const r = await sendCommand('discard', { jobId: job.id, payload: { reason: 'manual' } });
    toast.success(r.ok ? 'Moved to discarded' : 'Could not discard');
    onClose();
  };

  const openCv = () => {
    if (!job) return;
    window.open(`/resumes?job=${encodeURIComponent(job.id)}`, '_blank', 'noopener');
  };

  if (!job) return null;

  return (
    <Sheet open={!!job} onOpenChange={(o) => !o && onClose()}>
      <SheetHeader>
        <div className="flex items-start gap-3">
          <GradeBadge grade={job.grade} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold leading-tight">{job.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <span className="font-semibold text-ink">{job.company}</span>
              <span>·</span>
              <span>{job.location}</span>
              <span>·</span>
              <StatusDot status={job.status} />
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </SheetHeader>

      <SheetContent className="flex flex-col gap-4">
        {/* meta strip */}
        <div className="grid grid-cols-2 gap-2">
          <MetaCell label="Score" value={job.score != null ? job.score.toFixed(2) : '—'} />
          <MetaCell label="Match" value={job.matchPct != null ? `${job.matchPct}%` : '—'} />
          <MetaCell label="Archetype" value={job.archetype ?? '—'} />
          <MetaCell
            label="Legitimacy"
            value={
              job.legitimacy === 'high' ? (
                <span className="inline-flex items-center gap-1 text-sage"><ShieldCheck className="h-3.5 w-3.5" />High</span>
              ) : job.legitimacy === 'caution' ? (
                <span className="inline-flex items-center gap-1 text-amber"><ShieldAlert className="h-3.5 w-3.5" />Caution</span>
              ) : (
                '—'
              )
            }
          />
        </div>

        {job.salary && (job.salary.min || job.salary.max) && (
          <div className="rounded-2xl border border-sage/40 bg-sage-soft px-4 py-2.5 text-sm font-semibold">
            {job.salary.currency} {job.salary.min ? fmt(job.salary.min) : '—'}
            {job.salary.min && job.salary.max ? ' – ' : ''}
            {job.salary.max ? fmt(job.salary.max) : ''}
            {job.salary.period ? ` / ${job.salary.period.toLowerCase()}` : ''}
          </div>
        )}

        {job.rationale && (
          <div className="rounded-2xl border border-line bg-paper/50 p-3.5 text-xs leading-relaxed text-ink-muted">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Why this score</div>
            {job.rationale}
          </div>
        )}

        {job.reasons && job.reasons.length > 0 && (
          <div>
            <SectionTitle>Signals</SectionTitle>
            <ul className="flex flex-col gap-1.5">
              {job.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-ink">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {job.gaps && job.gaps.length > 0 && (
          <div>
            <SectionTitle>Gaps / watch-outs</SectionTitle>
            <ul className="flex flex-col gap-1.5">
              {job.gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-ink-muted">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        )}

        {job.status === 'needs_you' && (
          <div className="rounded-2xl border border-rose/40 bg-rose-soft p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose">
              Parked — {PARK_META[job.parkedReason ?? 'unknown_form'] ?? job.parkedReason}
            </div>
            <div className="mt-1 text-xs leading-relaxed text-ink-muted">{job.parkedNote}</div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {job.demo && <Pill tone="amber">demo listing</Pill>}
          <Pill tone="sky">{job.ats}</Pill>
          <Pill>found <RelTime ts={job.discoveredAt} now={now} /></Pill>
          {job.appliedAt && <Pill tone="sage">applied <RelTime ts={job.appliedAt} now={now} /></Pill>}
        </div>

        {/* actions */}
        <div className="mt-1 grid grid-cols-2 gap-2 border-t border-line pt-4">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-sm font-semibold text-paper shadow-soft transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <ExternalLink className="h-4 w-4" />
            Open posting
          </a>
          {job.cvPath ? (
            <Button variant="sage" onClick={openCv}>
              <FileText className="h-4 w-4" />
              Tailored CV
            </Button>
          ) : (
            <Button variant="outline" disabled title="CV is generated for grade A/B matches">
              <FileText className="h-4 w-4" />
              No CV yet
            </Button>
          )}
          <Button variant="default" onClick={markApplied} disabled={job.status === 'applied' || job.status === 'interview' || job.status === 'offer'}>
            <Check className="h-4 w-4" />
            Mark applied
          </Button>
          <Button variant="rose" onClick={notForMe}>
            <XCircle className="h-4 w-4" />
            Not for me
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MetaCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-paper/50 px-3.5 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{label}</div>
      <div className="mt-0.5 text-sm font-bold">{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">{children}</div>;
}

function fmt(n: number) {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
}
