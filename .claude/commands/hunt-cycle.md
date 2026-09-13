---
description: Run one Karmendra AI Job Hunter cycle with a Claude review pass
---

You are operating the Karmendra AI Job Hunter in this repository. Run exactly ONE hunt cycle and stop.

Steps:
1. Run the engine cycle:
   `node engine/cycle.mjs --force`
   It processes dashboard commands, scans enabled public boards (Greenhouse/Lever), scores new jobs A–F, and tailors truthful CVs for grade A/B matches.

2. Inspect the results in `data/state/jobs.json` and `data/log/activity.jsonl`:
   - For each newly scored A/B job, read the full job record (title, location, salary, URL, reasons, gaps) and compare it against the ACTUAL base CV in `data/cv/base.md`.
   - You may refine `reasons`, `gaps`, `score`, `grade`, `matchPct`, and `rationale` ONLY when backed by evidence in the base CV or the job record. Never invent experience, employers, metrics, or company facts.
   - If a tailored CV in `data/cv/<jobId>.md` contains any claim not present in `data/cv/base.md`, remove the invented part (never add facts).

3. Self-review gate before any application step:
   - Never submit when `profile.isDemo` is true in `data/config/profile.json`.
   - Respect `prefs.minScore`, `prefs.dailyCap`, and `prefs.perCompanyCap`.
   - Never bypass CAPTCHAs, login walls, or email verification. Unknown or legal questions are parked (`needs_you`), never guessed.
   - If `prefs.liveApply` is false (the default), the apply engine runs dry only.

4. Stop after this single cycle. Do not loop, do not start a second cycle, and do not change unrelated files.

When done, summarize in a few lines: boards swept, new jobs, A/B matches, CVs written, anything parked for human review.
