'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Radar, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { useSnapshot } from '@/components/live-provider';
import { sendCommand, useNow } from '@/lib/use-live';
import { Button } from '@/components/ui/button';
import { Card, CardContent, GlassCard } from '@/components/ui/card';
import { JobCard } from '@/components/job-card';
import { JobSheet } from '@/components/job-sheet';
import { Pill, RelTime, EmptyState } from '@/components/visuals';
import type { Job } from '@/lib/types';

export default function ScanPage() {
  const snap = useSnapshot();
  const now = useNow(15000);
  const [openJob, setOpenJob] = React.useState<Job | null>(null);

  const enabled = snap.companies.filter((c) => c.enabled);
  const lastRun = snap.runs[snap.runs.length - 1];
  const newest = [...snap.jobs]
    .filter((j) => j.status !== 'discarded' && j.status !== 'skip')
    .sort((a, b) => (a.discoveredAt < b.discoveredAt ? 1 : -1))
    .slice(0, 12);

  const scanNow = async () => {
    toast.loading('Queued a scan…', { id: 'scan' });
    const r = await sendCommand('scan_now');
    if (r.ok) toast.success('Scan requested — the next cycle will sweep the boards', { id: 'scan' });
    else toast.error(r.error ?? 'Could not queue scan', { id: 'scan' });
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Job Scan"
        subtitle="Public ATS boards the engine sweeps on every hunt cycle."
        action={
          <Button variant="amber" onClick={scanNow}>
            <Radar className="h-4 w-4" />
            Scan now
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Boards swept" value={lastRun ? lastRun.boards : enabled.length} />
        <MiniStat label="Roles found (total)" value={snap.jobs.filter((j) => j.status !== 'discarded' && j.status !== 'skip').length} />
        <MiniStat label="New this cycle" value={lastRun ? lastRun.newJobs : 0} />
        <MiniStat label="Scored this cycle" value={lastRun ? lastRun.scored : 0} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* sources */}
        <Card className="xl:col-span-1">
          <div className="flex items-center gap-2 p-5 pb-2">
            <Building2 className="h-4 w-4 text-sky" />
            <h2 className="font-display text-base font-bold">Enabled sources</h2>
            <Pill className="ml-auto">{enabled.length}/{snap.companies.length}</Pill>
          </div>
          <CardContent className="flex flex-col gap-1.5 pt-1">
            {enabled.length === 0 && (
              <EmptyState title="no boards enabled" sub="Add companies on the Companies page to give the scanner something to sweep." />
            )}
            {enabled.map((c) => {
              const count = snap.jobs.filter((j) => j.boardToken === c.token && j.status !== 'discarded' && j.status !== 'skip').length;
              return (
                <div key={`${c.ats}-${c.token}`} className="flex items-center gap-3 rounded-2xl border border-line bg-paper/40 px-3 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-soft text-xs font-black">
                    {c.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold">{c.name}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{c.ats}</div>
                  </div>
                  <Pill tone={count > 0 ? 'sage' : 'default'}>{count} roles</Pill>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* newest jobs */}
        <div className="xl:col-span-2">
          <h2 className="mb-2 font-display text-base font-bold">Newest discovered</h2>
          {newest.length === 0 ? (
            <EmptyState
              icon={<Radar className="h-6 w-6" />}
              title="nothing here yet"
              sub="Press Scan now (or Run hunt) and new roles will land here with grades and match percentages."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {newest.map((j) => (
                <div key={j.id}>
                  <JobCard job={j} onOpen={setOpenJob} />
                  <div className="mt-1 px-1 text-[10px] text-ink-faint">
                    found <RelTime ts={j.discoveredAt} now={now} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <JobSheet job={openJob} onClose={() => setOpenJob(null)} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <GlassCard className="p-4">
      <div className="font-display text-2xl font-black tabular-nums">{value}</div>
      <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">{label}</div>
    </GlassCard>
  );
}
