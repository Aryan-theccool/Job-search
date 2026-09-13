'use client';

import * as React from 'react';
import { KanbanSquare } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { useSnapshot } from '@/components/live-provider';
import { JobCard } from '@/components/job-card';
import { JobSheet } from '@/components/job-sheet';
import { EmptyState } from '@/components/visuals';
import type { Job, JobStatus } from '@/lib/types';

interface Column {
  key: string;
  title: string;
  statuses: JobStatus[];
  tone: string;
}

const COLUMNS: Column[] = [
  { key: 'discovery', title: 'Discovery / Scored', statuses: ['new', 'scored'], tone: 'var(--status-scored)' },
  { key: 'cv', title: 'CV Ready', statuses: ['cv_ready'], tone: 'var(--status-cv)' },
  { key: 'needs', title: 'Needs You', statuses: ['needs_you'], tone: 'var(--status-needs)' },
  { key: 'applied', title: 'Applied', statuses: ['applied', 'responded'], tone: 'var(--status-applied)' },
  { key: 'interview', title: 'Interview', statuses: ['interview'], tone: 'var(--status-interview)' },
  { key: 'closed', title: 'Offer / Closed', statuses: ['offer', 'rejected', 'discarded', 'skip'], tone: 'var(--status-offer)' },
];

export default function ApplicationsPage() {
  const snap = useSnapshot();
  const [openJob, setOpenJob] = React.useState<Job | null>(null);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Applications" subtitle="Your whole pipeline, from first discovery to offer." />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const jobs = snap.jobs
            .filter((j) => col.statuses.includes(j.status))
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          return (
            <div key={col.key} className="flex w-[260px] shrink-0 flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <span className="h-2 w-2 rounded-full" style={{ background: col.tone }} />
                <span className="font-display text-sm font-bold">{col.title}</span>
                <span className="ml-auto rounded-full bg-ink/8 px-2 py-0.5 text-[10.5px] font-bold text-ink-muted">{jobs.length}</span>
              </div>
              {jobs.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-line px-4 py-8 text-center text-xs text-ink-faint">
                  nothing here yet
                </div>
              ) : (
                jobs.map((j) => <JobCard key={j.id} job={j} onOpen={setOpenJob} />)
              )}
            </div>
          );
        })}
      </div>

      {snap.jobs.length === 0 && (
        <EmptyState
          icon={<KanbanSquare className="h-6 w-6" />}
          title="no applications yet"
          sub="Run a hunt to discover roles — scored jobs appear in Discovery, tailored CVs in CV Ready, and anything the browser can't safely finish in Needs You."
        />
      )}

      <JobSheet job={openJob} onClose={() => setOpenJob(null)} />
    </div>
  );
}
