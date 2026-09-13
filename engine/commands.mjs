// Karmendra AI Job Hunter — command queue processor.
// Reads data/queue/commands.jsonl, processes commands not yet marked done,
// marks them done, and appends activity.
import { paths, readJsonl, writeJsonAtomic, updateJob, loadPrefs, loadCompanies, newId, nowIso, appendActivity, queueCommand, isMainModule, ensureDirs, sleep } from './lib.mjs';

export const ALLOWED_COMMANDS = [
  'discard', 'mark_applied', 'scan_now', 'pause', 'resume',
  'save_prefs', 'save_company', 'park', 'mark_cv', 'mark_status',
];

function isDone(cmd) {
  return !!cmd?.done;
}

/**
 * Process pending commands.
 * @returns {Promise<{processed: number, wantScan: boolean, paused?: boolean, resumed?: boolean}>}
 */
export async function processCommands() {
  ensureDirs();
  const all = readJsonl(paths.commands);
  const pending = all.filter((c) => !isDone(c));
  let wantScan = false;
  let paused;
  let resumed;
  let processed = 0;

  for (const cmd of pending) {
    try {
      switch (cmd.type) {
        case 'discard':
          if (cmd.jobId) {
            updateJob(cmd.jobId, { status: 'discarded', parkedReason: cmd.payload?.reason || undefined });
            appendActivity({ phase: 'command', level: 'info', jobId: cmd.jobId, message: `Discarded ${cmd.jobId}` });
          }
          break;
        case 'mark_applied':
          if (cmd.jobId) {
            updateJob(cmd.jobId, { status: 'applied', appliedAt: nowIso() });
            appendActivity({ phase: 'command', level: 'good', jobId: cmd.jobId, message: `Marked applied: ${cmd.jobId}` });
          }
          break;
        case 'scan_now':
          wantScan = true;
          appendActivity({ phase: 'command', level: 'info', message: 'Dashboard requested a scan' });
          break;
        case 'pause':
          paused = true;
          appendActivity({ phase: 'command', level: 'info', message: 'Autonomy paused from dashboard' });
          break;
        case 'resume':
          resumed = true;
          appendActivity({ phase: 'command', level: 'info', message: 'Autonomy resumed from dashboard' });
          break;
        case 'save_prefs':
          if (cmd.payload) {
            const prefs = loadPrefs();
            const next = { ...(prefs ?? {}), ...cmd.payload, updatedAt: nowIso() };
            writeJsonAtomic(paths.prefs, next);
            appendActivity({ phase: 'command', level: 'info', message: 'Preferences updated from dashboard' });
          }
          break;
        case 'save_company':
          if (cmd.payload?.name && cmd.payload?.token && cmd.payload?.ats) {
            const companies = loadCompanies();
            const idx = companies.findIndex((c) => c.ats === cmd.payload.ats && c.token === cmd.payload.token);
            const rec = {
              name: cmd.payload.name,
              ats: cmd.payload.ats,
              token: cmd.payload.token,
              careersUrl: cmd.payload.careersUrl || undefined,
              enabled: cmd.payload.enabled !== false,
            };
            if (idx === -1) companies.push(rec);
            else companies[idx] = { ...companies[idx], ...rec };
            writeJsonAtomic(paths.companies, companies);
            appendActivity({ phase: 'command', level: 'info', message: `Company saved: ${rec.name}` });
          }
          break;
        case 'park':
          if (cmd.jobId) {
            updateJob(cmd.jobId, {
              status: 'needs_you',
              parkedReason: cmd.payload?.reason || 'unknown_form',
              parkedNote: cmd.payload?.note || 'Parked manually',
            });
            appendActivity({ phase: 'command', level: 'warn', jobId: cmd.jobId, message: `Parked manually: ${cmd.jobId}` });
          }
          break;
        case 'mark_cv':
          if (cmd.jobId) updateJob(cmd.jobId, { status: 'cv_ready' });
          break;
        case 'mark_status':
          if (cmd.jobId && cmd.payload?.status) {
            updateJob(cmd.jobId, { status: cmd.payload.status, appliedAt: cmd.payload.status === 'applied' ? nowIso() : undefined });
            appendActivity({ phase: 'command', level: 'info', jobId: cmd.jobId, message: `Status set to ${cmd.payload.status}` });
          }
          break;
        default:
          appendActivity({ phase: 'command', level: 'warn', message: `Unknown command type ignored: ${cmd.type}` });
      }
      cmd.done = true;
      cmd.doneAt = nowIso();
      processed++;
    } catch (err) {
      appendActivity({ phase: 'command', level: 'bad', message: `Command failed (${cmd.type}): ${String(err?.message ?? err).split('\n')[0]}` });
    }
    await sleep(20);
  }

  if (processed > 0) writeJsonAtomic(paths.commands, all);
  return { processed, wantScan, paused, resumed };
}

if (isMainModule(import.meta.url)) {
  processCommands().then((r) => console.log(JSON.stringify(r, null, 2)));
}
