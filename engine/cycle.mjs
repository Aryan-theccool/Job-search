// Karmendra AI Job Hunter — one full hunt cycle.
// commands → (autonomy gate) → scan → score → tailor → run record → optional apply spawn.
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import {
  DATA_DIR, paths, loadPrefs, loadProfile, getJobs, addRun,
  appendActivity, newId, nowIso, isMainModule, ensureDirs,
} from './lib.mjs';
import { processCommands } from './commands.mjs';
import { scan } from './scan.mjs';
import { score } from './score.mjs';
import { tailorAuto } from './tailor.mjs';

const LOCK_FILE = path.join(DATA_DIR, '.cycle-lock');
const LOCK_TTL_MS = 6 * 60 * 1000;

/**
 * Run one cycle.
 * @param {{force?: boolean}} opts
 */
export async function cycle({ force = false } = {}) {
  ensureDirs();
  const started = nowIso();
  const startedAt = Date.now();

  // 1. Dashboard commands first.
  const cmds = await processCommands();
  const wantScan = cmds.wantScan;

  // 2. Autonomy gate: only proceed when forced, commanded, or autonomy on.
  const prefs = loadPrefs();
  if (!prefs.autonomy && !force && !wantScan) {
    appendActivity({ phase: 'run', level: 'info', message: 'Cycle skipped — autonomy is off and nothing was requested' });
    return { skipped: true };
  }

  const profile = loadProfile();
  appendActivity({ phase: 'run', level: 'info', message: `Hunt cycle started${force ? ' (forced)' : ''}` });

  // 3. Scan + score.
  const scanRes = await scan();
  const scoreRes = await score();

  // 4. Tailor CVs (best effort) for strong matches.
  let cvs = 0;
  if (prefs.autonomy && !profile?.isDemo) {
    try {
      cvs = (await tailorAuto(8)).made;
    } catch (err) {
      appendActivity({ phase: 'tailor', level: 'warn', message: `Tailoring skipped: ${String(err?.message ?? err).split('\n')[0]}` });
    }
  }

  // 5. Run record.
  const jobs = getJobs();
  const today = nowIso().slice(0, 10);
  const run = {
    id: newId('run'),
    startedAt: started,
    endedAt: nowIso(),
    boards: scanRes.boards,
    newJobs: scanRes.newJobs,
    scored: scoreRes.scored,
    cvs,
    applied: jobs.filter((j) => j.status === 'applied' && (j.appliedAt ?? '').slice(0, 10) === today).length,
    parked: jobs.filter((j) => j.status === 'needs_you').length,
    durationMs: Date.now() - startedAt,
  };
  addRun(run);

  appendActivity({
    phase: 'run',
    level: 'good',
    message: `Hunt cycle done — ${run.boards} boards, ${run.newJobs} new, ${run.scored} scored, ${run.cvs} CVs, ${run.parked} parked`,
  });

  // 6. Kick off application prep (detached) when allowed.
  let applySpawned = false;
  if (prefs.autonomy && prefs.autoSubmit && !profile?.isDemo) {
    const live = !!prefs.liveApply;
    const child = spawn(process.execPath, [path.join(__dirname_safe(), 'apply.mjs'), ...(live ? ['--live'] : [])], {
      detached: true,
      stdio: 'ignore',
      cwd: path.dirname(DATA_DIR),
    });
    child.unref();
    applySpawned = true;
    appendActivity({
      phase: 'apply',
      level: live ? 'warn' : 'info',
      message: live ? 'Apply engine spawned in LIVE mode' : 'Apply engine spawned in dry-run mode',
    });
  }

  return { skipped: false, ...run, applySpawned };
}

function __dirname_safe() {
  // engine/ dir resolved from the data dir (robust to cwd changes)
  return path.join(path.dirname(DATA_DIR), 'engine');
}

const isForced = process.argv.includes('--force');
if (isMainModule(import.meta.url)) {
  cycle({ force: isForced })
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((err) => {
      appendActivity({ phase: 'run', level: 'bad', message: `Cycle crashed: ${String(err?.message ?? err).split('\n')[0]}` });
      console.error(err);
      process.exitCode = 1;
    });
}
