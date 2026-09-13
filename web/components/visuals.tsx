'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { Grade, JobStatus, ParkReason } from '@/lib/types';

/* ---------------- grade ---------------- */

const GRADE_COLORS: Record<Grade, string> = {
  A: 'var(--grade-a)',
  B: 'var(--grade-b)',
  C: 'var(--grade-c)',
  D: 'var(--grade-d)',
  E: 'var(--grade-e)',
  F: 'var(--grade-f)',
};

export function gradeColor(g?: Grade): string {
  return g ? GRADE_COLORS[g] : 'var(--ink-faint)';
}

export function GradeBadge({ grade, className }: { grade?: Grade; className?: string }) {
  if (!grade) {
    return <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 text-xs font-bold text-ink-faint', className)}>–</span>;
  }
  return (
    <span
      className={cn('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold', className)}
      style={{ background: `${GRADE_COLORS[grade]}22`, color: GRADE_COLORS[grade], border: `1.5px solid ${GRADE_COLORS[grade]}55` }}
    >
      {grade}
    </span>
  );
}

/* ---------------- status ---------------- */

export const STATUS_META: Record<JobStatus, { label: string; color: string }> = {
  new: { label: 'New', color: 'var(--status-new)' },
  scored: { label: 'Scored', color: 'var(--status-scored)' },
  cv_ready: { label: 'CV ready', color: 'var(--status-cv)' },
  needs_you: { label: 'Needs you', color: 'var(--status-needs)' },
  applied: { label: 'Applied', color: 'var(--status-applied)' },
  responded: { label: 'Responded', color: 'var(--status-applied)' },
  interview: { label: 'Interview', color: 'var(--status-interview)' },
  offer: { label: 'Offer', color: 'var(--status-offer)' },
  rejected: { label: 'Rejected', color: 'var(--status-rejected)' },
  discarded: { label: 'Discarded', color: 'var(--ink-faint)' },
  skip: { label: 'Skipped', color: 'var(--ink-faint)' },
};

export const PARK_META: Record<ParkReason, string> = {
  captcha: 'CAPTCHA',
  email_verification: 'Email verification',
  account_wall: 'Account wall',
  workday: 'Workday flow',
  legal_question: 'Legal question',
  ghost: 'Ghosted',
  low_fit: 'Low fit',
  unknown_form: 'Unknown form',
};

export function StatusDot({ status, className }: { status: JobStatus; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.new;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold', className)} style={{ color: meta.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

/* ---------------- relative time ---------------- */

// module-load reference keeps RelTime pure during render (no Date.now() in render)
const REL_TIME_FALLBACK = Date.now();

export function RelTime({ ts, now, className }: { ts?: string; now?: number; className?: string }) {
  if (!ts) return <span className={cn('text-ink-faint', className)}>—</span>;
  const t = new Date(ts).getTime();
  const ref = now ?? REL_TIME_FALLBACK;
  const diff = Math.max(0, ref - t);
  const m = Math.floor(diff / 60000);
  let out: string;
  if (m < 1) out = 'just now';
  else if (m < 60) out = `${m}m ago`;
  else if (m < 60 * 24) out = `${Math.floor(m / 60)}h ago`;
  else out = `${Math.floor(m / (60 * 24))}d ago`;
  return (
    <span className={cn('text-ink-faint', className)} title={new Date(ts).toLocaleString()}>
      {out}
    </span>
  );
}

/* ---------------- empty state ---------------- */

export function EmptyState({
  icon,
  title,
  sub,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-line px-6 py-10 text-center', className)}>
      {icon && <div className="text-ink-faint">{icon}</div>}
      <div className="font-display text-sm font-bold text-ink-muted">{title}</div>
      {sub && <div className="max-w-[340px] text-xs leading-relaxed text-ink-faint">{sub}</div>}
    </div>
  );
}

/* ---------------- compact pill ---------------- */

export function Pill({
  children,
  tone = 'default',
  className,
}: {
  children: React.ReactNode;
  tone?: 'default' | 'sky' | 'sage' | 'amber' | 'rose';
  className?: string;
}) {
  const tones = {
    default: 'bg-ink/6 text-ink-muted border-line',
    sky: 'bg-sky-soft text-ink border-sky/40',
    sage: 'bg-sage-soft text-ink border-sage/40',
    amber: 'bg-amber-soft text-ink border-amber/40',
    rose: 'bg-rose-soft text-ink border-rose/40',
  } as const;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}
