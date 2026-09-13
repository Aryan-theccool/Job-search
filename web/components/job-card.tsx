'use client';

import * as React from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import type { Job } from '@/lib/types';
import { GradeBadge, Pill, RelTime, PARK_META } from './visuals';
import { useNow } from '@/lib/use-live';

export function JobCard({
  job,
  onOpen,
  className,
}: {
  job: Job;
  onOpen: (job: Job) => void;
  className?: string;
}) {
  const now = useNow(30000);
  return (
    <button
      type="button"
      onClick={() => onOpen(job)}
      className={`group w-full cursor-pointer rounded-3xl glass p-4 text-left transition-all duration-200 hover:shadow-pop hover:-translate-y-0.5 ${className ?? ''}`}
    >
      <div className="flex items-start gap-3">
        <GradeBadge grade={job.grade} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold leading-snug group-hover:underline decoration-amber underline-offset-2">
            {job.title}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
            <span className="font-semibold">{job.company}</span>
            <span className="text-ink-faint">·</span>
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {job.location}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {job.matchPct != null && (
              <Pill tone="sage">{job.matchPct}% match</Pill>
            )}
            {job.archetype && <Pill>{job.archetype}</Pill>}
            {job.parkedReason && (
              <Pill tone="rose">
                <AlertTriangle className="h-3 w-3" />
                {PARK_META[job.parkedReason] ?? job.parkedReason}
              </Pill>
            )}
            <span className="ml-auto text-[10px] text-ink-faint">
              <RelTime ts={job.discoveredAt} now={now} />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
