// Karmendra AI Job Hunter — tiny manual helpers.
//   node engine/mark.mjs cv <jobId>
//   node engine/mark.mjs applied <jobId>
//   node engine/mark.mjs park <jobId> <reason> "<note>"
import { updateJob, getJobs, nowIso, appendActivity } from './lib.mjs';

const [cmd, jobId, reason, note] = process.argv.slice(2);

if (!cmd || !jobId) {
  console.log('Usage: node engine/mark.mjs <cv|applied|park> <jobId> [reason] [note]');
  process.exit(1);
}

const jobs = getJobs();
const job = jobs.find((j) => j.id === jobId);
if (!job) {
  console.error(`No job with id "${jobId}"`);
  process.exit(1);
}

if (cmd === 'cv') {
  updateJob(jobId, { status: 'cv_ready' });
} else if (cmd === 'applied') {
  updateJob(jobId, { status: 'applied', appliedAt: nowIso() });
} else if (cmd === 'park') {
  updateJob(jobId, { status: 'needs_you', parkedReason: reason || 'unknown_form', parkedNote: note || 'Parked manually' });
} else {
  console.error(`Unknown command "${cmd}" (use cv | applied | park)`);
  process.exit(1);
}

appendActivity({ phase: 'command', level: 'info', jobId, message: `Manual mark: ${cmd} ${jobId}` });
console.log(`Marked ${jobId} → ${cmd === 'applied' ? 'applied' : cmd === 'cv' ? 'cv_ready' : 'needs_you'}`);
