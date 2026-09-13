# Karmendra AI Job Hunter

A local AI job-hunting system: a **Node.js engine** scans public company job boards (Greenhouse, Lever), scores roles against your profile with an A–F engine, tailors **truthful** per-job resumes, prepares (and optionally submits) applications with a Playwright browser, and a **Next.js dashboard** shows the whole workflow live.

Built to keep humans in control: dry-run is the default, CAPTCHAs are never bypassed, and anything the system can't answer safely is **parked in a Needs-You queue** instead of being guessed.

## How it works

```
ENGINE (Node.js)          SHARED DATA (JSON/JSONL)           DASHBOARD (Next.js :4319)
public ATS feeds ──> scanner ──> score (A–F) ──> tailor CV ──> apply / park ──> data/ ──> SSE live UI
commands queue <──────────────────────────────────────────────────────────────── commands
```

- **Engine and dashboard never call each other.** They only share files under `data/`.
- The dashboard streams changes over `/api/stream` (SSE) with a 1-second file-signature poll.

## Quick start

```bash
npm install              # engine deps (marked, playwright)
npx playwright install   # Chromium for the apply engine + CV→PDF
npm --prefix web install # dashboard deps

node engine/seed.mjs     # seed a demo dataset (demo profile blocks real submission)

npm --prefix web run dev # dashboard at http://localhost:4319
```

Open **http://localhost:4319** — you should see populated jobs, A–F scores, a live activity feed, the pipeline kanban, and a Needs-You queue.

> **Sandbox note:** if the public boards are unreachable from your network, the seeder falls back to a bundled realistic demo dataset (clearly marked in the activity feed). On a normal machine the seeder and the scanner use the real public feeds.

## Useful commands

```bash
npm run cycle            # node engine/cycle.mjs --force  → one full hunt cycle
npm run scan             # node engine/scan.mjs           → sweep boards only
npm run score            # node engine/score.mjs          → score new jobs only
npm run tailor           # node engine/tailor.mjs         → tailor CVs for A/B jobs
npm run apply            # node engine/apply.mjs          → DRY RUN (fills, never submits)
npm run apply:live       # node engine/apply.mjs --live   → real submit (only when prefs allow)
npm run seed             # node engine/seed.mjs           # (re)seed the demo dataset
node engine/mark.mjs applied <jobId>                      # manual status helpers
```

## Going from demo to your real profile

1. **Settings → Your profile**: paste your real identity, target roles, and compensation.
2. **Settings → Base CV**: paste your factual CV (Markdown). This is the single source of truth — the tailor only re-arranges what's here, it never invents facts.
3. **Settings → Truthful answers**: work authorization, sponsorship, notice period, salary expectation, EEO (defaults to “Decline to self-identify”), etc. Saving a real profile switches off demo mode.
4. **Companies**: add the boards you care about (Greenhouse/Lever tokens).
5. **Keep Live Apply OFF.** Turn Autonomy ON, run a few cycles, and inspect the dry-run screenshots and parked items.
6. Only after you trust the field mapping, consider enabling Live Apply.

## Adding companies

- Greenhouse board token: `https://boards-api.greenhouse.io/v1/boards/<token>/jobs`
- Lever board token: `https://api.lever.co/v0/postings/<token>?mode=json`

If a token stops working, disable the board instead of retrying a broken endpoint. Ashby/Workable are intentional stubs — only add a provider when you have a verified legitimate public feed.

## Dry run vs live

| Mode | What happens | Use when |
|---|---|---|
| **Demo** | Realistic jobs/pipeline; real submit blocked by `profile.isDemo` | UI testing |
| **Dry run** | Browser fills what it can, captures evidence, never presses final submit | Testing your real profile safely |
| **Live** | Clean forms are submitted when every safety check passes | Only after reviewing multiple dry runs |

A job is **parked** (Needs You) when there is a CAPTCHA, email verification, account wall, an unmapped required field, an ambiguous legal question, or an unclear submit result.

## Project layout

```
package.json            # engine deps + npm scripts (cycle/apply/seed/…)
engine/
  lib.mjs               # shared paths, JSON/JSONL helpers, activity, jobs, runs
  scan.mjs              # board scanner (dedupe by ats:token:url-segment)
  score.mjs             # deterministic A–F scoring + archetypes + reasons/gaps
  tailor.mjs            # truthful per-job CV (grade A/B only)
  render-pdf.mjs        # Markdown CV → print-friendly PDF (Playwright)
  apply.mjs             # browser apply engine (dry-run default, safety rails)
  commands.mjs          # dashboard command queue processor
  cycle.mjs             # one hunt cycle: commands → scan → score → tailor → apply?
  mark.mjs              # manual status helpers
  seed.mjs              # demo dataset seeder
  providers/            # greenhouse, lever (+ ashby/workable stubs, demo fallback)
data/
  config/               # profile.json, prefs.json, companies.json
  state/                # jobs.json, runs.json
  log/                  # activity.jsonl (+ dry-run screenshots)
  queue/                # commands.jsonl
  cv/                   # base.md + per-job tailored CVs (md/pdf)
web/                    # Next.js 16 dashboard (App Router + TS + Tailwind 4)
  app/                  # 6 pages + 9 API routes (SSE stream, run-cycle, …)
  components/           # UI kit + dashboard widgets
  lib/                  # typed flat-file data layer, live hooks
.claude/commands/       # /hunt-cycle slash command
```

## Troubleshooting

- **Dashboard not on 4319** — another process holds the port; stop it and rerun `npm --prefix web run dev`.
- **No jobs appear** — confirm `data/config/companies.json` has enabled sources with valid tokens; run `node engine/scan.mjs` directly and check `data/log/activity.jsonl`.
- **Playwright can't open a browser** — `npx playwright install chromium`.
- **Almost every job is parked** — that can be correct. Real application flows have login walls, CAPTCHAs, and verification steps. A conservative system parks rather than invents.
- **Dashboard not updating** — check `curl localhost:4319/api/state` returns JSON and `/api/stream` stays open; both the engine and `web/lib/paths.ts` must resolve the same `data/` folder (override with `FABJOB_DATA_DIR` if needed).
- **Dashboard looks empty after a fresh checkout/preview reset** — the `data/` state is local and regenerated. Run `npm run seed` or press **Load demo dataset** in Settings → Dataset to repopulate it (your base CV and profile are kept).

## Safety model (hard requirements)

1. Dry-run is the default; a dry run never presses final submit.
2. CAPTCHAs are never solved or bypassed — they are parked with a screenshot.
3. Legal/identity answers come only from your stored profile — never guessed.
4. Demo mode blocks all real submission.
5. Minimum score, daily cap, and per-company cap are always respected.
6. The CV tailor never fabricates experience, employers, metrics, or achievements.
