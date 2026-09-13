'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Plus, ExternalLink, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { useSnapshot } from '@/components/live-provider';
import { GlassCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// (DialogTrigger intentionally not used: the "Add company" button opens the dialog
// via controlled state to avoid nested <button> elements.)
import { EmptyState, Pill } from '@/components/visuals';
import type { ATS } from '@/lib/types';

const ATS_OPTIONS: { value: ATS; label: string; hint: string }[] = [
  { value: 'greenhouse', label: 'Greenhouse', hint: 'board token from boards-api.greenhouse.io' },
  { value: 'lever', label: 'Lever', hint: 'token from api.lever.co/v0/postings/<token>' },
  { value: 'ashby', label: 'Ashby', hint: 'provider stub — no public feed yet' },
];

export default function CompaniesPage() {
  const snap = useSnapshot();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [ats, setAts] = React.useState<ATS>('greenhouse');
  const [token, setToken] = React.useState('');
  const [careersUrl, setCareersUrl] = React.useState('');

  const enabled = snap.companies.filter((c) => c.enabled);

  const addCompany = async () => {
    if (!name.trim() || !token.trim()) {
      toast.error('Name and board token are required');
      return;
    }
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', name: name.trim(), ats, token: token.trim(), careersUrl: careersUrl.trim() || undefined }),
    });
    const r = await res.json();
    if (r.ok) {
      toast.success(`${name} added — the next cycle will sweep it`);
      setOpen(false);
      setName(''); setToken(''); setCareersUrl('');
    } else {
      toast.error(r.error ?? 'Could not add company');
    }
  };

  const toggle = async (id: string, current: boolean) => {
    await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id, enabled: !current }),
    });
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Companies"
        subtitle="Public job boards the scanner sweeps. Add a board with its ATS token — never scrape what isn't offered publicly."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <Button variant="amber" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add company
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a company board</DialogTitle>
                <DialogDescription>
                  Greenhouse and Lever are fully supported. Find the token in the companies public careers feed URL.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex flex-col gap-3">
                <div>
                  <Label className="mb-1.5 block">Company name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Robotics" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 block">ATS</Label>
                    <Select value={ats} onChange={(e) => setAts(e.target.value as ATS)}>
                      {ATS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Board token</Label>
                    <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="acme-robotics" />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block">Careers URL (optional)</Label>
                  <Input value={careersUrl} onChange={(e) => setCareersUrl(e.target.value)} placeholder="https://acme.com/careers" />
                </div>
                <div className="text-[11px] text-ink-faint">{ATS_OPTIONS.find((o) => o.value === ats)?.hint}</div>
                <div className="mt-1 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button variant="default" onClick={addCompany}>Add board</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <GlassCard className="p-4">
          <div className="font-display text-2xl font-black">{enabled.length}</div>
          <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">enabled</div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="font-display text-2xl font-black">{snap.companies.length}</div>
          <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">total boards</div>
        </GlassCard>
      </div>

      {snap.companies.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="no boards yet"
          sub="Add your first company board — e.g. a Greenhouse token from the company's public job feed."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snap.companies.map((c) => {
            const id = `${c.ats}:${c.token}`;
            const count = snap.jobs.filter((j) => j.boardToken === c.token && j.status !== 'discarded' && j.status !== 'skip').length;
            return (
              <GlassCard key={id} className="flex items-center gap-3 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-soft font-display text-sm font-black">
                  {c.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{c.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Pill tone="sky">{c.ats}</Pill>
                    <Pill tone={count > 0 ? 'sage' : 'default'}>{count} roles</Pill>
                  </div>
                </div>
                {c.careersUrl && (
                  <a href={c.careersUrl} target="_blank" rel="noreferrer noopener" className="text-ink-faint transition-colors hover:text-ink" title="Open careers page">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <Switch checked={c.enabled} onCheckedChange={() => toggle(id, c.enabled)} aria-label={`Enable ${c.name}`} />
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
