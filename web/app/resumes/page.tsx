'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import { FileText, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { useSnapshot } from '@/components/live-provider';
import { GlassCard } from '@/components/ui/card';
import { GradeBadge, Pill, EmptyState, RelTime } from '@/components/visuals';
import { useNow } from '@/lib/use-live';
import { cn } from '@/lib/utils';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

export default function ResumesPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-sm text-ink-faint">loading resumes…</div>}>
      <ResumesInner />
    </React.Suspense>
  );
}

function ResumesInner() {
  const snap = useSnapshot();
  const now = useNow(30000);
  const params = useParams<{ job?: string }>();
  const search = useSearchParams();
  const jobParam = (params?.job as string | undefined) ?? search.get('job');

  // Selection: deep link ?job=<id> wins, then the user's pick, then base.
  const [picked, setPicked] = React.useState<string | null>(null);
  const validParam = jobParam && snap.jobs.some((j) => j.id === jobParam) ? jobParam : null;
  const selected = validParam ?? picked ?? 'base';

  // CV content, loaded lazily; "loading" is derived from a stale id.
  const [loaded, setLoaded] = React.useState<{ id: string; md: string | null }>({ id: '', md: null });
  const loading = loaded.id !== selected;

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/cv?id=${encodeURIComponent(selected)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setLoaded({ id: selected, md: d?.markdown ?? null });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ id: selected, md: null });
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const cvJobs = snap.jobs.filter((j) => j.cvPath).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const items = [
    { id: 'base', label: 'Base CV', sub: 'your master resume — never modified by tailoring' },
    ...cvJobs.map((j) => ({ id: j.id, label: j.title, sub: `${j.company} · ${j.matchPct ?? '—'}% match` })),
  ];
  const selJob = snap.jobs.find((j) => j.id === selected);

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Resumes"
        subtitle="Your base CV plus truthful, per-role tailoring. The tailor only re-arranges facts already in your base CV."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        {/* left list */}
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => setPicked(it.id)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-3xl border p-3.5 text-left transition-all duration-150',
                selected === it.id
                  ? 'border-amber/50 bg-amber-soft/50 shadow-soft'
                  : 'border-line bg-paper/40 hover:bg-ink/4',
              )}
            >
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl', it.id === 'base' ? 'bg-ink text-paper' : 'bg-sage-soft')}>
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold">{it.label}</div>
                <div className="truncate text-[10.5px] text-ink-muted">{it.sub}</div>
              </div>
            </button>
          ))}
          {cvJobs.length === 0 && (
            <EmptyState
              className="mt-2"
              title="no tailored CVs yet"
              sub="Grade A/B matches get a tailored CV on the next hunt cycle."
            />
          )}
        </div>

        {/* right panel */}
        <GlassCard className="min-h-[480px] overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-5 pb-4">
            {selJob?.grade && <GradeBadge grade={selJob.grade} />}
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-base font-bold">
                {selected === 'base' ? 'Base CV' : selJob?.title ?? 'CV'}
              </div>
              <div className="text-[11px] text-ink-muted">
                {selected === 'base' ? (
                  'source of truth for the tailor'
                ) : (
                  <>
                    {selJob?.company} · {selJob?.matchPct ?? '—'}% match · generated{' '}
                    <RelTime ts={selJob?.updatedAt} now={now} />
                  </>
                )}
              </div>
            </div>
            {selected !== 'base' && (
              <Pill tone="sage">
                <Sparkles className="h-3 w-3" /> ATS-tuned
              </Pill>
            )}
            {selected === 'base' && <Pill tone="sky">master</Pill>}
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-6">
            {loading ? (
              <div className="text-sm text-ink-faint">loading…</div>
            ) : loaded.md === null ? (
              <EmptyState title="not found" sub="This CV file does not exist yet. Run a hunt cycle to generate it." />
            ) : (
              <div className="md-body text-sm text-ink">
                <ReactMarkdown>{loaded.md}</ReactMarkdown>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
