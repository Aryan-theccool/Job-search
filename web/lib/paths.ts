// Resolve the shared data directory.
// FABJOB_DATA_DIR wins when provided; otherwise data/ sits next to web/ (repo root).
import path from 'node:path';

export const DATA_DIR = process.env.FABJOB_DATA_DIR
  ? path.resolve(process.env.FABJOB_DATA_DIR)
  : path.resolve(process.cwd(), '..', 'data');

export const P = {
  config: path.join(DATA_DIR, 'config'),
  state: path.join(DATA_DIR, 'state'),
  log: path.join(DATA_DIR, 'log'),
  queue: path.join(DATA_DIR, 'queue'),
  cvDir: path.join(DATA_DIR, 'cv'),
  profile: path.join(DATA_DIR, 'config', 'profile.json'),
  prefs: path.join(DATA_DIR, 'config', 'prefs.json'),
  companies: path.join(DATA_DIR, 'config', 'companies.json'),
  jobs: path.join(DATA_DIR, 'state', 'jobs.json'),
  runs: path.join(DATA_DIR, 'state', 'runs.json'),
  activity: path.join(DATA_DIR, 'log', 'activity.jsonl'),
  commands: path.join(DATA_DIR, 'queue', 'commands.jsonl'),
  baseCv: path.join(DATA_DIR, 'cv', 'base.md'),
  cycleLock: path.join(DATA_DIR, '.cycle-lock'),
} as const;

/** Repo root (parent of the data directory) — where the engine lives. */
export const REPO_ROOT = path.dirname(DATA_DIR);
