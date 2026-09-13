// Karmendra AI Job Hunter — scanner.
// Loads enabled companies from data/config/companies.json, pulls their public ATS feeds,
// keeps roles relevant to your target list, dedupes by stable id, and prepends fresh jobs
// to data/state/jobs.json with status "new".
import { paths, loadCompanies, loadProfile, getJobs, saveJobs, appendActivity, sleep, isMainModule, ensureDirs, nowIso, readJson, writeJsonAtomic } from './lib.mjs';
import * as greenhouse from './providers/greenhouse.mjs';
import * as lever from './providers/lever.mjs';
import * as ashby from './providers/ashby.mjs';
import * as workable from './providers/workable.mjs';

const PROVIDERS = {
  greenhouse,
  lever,
  ashby,
  workable,
};

const DEFAULT_KEYWORDS = [
  'ai', 'ml', 'llm', 'agent', 'agents', 'engineer', 'developer', 'product', 'data',
  'platform', 'solutions', 'automation', 'architect', 'analyst', 'manager', 'scientist',
  'research', 'growth', 'marketing', 'content', 'operations', 'strategy', 'designer',
];

const EXCLUDE_WORDS = ['intern', 'co-op', 'coop', 'apprentice', 'summer program'];

/** Build keyword list from target roles + useful defaults. */
export function buildKeywords(targetRoles = []) {
  const set = new Set(DEFAULT_KEYWORDS);
  for (const role of targetRoles) {
    const r = role.toLowerCase().trim();
    if (!r) continue;
    set.add(r);
    for (const tok of r.split(/\s+/)) if (tok.length > 2) set.add(tok);
  }
  return [...set];
}

export function isExcluded(title) {
  const t = title.toLowerCase();
  return EXCLUDE_WORDS.some((w) => t.includes(w));
}

function lastSegment(url) {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || u.host);
  } catch {
    return url;
  }
}

function relevant(title, keywords, targetRoles) {
  const t = title.toLowerCase();
  // Strong signal: exact target-role phrase in the title.
  for (const role of targetRoles) {
    const r = role.toLowerCase().trim();
    if (r && t.includes(r)) return true;
  }
  // Otherwise require at least one keyword token (word-boundary for short ones).
  for (const kw of keywords) {
    if (kw.length <= 3) {
      if (new RegExp(`\\b${kw}\\b`, 'i').test(t)) return true;
    } else if (t.includes(kw)) {
      return true;
    }
  }
  return false;
}

const MAX_RELEVANT_PER_COMPANY = 25;

/**
 * Run one scan pass over all enabled boards.
 * @returns {Promise<{boards: number, newJobs: number, errors: string[]}>}
 */
export async function scan() {
  ensureDirs();
  const companies = loadCompanies().filter((c) => c.enabled);
  const profile = loadProfile();
  const targetRoles = profile?.targetRoles ?? [];
  const keywords = buildKeywords(targetRoles);
  const jobs = getJobs();
  const known = new Set(jobs.map((j) => j.id));
  const fresh = [];
  const errors = [];
  const unreachable = [];
  let boards = 0;

  for (const entry of companies) {
    const provider = PROVIDERS[entry.ats];
    if (!provider) {
      errors.push(`${entry.name}: no provider for ATS "${entry.ats}"`);
      continue;
    }
    boards++;
    let list;
    try {
      list = await provider.fetch(entry, { targetRoles, keywords });
    } catch (err) {
      errors.push(`${entry.name}: ${err?.message ?? 'fetch failed'}`);
      continue;
    }
    if (list === null) {
      unreachable.push(entry.name);
      await sleep(250 + Math.random() * 250);
      continue;
    }
    if (!Array.isArray(list) || list.length === 0) {
      errors.push(`${entry.name}: board returned no roles (token may be invalid)`);
      await sleep(250 + Math.random() * 250);
      continue;
    }
    let relevantCount = 0;
    for (const raw of list) {
      if (relevantCount >= MAX_RELEVANT_PER_COMPANY) break;
      const title = (raw.title ?? '').trim();
      if (!title || isExcluded(title)) continue;
      if (!relevant(title, keywords, targetRoles)) continue;
      const id = `${entry.ats}:${entry.token}:${lastSegment(raw.url)}`;
      if (known.has(id)) continue;
      known.add(id);
      relevantCount++;
      fresh.push({
        id,
        company: entry.name,
        title,
        url: raw.url,
        location: raw.location || 'Unknown',
        ats: entry.ats,
        boardToken: entry.token,
        postedAt: raw.postedAt || undefined,
        discoveredAt: nowIso(),
        updatedAt: nowIso(),
        status: 'new',
        salary: raw.salary || undefined,
      });
    }
    await sleep(350 + Math.random() * 450); // be polite between boards
  }

  if (fresh.length) {
    saveJobs([...fresh, ...jobs]);
  }

  const msg =
    fresh.length > 0
      ? `Scan complete — ${boards} boards swept, ${fresh.length} new role(s) found`
      : `Scan complete — ${boards} boards swept, no new relevant roles`;
  appendActivity({ phase: 'scan', level: fresh.length > 0 ? 'good' : 'info', message: msg });
  if (unreachable.length > 0) {
    const names = unreachable.slice(0, 5).join(', ') + (unreachable.length > 5 ? ` +${unreachable.length - 5} more` : '');
    appendActivity({ phase: 'scan', level: 'warn', message: `${unreachable.length} board(s) unreachable this pass (${names}) — skipped gracefully` });
  }
  for (const e of errors) {
    appendActivity({ phase: 'scan', level: 'warn', message: e });
  }
  return { boards, newJobs: fresh.length, errors, unreachable };
}

if (isMainModule(import.meta.url)) {
  scan().then((r) => {
    console.log(JSON.stringify(r, null, 2));
  });
}
