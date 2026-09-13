// Karmendra AI Job Hunter — deterministic A–F scoring engine.
// Scores jobs with status "new" against the profile's target roles. Later, a Claude
// review pass may refine strong matches with actual CV-vs-job judgment.
//
// Grade thresholds:  A >= 4.5, B >= 4.0, C >= 3.3, D >= 2.6, E >= 1.8, F < 1.8
import { getJobs, saveJobs, loadProfile, loadCompanies, appendActivity, nowIso, stableHash, isMainModule } from './lib.mjs';
import { buildKeywords } from './scan.mjs';

const SENIORITY_WORDS = ['senior', 'staff', 'principal', 'lead', 'head of'];
const REMOTE_WORDS = ['remote', 'hybrid', 'global', 'worldwide', 'anywhere', 'uk remote', 'us remote'];

export function gradeFor(score) {
  if (score >= 4.5) return 'A';
  if (score >= 4.0) return 'B';
  if (score >= 3.3) return 'C';
  if (score >= 2.6) return 'D';
  if (score >= 1.8) return 'E';
  return 'F';
}

/** Map 1.0–5.0 to a human match percentage (~25%–90%). */
export function matchPctFor(score) {
  const pct = 25 + (Math.min(5, Math.max(1, score)) - 1) * 16.25;
  return Math.round(pct);
}

const ARCHETYPES = [
  { name: 'Agentic / Automation', test: (t) => /agent|agentic|automation|orchestrat|workflow/.test(t) },
  { name: 'AI Forward Deployed', test: (t) => /forward deployed|forward-deployed|field engineering|solutions engineering/.test(t) },
  { name: 'AI Solutions Architect', test: (t) => /solutions architect|solution architect/.test(t) },
  { name: 'Technical AI PM', test: (t) => /product manager|pm|product lead|group product/.test(t) },
  { name: 'AI Platform / LLMOps', test: (t) => /platform|mlops|llmops|infrastructure|infra\b|sre|reliability/.test(t) },
];

export function archetypeFor(title) {
  const t = title.toLowerCase();
  for (const a of ARCHETYPES) if (a.test(t)) return a.name;
  return 'AI / Engineering';
}

/**
 * Pure scoring heuristic (also used by the seeder for deterministic demo data).
 * @param {object} job
 * @param {object} profile
 * @param {Array} companies
 * @returns {{score:number, grade:string, matchPct:number, archetype:string, rationale:string, reasons:string[], gaps:string[], legitimacy:string}}
 */
export function scoreJob(job, profile, companies) {
  const targetRoles = (profile?.targetRoles ?? []).map((r) => r.toLowerCase().trim()).filter(Boolean);
  const keywords = buildKeywords(profile?.targetRoles ?? []);
  const t = (job.title ?? '').toLowerCase();
  const loc = (job.location ?? '').toLowerCase();

  let score = 2.5;
  const reasons = [];
  const gaps = [];

  // 1. Strong target-role phrase match.
  let roleHit = null;
  for (const role of targetRoles) {
    if (role && t.includes(role)) { roleHit = role; break; }
  }
  if (roleHit) {
    score += 1.2;
    reasons.push(`Title matches your target role “${roleHit}”`);
  }

  // 2. Useful title-token matches.
  let tokenHits = 0;
  for (const kw of keywords) {
    if (kw.length <= 3 ? new RegExp(`\\b${kw}\\b`).test(t) : t.includes(kw)) tokenHits++;
  }
  if (tokenHits >= 2) {
    score += Math.min(0.8, 0.2 * (tokenHits - 1));
    reasons.push(`${tokenHits} target keywords present in the title`);
  }

  // 3. Seniority when it looks like a senior-ish target.
  const seniorTarget = targetRoles.some((r) => /senior|staff|principal|lead|architect/.test(r));
  const seniorTitle = SENIORITY_WORDS.some((w) => t.includes(w));
  if (seniorTarget && seniorTitle) {
    score += 0.2;
    reasons.push('Seniority level matches your targets');
  } else if (!seniorTitle && /intern|junior|entry level|graduate/.test(t)) {
    score -= 0.3;
    gaps.push('Junior-level role — below your target seniority');
  }

  // 4. Location.
  if (REMOTE_WORDS.some((w) => loc.includes(w))) {
    score += 0.3;
    reasons.push(`${job.location} — remote/hybrid friendly`);
  } else if (loc && loc !== 'unknown') {
    gaps.push(`Onsite location: ${job.location}`);
  }

  // 5. Salary presence.
  if (job.salary && (job.salary.min || job.salary.max)) {
    score += 0.2;
    reasons.push(`Published salary range (${job.salary.currency})`);
  } else {
    gaps.push('No salary published — worth asking in the first call');
  }

  // 6. Stable per-job variation so repeated runs are deterministic but not uniform.
  const v = (stableHash(job.id) - 0.5) * 0.3; // ±0.15
  score = Math.min(5, Math.max(1, score + v));

  // Companies the user disabled are capped rather than hidden.
  const blocked = (companies ?? []).some((c) => c.name === job.company && c.enabled === false);
  if (blocked) score = Math.min(score, 2.4);

  const grade = gradeFor(score);
  const matchPct = matchPctFor(score);
  const archetype = archetypeFor(job.title);

  if (roleHit) {
    reasons.unshift(`Aligned with target: ${roleHit}`);
  }

  const rationale = roleHit
    ? `Strong alignment with “${roleHit}” plus ${reasons.filter(Boolean).length - 1} supporting signal${reasons.filter(Boolean).length - 1 === 1 ? '' : 's'} (remote-friendly, salary, keywords).`
    : `Moderate fit: ${archetype.toLowerCase()} work with ${matchPct}% estimated overlap with your profile.`;

  // Legitimacy: board-sourced records default to high unless something looks off.
  let legitimacy = 'high';
  if (/contract|freelance|1099|consultant/.test(t)) {
    legitimacy = 'caution';
    gaps.push('Looks contract/freelance — verify employment type');
  }

  return { score: Math.round(score * 100) / 100, grade, matchPct, archetype, rationale, reasons: reasons.slice(0, 6), gaps: gaps.slice(0, 4), legitimacy };
}

/**
 * Score every job currently in status "new".
 * @returns {Promise<{scored: number, top?: object}>}
 */
export async function score() {
  const profile = (await import('./lib.mjs')).loadProfile();
  const companies = (await import('./lib.mjs')).loadCompanies();
  const jobs = getJobs();
  let scored = 0;
  let topA = null;

  for (const job of jobs) {
    if (job.status !== 'new') continue;
    const r = scoreJob(job, profile, companies);
    Object.assign(job, r, { status: 'scored', updatedAt: nowIso() });
    scored++;
    if (r.grade === 'A' && (!topA || r.score > topA.score)) topA = { job, ...r };
  }

  if (scored > 0) {
    saveJobs(jobs);
    const counts = {};
    for (const j of jobs) if (j.status === 'scored') counts[j.grade] = (counts[j.grade] ?? 0) + 1;
    appendActivity({
      phase: 'score',
      level: topA ? 'good' : 'info',
      message: `Scored ${scored} role(s) — A:${counts.A ?? 0} B:${counts.B ?? 0} C:${counts.C ?? 0} D:${counts.D ?? 0} E:${counts.E ?? 0} F:${counts.F ?? 0}`,
    });
    if (topA) {
      appendActivity({
        phase: 'score',
        level: 'good',
        grade: 'A',
        company: topA.job.company,
        jobId: topA.job.id,
        message: `Top match: ${topA.job.title} at ${topA.job.company} — ${topA.matchPct}% match`,
      });
    }
  }

  return { scored, top: topA };
}

if (isMainModule(import.meta.url)) {
  score().then((r) => console.log(JSON.stringify(r, null, 2)));
}
