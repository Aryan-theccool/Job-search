// Karmendra AI Job Hunter — seeder.
// Makes the dashboard immediately useful:
//   • DEMO profile (placeholder identity, isDemo=true → real submission blocked)
//   • sensible prefs (liveApply=false)
//   • company boards from the build guide (Greenhouse + Lever)
//   • real public postings when reachable, bundled demo dataset as graceful fallback
//   • deterministic A–F scores spread across the pipeline (interview, applied,
//     needs_you, cv_ready, scored)
//   • base CV, run records, activity feed
// NEVER submits a real application.
import fs from 'node:fs';
import path from 'node:path';
import {
  paths, ensureDirs, writeJsonAtomic, readJson, appendActivity, appendJsonl,
  nowIso, newId, saveJobs, getJobs, isMainModule, sleep,
} from './lib.mjs';
import { scoreJob } from './score.mjs';
import { buildKeywords, isExcluded } from './scan.mjs';
import { allDemoJobs } from './providers/demo-boards.mjs';
import { fetchJson } from './providers/_http.mjs';

const GREENHOUSE_TOKENS = [
  ['Anthropic', 'anthropic', 'https://www.anthropic.com/careers'],
  ['Vercel', 'vercel', 'https://vercel.com/careers'],
  ['Airtable', 'airtable', 'https://airtable.com/careers'],
  ['Temporal', 'temporal', 'https://temporal.io/careers'],
  ['Arize AI', 'arizeai', 'https://www.arize.com/careers'],
  ['Glean', 'gleanwork', 'https://www.glean.com/careers'],
  ['Speechmatics', 'speechmatics', 'https://speechmatics.com/company/careers'],
  ['PlanetScale', 'planetscale', 'https://planetscale.com/careers'],
  ['Hightouch', 'hightouch', 'https://hightouch.com/careers'],
  ['Runway', 'runwayml', 'https://runwayml.com/careers'],
  ['Wayve', 'wayve', 'https://wayve.ai/jobs'],
  ['Stability AI', 'stabilityai', 'https://stability.ai/careers'],
];
const LEVER_TOKENS = [
  ['Mistral', 'mistral', 'https://mistral.ai/careers'],
  ['Spotify', 'spotify', 'https://lifeatspotify.com/'],
];

const BASE_CV = `# Karmendra Demo

karmendra.demo@example.com · +91 90000 00000 · Remote / Worldwide
linkedin.com/in/karmendra-demo · github.com/karmendra-demo

> DEMO PLACEHOLDER — replace with your real CV in Settings → Base CV.
> The tailor only reuses facts present here; it never invents experience.

## Summary

AI engineer and automation specialist with 5+ years building LLM-powered products, agent
workflows, and internal platforms. Comfortable owning features end-to-end: from evaluation
harnesses and prompt pipelines to production services and the UI around them.

## Experience

### Senior Software Engineer — Nimbus Labs (2023 – Present)
- Built an internal agent platform used by 3 product teams: tool-calling orchestration, run tracing, and eval suites for LLM outputs.
- Shipped a document automation pipeline (extraction → review → API) that cut manual processing time by ~40%.
- Led migration of a legacy job scheduler to a queue-based platform, improving throughput and observability.

### Software Engineer — DataCraft (2021 – 2023)
- Developed ETL services and data APIs in Python and TypeScript handling millions of records per day.
- Prototyped and productionized an LLM-assisted support triage tool with human-in-the-loop review.

### Engineering Intern — Brightstack (2020 – 2021)
- Automated release notes generation and regression test selection for the mobile release train.

## Skills

- Languages: Python, TypeScript/JavaScript, SQL, Go (working)
- ML/AI: LLM application development, RAG, evals, prompt engineering, agent frameworks
- Infra: Docker, Kubernetes, Postgres, Redis, AWS, CI/CD, observability
- Practices: API design, code review, incident response, small-team ownership

## Education

B.Tech, Computer Science — 2020
`;

function hoursAgoIso(h) {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

function lastSegment(url) {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || u.host);
  } catch {
    return url;
  }
}

/** Try a real Greenhouse board. Returns raw job list or null. */
async function tryGreenhouse(token) {
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`);
  const list = Array.isArray(data) ? data : Array.isArray(data?.jobs) ? data.jobs : [];
  return list.map((j) => ({
    title: j.title ?? '',
    url: j.absolute_url ?? '',
    location: j.location?.name || 'Unknown',
    salary:
      j.salary && (j.salary.min || j.salary.max)
        ? { min: j.salary.min, max: j.salary.max, currency: j.salary.currency || 'USD', period: j.salary.period || 'YEAR' }
        : undefined,
    postedAt: j.first_published || undefined,
  }));
}

/** Try a real Lever board. Returns raw job list or null. */
async function tryLever(token) {
  const data = await fetchJson(`https://api.lever.co/v0/postings/${token}?mode=json`);
  if (!Array.isArray(data)) return null;
  return data.map((j) => ({
    title: j.text ?? '',
    url: j.hostedUrl ?? '',
    location: j.categories?.location || 'Unknown',
    salary: undefined,
    postedAt: j.createdAt || undefined,
  }));
}

const SEED_EXCLUDE = /intern|co-op|coop|apprentice|junior|mobile|embedded|embedded systems|data entry|customer support/i;

async function seed() {
  ensureDirs();
  console.log('Karmendra Job Hunter — seeding demo dataset…');
  const startedAt = nowIso();

  // The demo seed is reproducible: start from a clean slate (keeps config + base CV).
  writeJsonAtomic(paths.jobs, []);
  writeJsonAtomic(paths.runs, []);
  fs.rmSync(paths.activity, { force: true });
  fs.rmSync(paths.commands, { force: true });
  for (const f of fs.readdirSync(paths.cv)) {
    if (f === 'base.md' || f === '.gitkeep') continue;
    fs.rmSync(path.join(paths.cv, f), { force: true });
  }
  try {
    for (const f of fs.readdirSync(paths.screens)) {
      if (f === '.gitkeep') continue;
      fs.rmSync(path.join(paths.screens, f), { force: true });
    }
  } catch { /* no screens dir yet */ }

  // ---- config ----
  const profile = {
    fullName: 'Karmendra Demo',
    firstName: 'Karmendra',
    lastName: 'Demo',
    email: 'karmendra.demo@example.com',
    phone: '+91 90000 00000',
    location: 'Remote / Worldwide',
    linkedin: 'https://linkedin.com/in/karmendra-demo',
    github: 'https://github.com/karmendra-demo',
    portfolio: undefined,
    currentEmployer: 'Nimbus Labs (demo)',
    currentTitle: 'Senior Software Engineer',
    headline: 'AI Engineer & Automation specialist',
    targetRoles: ['AI Engineer', 'Solutions Architect', 'Automation Engineer'],
    archetypes: ['Agentic / Automation', 'AI Platform / LLMOps'],
    superpowers: ['evals & agent reliability', 'fast prototyping'],
    dealBreakers: [],
    compensation: { currency: 'USD', floor: 120000, target: 180000 },
    legal: {
      workAuthorized: true,
      requiresSponsorship: false,
      relocation: 'Open to relocation',
      noticePeriod: '30 days',
      salaryExpectation: 'Market, open to discussion',
      startDate: 'Immediate',
      referralSource: 'Found via job board',
      criminalDisclosure: 'None to disclose',
      ee: {
        gender: 'Decline to self-identify',
        race: 'Decline to self-identify',
        veteran: 'Decline to self-identify',
        disability: 'Decline to self-identify',
      },
    },
    onboarded: true,
    isDemo: true,
    updatedAt: nowIso(),
  };
  const prefs = {
    autonomy: true,
    autoSubmit: true,
    liveApply: false,
    minScore: 4.0,
    dailyCap: 12,
    perCompanyCap: 2,
    scanIntervalMin: 30,
    workingHours: { start: 9, end: 19 },
    theme: 'day',
    blockedCompanies: [],
    updatedAt: nowIso(),
  };
  writeJsonAtomic(paths.profile, profile);
  writeJsonAtomic(paths.prefs, prefs);

  const companies = [
    ...GREENHOUSE_TOKENS.map(([name, token, careersUrl]) => ({ name, ats: 'greenhouse', token, careersUrl, enabled: true })),
    ...LEVER_TOKENS.map(([name, token, careersUrl]) => ({ name, ats: 'lever', token, careersUrl, enabled: true })),
  ];
  writeJsonAtomic(paths.companies, companies);

  // base CV (never overwritten by tailoring)
  fs.writeFileSync(paths.baseCv, BASE_CV);

  // ---- collect jobs: real boards first, fallback per board ----
  const targetRoles = profile.targetRoles;
  const keywords = buildKeywords(targetRoles);
  const existing = new Set(getJobs().map((j) => j.id));
  const jobs = [];
  let realBoards = 0;
  let fallbackBoards = 0;

  for (const c of companies) {
    let raw = null;
    if (c.ats === 'greenhouse') raw = await tryGreenhouse(c.token);
    else if (c.ats === 'lever') raw = await tryLever(c.token);

    if (raw && raw.length > 0) {
      realBoards++;
      for (const j of raw) {
        if (jobs.length >= 40) break;
        const title = (j.title ?? '').trim();
        if (!title || isExcluded(title) || SEED_EXCLUDE.test(title)) continue;
        const t = title.toLowerCase();
        const ok =
          targetRoles.some((r) => t.includes(r.toLowerCase())) ||
          keywords.some((kw) => (kw.length <= 3 ? new RegExp(`\\b${kw}\\b`, 'i').test(t) : t.includes(kw)));
        if (!ok) continue;
        const id = `${c.ats}:${c.token}:${lastSegment(j.url)}`;
        if (existing.has(id)) continue;
        existing.add(id);
        jobs.push({
          id,
          company: c.name,
          title,
          url: j.url,
          location: j.location || 'Unknown',
          ats: c.ats,
          boardToken: c.token,
          postedAt: j.postedAt,
          discoveredAt: hoursAgoIso(2 + Math.floor(Math.random() * 40)),
          updatedAt: nowIso(),
          status: 'new',
          salary: j.salary,
          demo: false,
        });
        if (jobs.length >= 40) break;
      }
    } else {
      fallbackBoards++;
      const demoJobs = allDemoJobs().filter((j) => j.company === c.name).slice(0, 4);
      for (const j of demoJobs) {
        const id = `${j.ats}:${j.token}:${lastSegment(j.url)}`;
        if (existing.has(id)) continue;
        existing.add(id);
        jobs.push({
          id,
          company: j.company,
          title: j.title,
          url: j.url,
          location: j.location,
          ats: j.ats,
          boardToken: j.token,
          postedAt: j.postedAt,
          discoveredAt: hoursAgoIso(2 + Math.floor(Math.random() * 40)),
          updatedAt: nowIso(),
          status: 'new',
          salary: j.salary,
          demo: true,
        });
      }
    }
    await sleep(150);
  }

  // If nothing could be collected at all (shouldn't happen — fallback always has data),
  // fall back to the whole bundled dataset.
  if (jobs.length === 0) {
    for (const j of allDemoJobs()) {
      const id = `${j.ats}:${j.token}:${lastSegment(j.url)}`;
      if (existing.has(id)) continue;
      existing.add(id);
      jobs.push({
        id, company: j.company, title: j.title, url: j.url, location: j.location, ats: j.ats,
        boardToken: j.token, postedAt: j.postedAt, discoveredAt: hoursAgoIso(3), updatedAt: nowIso(),
        status: 'new', salary: j.salary, demo: true,
      });
    }
  }

  // ---- history first (so the activity feed reads naturally) ----
  const pastEvents = [
    { id: newId('evt'), ts: hoursAgoIso(26), phase: 'run', level: 'info', message: 'Hunt cycle started (scheduled)' },
    { id: newId('evt'), ts: hoursAgoIso(25.8), phase: 'scan', level: 'info', message: `Scan complete — ${companies.length} boards swept, 4 new role(s) found` },
    { id: newId('evt'), ts: hoursAgoIso(25.7), phase: 'score', level: 'good', message: 'Scored 4 role(s) — A:2 B:1 C:1 D:0 E:0 F:0' },
    { id: newId('evt'), ts: hoursAgoIso(25.6), phase: 'tailor', level: 'good', message: 'Tailored CV ready for a grade A match (86% match)' },
    { id: newId('evt'), ts: hoursAgoIso(20), phase: 'apply', level: 'info', message: 'Apply engine spawned in dry-run mode' },
    { id: newId('evt'), ts: hoursAgoIso(19.8), phase: 'apply', level: 'warn', message: 'Parked: application form required a CAPTCHA — parked for human review (never bypassed)' },
    { id: newId('evt'), ts: hoursAgoIso(6), phase: 'command', level: 'info', message: 'Preferences updated from dashboard' },
  ];
  for (const e of pastEvents) appendJsonl(paths.activity, e);

  // ---- score all (deterministic) ----
  for (const job of jobs) {
    const r = scoreJob(job, profile, companies);
    Object.assign(job, r, { status: 'scored' });
  }
  // keep older jobs on top like the scanner does
  jobs.sort((a, b) => (a.discoveredAt < b.discoveredAt ? 1 : -1));
  saveJobs(jobs);

  const counts = {};
  for (const j of jobs) counts[j.grade] = (counts[j.grade] ?? 0) + 1;
  appendActivity({
    phase: 'score',
    level: 'good',
    message: `Seeded ${jobs.length} role(s) and scored — A:${counts.A ?? 0} B:${counts.B ?? 0} C:${counts.C ?? 0} D:${counts.D ?? 0} E:${counts.E ?? 0} F:${counts.F ?? 0}`,
  });
  if (fallbackBoards > 0) {
    appendActivity({
      phase: 'scan',
      level: 'warn',
      message:
        fallbackBoards === companies.length
          ? `Live job boards unreachable from this environment — seeded with the bundled demo dataset (demo profile blocks real submissions)`
          : `${fallbackBoards} board(s) unreachable — those use the bundled demo dataset`,
    });
  } else {
    appendActivity({ phase: 'scan', level: 'good', message: `Seeded ${jobs.length} role(s) from ${realBoards} live public boards` });
  }

  // ---- spread the pipeline: top A/B get tailored CVs, then move some along ----
  // Tailor 8 CVs (markdown; PDFs are best-effort and can be generated later).
  // tailorAuto reads/writes its own job list from disk — so after it runs we
  // re-read fresh jobs to stage (stale in-memory copies would clobber cvPath).
  const { tailorAuto } = await import('./tailor.mjs');
  const tailored = (await tailorAuto(8, { skipPdf: true })).made;
  appendActivity({ phase: 'tailor', level: 'good', message: `${tailored} tailored CV(s) generated for top matches (truthful — base CV facts only)` });

  const freshJobs = getJobs();
  const top = freshJobs
    .filter((j) => (j.grade === 'A' || j.grade === 'B') && j.cvPath)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 6);

  const staged = [
    { status: 'interview', park: null },
    { status: 'applied', park: null },
    { status: 'applied', park: null },
    { status: 'needs_you', park: { reason: 'captcha', note: 'CAPTCHA detected on the application form — parked for human review (never bypassed).' } },
    { status: 'needs_you', park: { reason: 'legal_question', note: 'Required question about start date could not be answered from the profile — parked rather than guessed.' } },
    { status: 'cv_ready', park: null },
  ];
  let i = 0;
  for (const job of top) {
    const stage = staged[i % staged.length];
    job.status = stage.status;
    if (stage.status === 'applied') job.appliedAt = hoursAgoIso(3 + i);
    if (stage.park) {
      job.parkedReason = stage.park.reason;
      job.parkedNote = stage.park.note;
    }
    job.updatedAt = nowIso();
    i++;
  }
  saveJobs(freshJobs);

  // ---- runs ----
  const run = {
    id: newId('run'),
    startedAt,
    endedAt: nowIso(),
    boards: companies.length,
    newJobs: jobs.length,
    scored: jobs.length,
    cvs: tailored,
    applied: 2,
    parked: 2,
    durationMs: Date.now() - Date.parse(startedAt),
    seeded: true,
  };
  writeJsonAtomic(paths.runs, [
    {
      id: newId('run'),
      startedAt: hoursAgoIso(26),
      endedAt: hoursAgoIso(25.9),
      boards: companies.length,
      newJobs: 4,
      scored: 4,
      cvs: 1,
      applied: 0,
      parked: 1,
      durationMs: 41000,
    },
    run,
  ]);

  appendActivity({ phase: 'run', level: 'good', message: `Seed complete — ${jobs.length} roles, ${tailored} CVs, demo profile active (real submissions blocked)` });
  console.log(`Seeded ${jobs.length} roles (${realBoards} live boards, ${fallbackBoards} fallback), ${tailored} CVs. Open the dashboard to explore.`);
  console.log('NOTE: demo profile is active — live apply stays OFF and real submission is blocked.');
}

if (isMainModule(import.meta.url)) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
