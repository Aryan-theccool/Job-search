'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { ShieldAlert, Save, Bot, UserRound, ScrollText, Database } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { useSnapshot } from '@/components/live-provider';
import { savePrefs, saveProfile } from '@/lib/use-live';
import { GlassCard, Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Pill } from '@/components/visuals';

export default function SettingsPage() {
  const snap = useSnapshot();
  const p = snap.profile;
  const prefs = snap.prefs;

  /* ---------------- profile form state ---------------- */
  const [profile, setProfile] = React.useState({
    fullName: p.fullName,
    email: p.email,
    phone: p.phone,
    location: p.location,
    headline: p.headline,
    linkedin: p.linkedin ?? '',
    github: p.github ?? '',
    portfolio: p.portfolio ?? '',
    targetRoles: p.targetRoles.join(', '),
    floor: p.compensation.floor ? String(p.compensation.floor) : '',
    target: p.compensation.target ? String(p.compensation.target) : '',
    currency: p.compensation.currency || 'USD',
  });
  const [legal, setLegal] = React.useState({
    workAuthorized: p.legal.workAuthorized ?? true,
    requiresSponsorship: p.legal.requiresSponsorship ?? false,
    relocation: p.legal.relocation ?? '',
    noticePeriod: p.legal.noticePeriod ?? '',
    salaryExpectation: p.legal.salaryExpectation ?? '',
    startDate: p.legal.startDate ?? '',
    referralSource: p.legal.referralSource ?? '',
    criminalDisclosure: p.legal.criminalDisclosure ?? '',
    eeGender: p.legal.ee?.gender ?? 'Decline to self-identify',
    eeRace: p.legal.ee?.race ?? 'Decline to self-identify',
    eeVeteran: p.legal.ee?.veteran ?? 'Decline to self-identify',
    eeDisability: p.legal.ee?.disability ?? 'Decline to self-identify',
  });
  const [cv, setCv] = React.useState<string | null>(null);
  const [cvSaved, setCvSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // load base CV
  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/cv?id=base')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) {
          setCv(d?.markdown ?? null);
          setCvSaved(true);
        }
      })
      .catch(() => !cancelled && setCv(''));
    return () => { cancelled = true; };
  }, []);

  const set = (k: keyof typeof profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setProfile((s) => ({ ...s, [k]: e.target.value }));
  const setL = (k: keyof typeof legal) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setLegal((s) => ({ ...s, [k]: e.target.value }));

  const saveAll = async () => {
    setSaving(true);
    try {
      const fullName = profile.fullName.trim();
      const [first, ...rest] = fullName.split(/\s+/);
      const patch = {
        fullName,
        firstName: first ?? '',
        lastName: rest.join(' ') ?? '',
        email: profile.email.trim(),
        phone: profile.phone.trim(),
        location: profile.location.trim(),
        headline: profile.headline.trim(),
        linkedin: profile.linkedin.trim() || undefined,
        github: profile.github.trim() || undefined,
        portfolio: profile.portfolio.trim() || undefined,
        targetRoles: profile.targetRoles.split(',').map((s) => s.trim()).filter(Boolean),
        compensation: {
          currency: profile.currency || 'USD',
          floor: profile.floor ? Number(profile.floor) : undefined,
          target: profile.target ? Number(profile.target) : undefined,
        },
        legal: {
          workAuthorized: legal.workAuthorized,
          requiresSponsorship: legal.requiresSponsorship,
          relocation: legal.relocation,
          noticePeriod: legal.noticePeriod,
          salaryExpectation: legal.salaryExpectation,
          startDate: legal.startDate,
          referralSource: legal.referralSource,
          criminalDisclosure: legal.criminalDisclosure,
          ee: {
            gender: legal.eeGender,
            race: legal.eeRace,
            veteran: legal.eeVeteran,
            disability: legal.eeDisability,
          },
        },
        onboarded: true,
        isDemo: false,
      };
      const r = await saveProfile(patch);
      if (r.ok) toast.success('Profile saved — you are out of demo mode');
      else toast.error('Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const saveCv = async () => {
    if (cv === null) return;
    const res = await fetch('/api/cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'base', markdown: cv }),
    });
    const r = await res.json();
    if (r.ok) {
      setCvSaved(true);
      toast.success('Base CV saved');
    } else toast.error(r.error ?? 'Could not save CV');
  };

  const patchPrefs = async (patch: Parameters<typeof savePrefs>[0], msg?: string) => {
    await savePrefs(patch);
    if (msg) toast.success(msg);
  };

  const switchDataset = async (demo: boolean) => {
    const res = await fetch('/api/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: demo ? 'demo' : 'real' }),
    });
    const r = await res.json();
    if (r.ok) toast.success(demo ? 'Demo dataset seeded' : 'Switched to a fresh real dataset');
    else toast.error(r.error ?? 'Could not switch dataset');
  };

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-5">
      <PageHeader title="Settings" subtitle="Your identity, autonomy rules, and truthful answers. The engine only ever uses what you store here." />

      {/* autonomy */}
      <Card>
        <SectionHead icon={Bot} title="Autonomy" sub="What the agent may do without asking." />
        <CardContent className="flex flex-col gap-4">
          <SwitchRow
            label="Hunt on its own"
            desc={`Automatically run a full scan + score cycle every ${prefs.scanIntervalMin} minutes.`}
            checked={prefs.autonomy}
            onChange={(v) => patchPrefs({ autonomy: v }, v ? 'Autonomy on — hunts every interval' : 'Autonomy off — hunts only when you press Run hunt')}
          />
          <SwitchRow
            label="Auto-submit clean forms"
            desc="Let the apply engine fill and finish applications it can verify end-to-end."
            checked={prefs.autoSubmit}
            onChange={(v) => patchPrefs({ autoSubmit: v })}
          />
          <div className="rounded-3xl border border-rose/40 bg-rose-soft/40 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold">
                  <ShieldAlert className="h-4 w-4 text-rose" />
                  Live apply
                </div>
                <div className="mt-1 text-xs leading-relaxed text-ink-muted">
                  <strong className="text-rose">Off = dry run.</strong> Dry runs fill forms and capture evidence but never press final submit.
                  Turn this on only after you have reviewed multiple dry runs and trust the field mapping.
                </div>
              </div>
              <Switch checked={prefs.liveApply} onCheckedChange={(v) => patchPrefs({ liveApply: v }, v ? 'LIVE APPLY ON — real submissions allowed' : 'Back to safe dry-run mode')} />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Min auto-submit score</Label>
                <Pill tone="amber">{prefs.minScore.toFixed(1)}</Pill>
              </div>
              <Slider
                min={3}
                max={5}
                step={0.1}
                value={[prefs.minScore]}
                onValueChange={(v) => patchPrefs({ minScore: v[0] ?? 4 })}
                aria-label="Minimum auto-submit score"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Daily application cap</Label>
                <Pill tone="amber">{prefs.dailyCap}</Pill>
              </div>
              <Slider
                min={1}
                max={30}
                step={1}
                value={[prefs.dailyCap]}
                onValueChange={(v) => patchPrefs({ dailyCap: v[0] ?? 12 })}
                aria-label="Daily application cap"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Per-company cap</Label>
                <Pill tone="amber">{prefs.perCompanyCap}</Pill>
              </div>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[prefs.perCompanyCap]}
                onValueChange={(v) => patchPrefs({ perCompanyCap: v[0] ?? 2 })}
                aria-label="Per-company cap"
              />
            </div>
            <div>
              <Label className="mb-2 block">Scan interval</Label>
              <Select value={prefs.scanIntervalMin} onChange={(e) => patchPrefs({ scanIntervalMin: Number(e.target.value) })}>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
                <option value={120}>Every 2 hours</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* profile */}
      <Card>
        <SectionHead
          icon={UserRound}
          title="Your profile"
          sub={p.isDemo ? 'You are in demo mode — saving a real profile below switches it off.' : 'Saved.'}
          action={p.isDemo ? <Pill tone="amber">demo mode</Pill> : <Pill tone="sage">live profile</Pill>}
        />
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Full name"><Input value={profile.fullName} onChange={set('fullName')} placeholder="Karmendra Singh" /></Field>
            <Field label="Email"><Input value={profile.email} onChange={set('email')} placeholder="you@example.com" /></Field>
            <Field label="Phone"><Input value={profile.phone} onChange={set('phone')} placeholder="+91 …" /></Field>
            <Field label="Location"><Input value={profile.location} onChange={set('location')} placeholder="Remote / Worldwide" /></Field>
            <Field label="Headline"><Input value={profile.headline} onChange={set('headline')} placeholder="AI Engineer & Automation specialist" /></Field>
            <Field label="Target roles (comma separated)">
              <Input value={profile.targetRoles} onChange={set('targetRoles')} placeholder="AI Engineer, Solutions Architect" />
            </Field>
            <Field label="Compensation floor">
              <Input value={profile.floor} onChange={set('floor')} placeholder="120000" type="number" />
            </Field>
            <Field label="Compensation target (currency: {profile.currency})">
              <div className="flex gap-2">
                <Input value={profile.target} onChange={set('target')} placeholder="180000" type="number" className="flex-1" />
                <Select value={profile.currency} onChange={(e) => setProfile((s) => ({ ...s, currency: e.target.value }))} className="w-24">
                  <option>USD</option><option>EUR</option><option>GBP</option><option>INR</option>
                </Select>
              </div>
            </Field>
            <Field label="LinkedIn"><Input value={profile.linkedin} onChange={set('linkedin')} placeholder="https://linkedin.com/in/…" /></Field>
            <Field label="GitHub"><Input value={profile.github} onChange={set('github')} placeholder="https://github.com/…" /></Field>
            <Field label="Portfolio / website"><Input value={profile.portfolio} onChange={set('portfolio')} placeholder="https://…" /></Field>
          </div>
          <div className="flex justify-end">
            <Button variant="default" onClick={saveAll} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* truthful answers */}
      <Card>
        <SectionHead
          icon={ScrollText}
          title="Truthful answers"
          sub="The engine only ever answers application questions from these stored values. Anything unknown is parked for you — never guessed."
        />
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl border border-line bg-paper/40 px-4 py-3">
              <div>
                <div className="text-xs font-bold">Work authorized in target country</div>
                <div className="text-[10.5px] text-ink-faint">legal question — never invented</div>
              </div>
              <Switch checked={legal.workAuthorized} onCheckedChange={(v) => setLegal((s) => ({ ...s, workAuthorized: v }))} />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-line bg-paper/40 px-4 py-3">
              <div>
                <div className="text-xs font-bold">Requires sponsorship</div>
                <div className="text-[10.5px] text-ink-faint">legal question — never invented</div>
              </div>
              <Switch checked={legal.requiresSponsorship} onCheckedChange={(v) => setLegal((s) => ({ ...s, requiresSponsorship: v }))} />
            </div>
            <Field label="Relocation"><Input value={legal.relocation} onChange={setL('relocation')} placeholder="Open to relocation" /></Field>
            <Field label="Notice period"><Input value={legal.noticePeriod} onChange={setL('noticePeriod')} placeholder="30 days" /></Field>
            <Field label="Salary expectation"><Input value={legal.salaryExpectation} onChange={setL('salaryExpectation')} placeholder="Market, open to discussion" /></Field>
            <Field label="Start date"><Input value={legal.startDate} onChange={setL('startDate')} placeholder="Immediate" /></Field>
            <Field label="Referral source"><Input value={legal.referralSource} onChange={setL('referralSource')} placeholder="Found via job board" /></Field>
            <Field label="Criminal disclosure"><Input value={legal.criminalDisclosure} onChange={setL('criminalDisclosure')} placeholder="None to disclose" /></Field>
          </div>
          <div>
            <Label className="mb-2 block">EEO — defaults to “Decline to self-identify”</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Gender"><Input value={legal.eeGender} onChange={setL('eeGender')} /></Field>
              <Field label="Race / ethnicity"><Input value={legal.eeRace} onChange={setL('eeRace')} /></Field>
              <Field label="Veteran status"><Input value={legal.eeVeteran} onChange={setL('eeVeteran')} /></Field>
              <Field label="Disability"><Input value={legal.eeDisability} onChange={setL('eeDisability')} /></Field>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="default" onClick={saveAll} disabled={saving}>
              <Save className="h-4 w-4" /> Save truthful answers
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* base CV */}
      <Card>
        <SectionHead
          icon={ScrollText}
          title="Base CV (Markdown)"
          sub="Source of truth. Tailoring reuses only facts from here — keep it complete and factual."
        />
        <CardContent className="flex flex-col gap-3">
          <Textarea
            value={cv ?? ''}
            onChange={(e) => { setCv(e.target.value); setCvSaved(false); }}
            placeholder="# Your Name&#10;&#10;## Summary&#10;…&#10;&#10;## Experience&#10;…"
            className="min-h-[280px] font-mono text-xs leading-relaxed"
          />
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-ink-faint">{cvSaved ? 'in sync with data/cv/base.md' : 'unsaved changes'}</div>
            <Button variant="sage" onClick={saveCv} disabled={cvSaved}>
              <Save className="h-4 w-4" /> Save base CV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* dataset */}
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-soft">
            <Database className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">Dataset</div>
            <div className="text-xs text-ink-muted">
              {p.isDemo
                ? 'Demo dataset — realistic listings with a placeholder identity. Real submission is blocked.'
                : 'Real dataset — live scans fill the pipeline. Your profile and base CV are kept.'}
            </div>
          </div>
          <Button variant={p.isDemo ? 'default' : 'outline'} onClick={() => switchDataset(!p.isDemo)}>
            {p.isDemo ? 'Start real hunt (reset data)' : 'Load demo dataset'}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function SectionHead({ icon: Icon, title, sub, action }: { icon: React.ElementType; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-5 pb-1">
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-soft">
        <Icon className="h-4 w-4 text-ink" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-base font-bold">{title}</div>
        {sub && <div className="text-[11px] text-ink-muted">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function SwitchRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-paper/40 px-4 py-3">
      <div>
        <div className="text-xs font-bold">{label}</div>
        <div className="text-[10.5px] text-ink-faint">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
