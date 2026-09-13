// Karmendra AI Job Hunter — truthful CV tailoring.
// HARD RULE: this stage may reorder, summarize and re-emphasize facts that already exist
// in data/cv/base.md. It must NEVER invent employers, dates, projects, skills, metrics,
// degrees, or achievements.
import fs from 'node:fs';
import path from 'node:path';
import { paths, getJobs, saveJobs, loadProfile, appendActivity, nowIso, isMainModule, ensureDirs, writeJsonAtomic } from './lib.mjs';

function readBaseCv() {
  if (!fs.existsSync(paths.baseCv)) {
    const msg =
      'Base CV not found at data/cv/base.md — paste your CV there (Settings → Base CV in the dashboard) before tailoring can run.';
    appendActivity({ phase: 'tailor', level: 'bad', message: msg });
    throw new Error(msg);
  }
  return fs.readFileSync(paths.baseCv, 'utf8');
}

/** Split base CV into (header, summarySection, experienceSection, skillsSection, other). */
function splitCv(md) {
  const sections = {};
  const lines = md.split('\n');
  let current = '_header';
  let buf = [];
  for (const line of lines) {
    const h = line.match(/^##\s+(.*)$/);
    if (h) {
      sections[current] = buf.join('\n').trim();
      current = h[1].trim().toLowerCase();
      buf = [];
    } else {
      buf.push(line);
    }
  }
  sections[current] = buf.join('\n').trim();
  return sections;
}

function pickSection(sections, ...names) {
  for (const n of names) {
    const key = Object.keys(sections).find((k) => k.startsWith(n));
    if (key && sections[key]) return sections[key];
  }
  return '';
}

function firstBullets(section, max = 3) {
  return section
    .split('\n')
    .filter((l) => /^\s*[-*•]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*•]\s+/, '').trim())
    .slice(0, max);
}

function focusFor(title) {
  const t = title.toLowerCase();
  if (/agent|agentic|automation|orchestrat|workflow/.test(t)) return 'agent and automation work';
  if (/solutions|architect/.test(t)) return 'architecture and solutions work';
  if (/forward deployed|field/.test(t)) return 'customer-facing AI delivery';
  if (/product/.test(t)) return 'product-minded engineering';
  if (/platform|llmops|mlops|infra|reliab/.test(t)) return 'platform and reliability engineering';
  if (/research|scientist/.test(t)) return 'applied research';
  return 'AI and software engineering';
}

/**
 * Build a truthful, role-specific CV markdown for a job.
 * Only reuses facts from the base CV.
 */
export function buildTailoredCv(job, profile, baseCv) {
  const sections = splitCv(baseCv);
  const experience = pickSection(sections, 'experience', 'work experience', 'employment');
  const skills = pickSection(sections, 'skills', 'technologies', 'tech stack');
  const education = pickSection(sections, 'education');
  const baseSummary = pickSection(sections, 'summary', 'about', 'profile');
  const bullets = firstBullets(baseSummary + '\n' + experience, 3);

  const name = profile?.fullName || 'Your Name';
  const headline = profile?.headline || 'Engineer';
  const focus = focusFor(job.title);
  const reasons = (job.reasons ?? []).slice(0, 3);

  const summarySentences = [
    `${headline} with a focus on ${focus}.`,
    ...bullets.map((b) => b.replace(/\.?\s*$/, '.')),
  ].join(' ');

  const whyLines = reasons.length
    ? reasons.map((r) => `- ${r}`)
    : ['- Scored as a strong fit for this role.'];

  const footer = `---\n*Tailored for **${job.title}** at ${job.company} — ${job.matchPct ?? '—'}% match, grade ${job.grade ?? '—'}. Generated from your base CV; no facts were added.*`;

  return [
    `# ${name}`,
    '',
    profile?.email ? `${profile.email}` : '',
    [profile?.phone, profile?.location].filter(Boolean).join(' · '),
    [profile?.linkedin, profile?.github, profile?.portfolio].filter(Boolean).join(' · '),
    '',
    `## Summary — tailored for ${job.title}`,
    '',
    summarySentences,
    '',
    `## Why ${job.company}`,
    '',
    ...whyLines,
    '',
    '## Experience',
    '',
    experience || '_Add your experience to the base CV so it can be carried into tailored versions._',
    '',
    ...(skills ? ['## Skills', '', skills, ''] : []),
    ...(education ? ['## Education', '', education, ''] : []),
    footer,
  ]
    .filter((l, i) => !(l === '' && i > 0 && false))
    .join('\n');
}

/**
 * Tailor CVs for the strongest scored jobs that don't have one yet.
 * @param {number} limit
 * @param {{skipPdf?: boolean}} opts
 */
export async function tailorAuto(limit = 8, { skipPdf = false } = {}) {
  ensureDirs();
  const baseCv = readBaseCv();
  const profile = loadProfile();
  const jobs = getJobs();
  const candidates = jobs
    .filter((j) => (j.grade === 'A' || j.grade === 'B') && j.status === 'scored' && !j.cvPath)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);

  let made = 0;
  for (const job of candidates) {
    const md = buildTailoredCv(job, profile, baseCv);
    // ":" is not a valid filename character on Windows → "__"
    const rel = `${job.id.replace(/:/g, '__')}.md`;
    fs.mkdirSync(paths.cv, { recursive: true });
    fs.writeFileSync(path.join(paths.cv, rel), md);

    let pdfRel = undefined;
    if (!skipPdf) {
      try {
        const { renderPdf } = await import('./render-pdf.mjs');
        const r = await renderPdf(job.id);
        if (r.ok) pdfRel = r.relPath;
      } catch {
        /* PDF is best-effort; Markdown always works */
      }
    }

    job.status = 'cv_ready';
    job.cvPath = rel;
    job.pdfPath = pdfRel;
    job.updatedAt = nowIso();
    made++;
    appendActivity({
      phase: 'tailor',
      level: 'good',
      company: job.company,
      jobId: job.id,
      message: `Tailored CV ready for ${job.title} at ${job.company} (${job.matchPct}% match)`,
      grade: job.grade,
    });
  }

  if (made > 0) saveJobs(jobs);
  return { made };
}

if (isMainModule(import.meta.url)) {
  tailorAuto(8)
    .then((r) => console.log(JSON.stringify(r)))
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    });
}
