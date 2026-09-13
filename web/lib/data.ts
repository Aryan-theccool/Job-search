// Safe flat-file data layer: read JSON with fallbacks, read JSONL, atomic writes,
// append JSONL, queue commands, and build the full Snapshot the dashboard consumes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { P } from './paths';
import type {
  ActivityEvent, Company, Job, Prefs, Profile, Run, Snapshot, CommandType,
} from './types';

/* ---------------- defaults ---------------- */

export const DEFAULT_PROFILE: Profile = {
  fullName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  portfolio: '',
  currentEmployer: '',
  currentTitle: '',
  headline: '',
  targetRoles: [],
  archetypes: [],
  superpowers: [],
  dealBreakers: [],
  compensation: { currency: 'USD' },
  legal: { ee: {} },
  onboarded: false,
  isDemo: true,
  updatedAt: new Date(0).toISOString(),
};

export const DEFAULT_PREFS: Prefs = {
  autonomy: false,
  autoSubmit: true, // auto-submit clean forms — but liveApply stays off until you say so
  liveApply: false, // dry run until explicitly enabled
  minScore: 4.0,
  dailyCap: 12,
  perCompanyCap: 2,
  scanIntervalMin: 30,
  workingHours: { start: 9, end: 19 },
  theme: 'day',
  blockedCompanies: [],
  updatedAt: new Date(0).toISOString(),
};

/* ---------------- low-level safe IO ---------------- */

export function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export function readJsonl<T>(file: string): T[] {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const out: T[] = [];
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      try {
        out.push(JSON.parse(t) as T);
      } catch {
        /* skip corrupt line */
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function writeJsonAtomic(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  let lastErr: unknown;
  for (let i = 0; i < 4; i++) {
    try {
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
      try { fs.rmSync(file, { force: true }); } catch { /* ignore */ }
      fs.renameSync(tmp, file);
      return;
    } catch (err) {
      lastErr = err;
      try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50 * (i + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('write failed');
}

export function appendJsonl(file: string, obj: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(obj) + '\n');
}

/* ---------------- domain helpers ---------------- */

export function loadProfile(): Profile {
  const p = readJson<Partial<Profile>>(P.profile, {});
  return {
    ...DEFAULT_PROFILE,
    ...p,
    compensation: { ...DEFAULT_PROFILE.compensation, ...(p.compensation ?? {}) },
    legal: { ...DEFAULT_PROFILE.legal, ...(p.legal ?? {}), ee: { ...(p.legal?.ee ?? {}) } },
    targetRoles: Array.isArray(p.targetRoles) ? p.targetRoles : [],
  };
}

export function loadPrefs(): Prefs {
  const p = readJson<Partial<Prefs>>(P.prefs, {});
  return {
    ...DEFAULT_PREFS,
    ...p,
    workingHours: { ...DEFAULT_PREFS.workingHours, ...(p.workingHours ?? {}) },
  };
}

export function loadCompanies(): Company[] {
  const c = readJson<Company[]>(P.companies, []);
  return Array.isArray(c) ? c : [];
}

export function loadJobs(): Job[] {
  const j = readJson<Job[]>(P.jobs, []);
  return Array.isArray(j) ? j : [];
}

export function loadRuns(): Run[] {
  const r = readJson<Run[]>(P.runs, []);
  return Array.isArray(r) ? r : [];
}

export function loadActivity(limit = 150): ActivityEvent[] {
  return readJsonl<ActivityEvent>(P.activity).slice(-limit).reverse();
}

export function saveProfile(profile: Profile): void {
  writeJsonAtomic(P.profile, { ...profile, updatedAt: new Date().toISOString() });
}

export function savePrefs(patch: Partial<Prefs>): Prefs {
  const next: Prefs = { ...loadPrefs(), ...patch, updatedAt: new Date().toISOString() };
  writeJsonAtomic(P.prefs, next);
  return next;
}

export function saveCompanies(companies: Company[]): void {
  writeJsonAtomic(P.companies, companies);
}

export function queueCommand(type: CommandType, { jobId, payload }: { jobId?: string; payload?: Record<string, unknown> } = {}): void {
  appendJsonl(P.commands, {
    id: `cmd_${crypto.randomBytes(6).toString('hex')}`,
    ts: new Date().toISOString(),
    type,
    jobId,
    payload: payload ?? {},
  });
}

/* ---------------- snapshot + change detection ---------------- */

const TRACKED_FILES = [P.profile, P.prefs, P.companies, P.jobs, P.runs, P.activity, P.commands, P.baseCv];

/** mtime + size signature of every shared file; used by the SSE stream to detect changes. */
export function statSignature(): string {
  const parts: string[] = [];
  for (const f of TRACKED_FILES) {
    try {
      const st = fs.statSync(f);
      parts.push(`${path.basename(f)}:${st.mtimeMs}:${st.size}`);
    } catch {
      parts.push(`${path.basename(f)}:0:0`);
    }
  }
  return parts.join('|');
}

export function readSnapshot(): Snapshot {
  return {
    profile: loadProfile(),
    prefs: loadPrefs(),
    companies: loadCompanies(),
    jobs: loadJobs(),
    runs: loadRuns(),
    activity: loadActivity(150),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Job ids contain ":" (ats:token:slug), which is an invalid filename character
 * on Windows — map to "__" for the file name while keeping the id stable.
 */
export function cvSafeName(id: string): string {
  return String(id).replace(/:/g, '__');
}

function isSafeCvId(id: string): boolean {
  const s = String(id);
  return s.length > 0 && !s.includes('/') && !s.includes('\\') && !s.includes('..') && !s.startsWith('.');
}

export function cvFile(id: string): string | null {
  if (!isSafeCvId(id)) return null;
  const names = [`${cvSafeName(id)}.md`, `${id}.md`]; // second form: legacy colon files
  for (const n of new Set(names)) {
    const file = path.join(P.cvDir, n);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

export function readCv(id: string): string | null {
  const file = cvFile(id);
  if (!file) return null;
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

export function writeCv(id: string, markdown: string): string {
  if (!isSafeCvId(id)) throw new Error('invalid CV id');
  fs.mkdirSync(P.cvDir, { recursive: true });
  const file = path.join(P.cvDir, `${cvSafeName(id)}.md`);
  fs.writeFileSync(file, markdown);
  return file;
}
