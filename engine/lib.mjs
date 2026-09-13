// Karmendra AI Job Hunter — engine shared helpers.
// All engine <-> dashboard communication happens through files under data/.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Shared data directory. Override with FABJOB_DATA_DIR if the layout changes. */
export const DATA_DIR = process.env.FABJOB_DATA_DIR
  ? path.resolve(process.env.FABJOB_DATA_DIR)
  : path.join(__dirname, '..', 'data');

export const paths = {
  config: path.join(DATA_DIR, 'config'),
  state: path.join(DATA_DIR, 'state'),
  log: path.join(DATA_DIR, 'log'),
  queue: path.join(DATA_DIR, 'queue'),
  cv: path.join(DATA_DIR, 'cv'),
  screens: path.join(DATA_DIR, 'log', 'screens'),
  profile: path.join(DATA_DIR, 'config', 'profile.json'),
  prefs: path.join(DATA_DIR, 'config', 'prefs.json'),
  companies: path.join(DATA_DIR, 'config', 'companies.json'),
  jobs: path.join(DATA_DIR, 'state', 'jobs.json'),
  runs: path.join(DATA_DIR, 'state', 'runs.json'),
  activity: path.join(DATA_DIR, 'log', 'activity.jsonl'),
  commands: path.join(DATA_DIR, 'queue', 'commands.jsonl'),
  baseCv: path.join(DATA_DIR, 'cv', 'base.md'),
};

export function ensureDirs() {
  for (const dir of [DATA_DIR, paths.config, paths.state, paths.log, paths.queue, paths.cv, paths.screens]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function readJsonl(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const out = [];
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      try {
        out.push(JSON.parse(t));
      } catch {
        /* skip corrupt line */
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Atomic write with retry on transient rename/lock errors (Windows + FS quirks). */
export function writeJsonAtomic(file, data, { retries = 4 } = {}) {
  ensureDirs();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
      try { fs.rmSync(file, { force: true }); } catch { /* ignore */ }
      fs.renameSync(tmp, file);
      return;
    } catch (err) {
      lastErr = err;
      try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ }
      // Small backoff for transient EBUSY/EPERM/EACCES
      const wait = 60 * (i + 1);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait);
    }
  }
  throw lastErr;
}

export function appendJsonl(file, obj) {
  ensureDirs();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(obj) + '\n');
}

export function newId(prefix = '') {
  const s = crypto.randomBytes(6).toString('hex');
  return prefix ? `${prefix}_${s}` : s;
}

export function nowIso() {
  return new Date().toISOString();
}

export function stableHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295; // 0..1
}

/* ---------------- activity ---------------- */

export function appendActivity({ phase = 'system', level = 'info', message, company, jobId, grade }) {
  const evt = { id: newId('evt'), ts: nowIso(), phase, level, message, company, jobId, grade };
  appendJsonl(paths.activity, evt);
  return evt;
}

export function getActivity(limit = 200) {
  const all = readJsonl(paths.activity);
  return all.slice(-limit).reverse(); // newest first
}

/* ---------------- jobs ---------------- */

export function getJobs() {
  return readJson(paths.jobs, []);
}

export function saveJobs(jobs) {
  writeJsonAtomic(paths.jobs, jobs);
}

export function updateJob(jobId, patch) {
  const jobs = getJobs();
  const idx = jobs.findIndex((j) => j.id === jobId);
  if (idx === -1) return null;
  jobs[idx] = { ...jobs[idx], ...patch, updatedAt: nowIso() };
  saveJobs(jobs);
  return jobs[idx];
}

/* ---------------- runs ---------------- */

export function addRun(run) {
  const runs = readJson(paths.runs, []);
  runs.push(run);
  // keep the 30 most recent
  writeJsonAtomic(paths.runs, runs.slice(-30));
  return run;
}

export function getRuns() {
  return readJson(paths.runs, []);
}

/* ---------------- config ---------------- */

export function loadProfile() {
  return readJson(paths.profile, null);
}

export function loadPrefs() {
  return readJson(paths.prefs, null);
}

export function loadCompanies() {
  return readJson(paths.companies, []);
}

/* ---------------- commands ---------------- */

export function queueCommand(type, { jobId, payload } = {}) {
  const cmd = { id: newId('cmd'), ts: nowIso(), type, jobId, payload: payload ?? {} };
  appendJsonl(paths.commands, cmd);
  return cmd;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Call as isMainModule(import.meta.url) from the entry file. */
export function isMainModule(selfUrl = import.meta.url) {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return path.resolve(entry) === fileURLToPath(selfUrl);
  } catch {
    return false;
  }
}
