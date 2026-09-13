// Karmendra AI Job Hunter — browser application engine (Playwright Chromium).
//
// SAFETY RAILS (hard requirements):
// 1. Dry-run is the DEFAULT. A dry run may open and fill forms but never presses final submit.
// 2. CAPTCHAs are NEVER solved or bypassed. If detected → screenshot + park as needs_you/captcha.
// 3. Never invent work authorization, sponsorship, salary, start date, criminal disclosure,
//    clearance, EEO or other legal/identity answers. Only profile-stored values are used.
//    Any required question we cannot answer safely → park.
// 4. Never apply when profile.isDemo is true.
// 5. Respect minimum score, daily application cap, and per-company cap.
// 6. Pace actions with small randomized delays.
//
// CLI:  node engine/apply.mjs          → dry run
//       node engine/apply.mjs --live   → real submission only when prefs + profile allow it
import path from 'node:path';
import {
  paths, getJobs, saveJobs, loadProfile, loadPrefs, appendActivity,
  updateJob, newId, nowIso, isMainModule, ensureDirs, sleep,
} from './lib.mjs';

const LIVE = process.argv.includes('--live');

const DECLINE = 'Decline to self-identify';

/* ---------------- label mapping ---------------- */

// [regex, resolver(profile) => value|undefined]
const FIELD_MAP = [
  [/^first name\b|given name/i, (p) => p.firstName],
  [/^last name\b|surname|family name/i, (p) => p.lastName],
  [/^full name\b|your name|applicant name/i, (p) => p.fullName],
  [/^email\b|e-mail|work email/i, (p) => p.email],
  [/^phone\b|mobile|cell|tel/i, (p) => p.phone],
  [/^location\b|current location|city,? (and )?state|address/i, (p) => p.location],
  [/linkedin/i, (p) => p.linkedin],
  [/github/i, (p) => p.github],
  [/portfolio|personal (website|site|page)|website/i, (p) => p.portfolio],
  [/current (employer|company)/i, (p) => p.currentEmployer],
  [/current (title|role|position)/i, (p) => p.currentTitle],
  [/work authoriz|right to (work|employment)|eligible to work/i, (p) => (p.legal?.workAuthorized ? 'Yes' : 'No')],
  [/sponsorship|sponsored|visa (support|sponsorship)/i, (p) => (p.legal?.requiresSponsorship ? 'Yes' : 'No')],
  [/relocat/i, (p) => p.legal?.relocation],
  [/notice period/i, (p) => p.legal?.noticePeriod],
  [/salary (expect|requirement|desired)|expected (salary|compensation)|compensation/i, (p) => p.legal?.salaryExpectation],
  [/start date|availability date|earliest start/i, (p) => p.legal?.startDate],
  [/how did (you|'s) .* hear|referral source|referral code|referral/i, (p) => p.legal?.referralSource],
  [/criminal|background check|conviction/i, (p) => p.legal?.criminalDisclosure],
  [/gender/i, (p) => p.legal?.ee?.gender || DECLINE],
  [/race|ethnic|national origin/i, (p) => p.legal?.ee?.race || DECLINE],
  [/veteran/i, (p) => p.legal?.ee?.veteran || DECLINE],
  [/disabilit/i, (p) => p.legal?.ee?.disability || DECLINE],
  [/resume|cv\b|curriculum vitae/i, null], // file field, handled separately
];

const LEGAL_RE =
  /authoriz|sponsor|salary|compensation|start date|notice period|criminal|background|veteran|disabilit|gender|race|ethnic|relocat|immigrat|visa|right to work/i;

function labelFor(page, el) {
  return page.evaluate((elIdx) => {
    const el = document.querySelectorAll('input, textarea, select')[elIdx];
    if (!el) return '';
    const aria = el.getAttribute('aria-label');
    if (aria) return aria;
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l?.textContent) return l.textContent;
    }
    const wrap = el.closest('label');
    if (wrap?.textContent) return wrap.textContent;
    const legend = el.closest('fieldset')?.querySelector('legend')?.textContent;
    if (legend) return legend;
    if (el.placeholder) return el.placeholder;
    return el.name || '';
  }, elIdx);
}

async function detectCaptcha(page) {
  try {
    return await page.evaluate(() => {
      const iframes = [...document.querySelectorAll('iframe')].map((f) => f.src || '').join(' ');
      if (/recaptcha|hcaptcha|datadome|geetest|arkoselabs|funCaptcha/i.test(iframes)) return true;
      const body = document.body?.innerText || '';
      return /i am not a robot|type the characters|verify you are human|captcha/i.test(body);
    });
  } catch {
    return false;
  }
}

async function detectLoginWall(page) {
  try {
    const hasPassword = await page.evaluate(() =>
      !!document.querySelector('input[type="password"]'));
    if (hasPassword) return true;
    const body = (await page.evaluate(() => document.body?.innerText || '')).slice(0, 2000);
    return /sign in|log in|log-in|create an account|register to apply|existing applicant/i.test(body);
  } catch {
    return false;
  }
}

function pause(msMin = 250, msMax = 900) {
  return sleep(msMin + Math.random() * (msMax - msMin));
}

/* ---------------- caps ---------------- */

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function capsInfo(jobs, prefs, company) {
  const today = todayKey();
  const appliedToday = jobs.filter((j) => j.status === 'applied' && (j.appliedAt ?? '').slice(0, 10) === today);
  const forCompany = appliedToday.filter((j) => j.company === company);
  return {
    dailyLeft: Math.max(0, (prefs.dailyCap ?? 12) - appliedToday.length),
    companyLeft: Math.max(0, (prefs.perCompanyCap ?? 2) - forCompany.length),
  };
}

/* ---------------- main ---------------- */

export async function applyRun({ live = LIVE } = {}) {
  ensureDirs();
  const profile = loadProfile();
  const prefs = loadPrefs();
  if (!profile || !prefs) {
    appendActivity({ phase: 'apply', level: 'warn', message: 'Apply skipped — profile or prefs missing (run the seeder or complete Settings).' });
    return { skipped: true };
  }
  if (profile.isDemo && live) {
    appendActivity({ phase: 'apply', level: 'warn', message: 'Live apply refused — profile is marked as DEMO. Switch to a real profile in Settings first.' });
    return { skipped: true };
  }
  if (live && !prefs.liveApply) {
    appendActivity({ phase: 'apply', level: 'warn', message: 'Live apply refused — prefs.liveApply is off (keep Dry Run on until you trust the field mapping).' });
    return { skipped: true };
  }

  const jobs = getJobs();
  const candidates = jobs
    .filter((j) => (j.status === 'cv_ready' || j.status === 'needs_you') && (j.grade === 'A' || j.grade === 'B'))
    .filter((j) => (j.score ?? 0) >= (prefs.minScore ?? 4))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);

  if (candidates.length === 0) {
    appendActivity({ phase: 'apply', level: 'info', message: 'Apply run: no eligible jobs (need grade A/B, score ≥ ' + (prefs.minScore ?? 4) + ', status cv_ready).' });
    return { processed: 0 };
  }

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (err) {
    appendActivity({ phase: 'apply', level: 'warn', message: `Apply run aborted — playwright not available (${err?.message ?? err}). Run: npx playwright install chromium` });
    return { processed: 0, noBrowser: true };
  }
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    appendActivity({
      phase: 'apply',
      level: 'warn',
      message: `Browser could not start (${String(err?.message ?? err).split('\n')[0]}). Run: npx playwright install chromium`,
    });
    return { processed: 0, noBrowser: true };
  }

  let processed = 0;
  try {
    for (const job of candidates) {
      const caps = capsInfo(jobs, prefs, job.company);
      if (caps.dailyLeft <= 0) {
        appendActivity({ phase: 'apply', level: 'warn', message: `Daily application cap reached (${prefs.dailyCap}). Stopping.` });
        break;
      }
      if (caps.companyLeft <= 0) {
        appendActivity({ phase: 'apply', level: 'info', message: `Per-company cap reached for ${job.company} — skipping.` });
        continue;
      }

      const page = await browser.newPage();
      page.setDefaultTimeout(12000);
      let outcome = { status: 'needs_you', reason: 'unknown_form', note: 'No form could be located on the posting page.' };
      try {
        await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await pause();

        if (await detectCaptcha(page)) {
          const shot = shotPath(job.id);
          await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
          outcome = { status: 'needs_you', reason: 'captcha', note: 'CAPTCHA detected — parked for human review (never bypassed).', shot };
        } else if (await detectLoginWall(page)) {
          const shot = shotPath(job.id);
          await page.screenshot({ path: shot }).catch(() => {});
          outcome = { status: 'needs_you', reason: 'account_wall', note: 'Sign-in / account creation required — parked for human review.', shot };
        } else {
          // Try to reach the actual application form.
          const applyLink = page.locator('a:has-text("Apply"), a:has-text("Start application"), a:has-text("Continue to application")').first();
          if (await applyLink.isVisible({ timeout: 2500 }).catch(() => false)) {
            await applyLink.click().catch(() => {});
            await pause(600, 1600);
          }

          const form = await fillForm(page, job, profile);
          if (form.parked) {
            outcome = { status: 'needs_you', reason: form.reason, note: form.note };
          } else if (form.captcha) {
            const shot = shotPath(job.id);
            await page.screenshot({ path: shot }).catch(() => {});
            outcome = { status: 'needs_you', reason: 'captcha', note: 'CAPTCHA appeared mid-form — parked for human review.', shot };
          } else {
            // Screenshot evidence before (potential) submit.
            const shot = shotPath(job.id);
            await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
            if (live) {
              const submit = await trySubmit(page);
              if (submit.ok) {
                outcome = { status: 'applied', appliedAt: nowIso(), note: 'Submitted and confirmation verified.' };
              } else {
                outcome = { status: 'needs_you', reason: submit.reason || 'unknown_form', note: submit.note || 'Submission result unclear — parked for verification.' };
              }
            } else {
              outcome = {
                status: 'cv_ready',
                note: `Dry run complete — ${form.filled}/${form.total} fields filled, resume ${form.resume ? 'uploaded' : 'NOT uploaded (no PDF available)'}. Final submit intentionally NOT pressed.`,
              };
            }
          }
        }
      } catch (err) {
        outcome = { status: 'needs_you', reason: 'unknown_form', note: `Page error: ${String(err?.message ?? err).split('\n')[0]}` };
      } finally {
        await page.close().catch(() => {});
      }

      applyJobResult(job, outcome, jobs);
      processed++;
      await pause(900, 2200); // pace between applications
    }
  } finally {
    await browser.close().catch(() => {});
  }

  saveJobs(jobs);
  return { processed, live };
}

function shotPath(jobId) {
  const name = `${jobId}-${Date.now()}.png`;
  return path.join(paths.screens, name);
}

function applyJobResult(job, outcome, jobs) {
  job.status = outcome.status;
  job.updatedAt = nowIso();
  if (outcome.appliedAt) job.appliedAt = outcome.appliedAt;
  if (outcome.status === 'needs_you') {
    job.parkedReason = outcome.reason;
    job.parkedNote = outcome.note;
  } else if (job.parkedReason && (outcome.status === 'applied' || outcome.status === 'cv_ready')) {
    // keep the note for transparency in the UI
    job.parkedNote = outcome.note;
  }
  const idx = jobs.findIndex((j) => j.id === job.id);
  if (idx !== -1) jobs[idx] = { ...job };
  appendActivity({
    phase: 'apply',
    level: outcome.status === 'applied' ? 'good' : outcome.status === 'needs_you' ? 'warn' : 'info',
    company: job.company,
    jobId: job.id,
    message: `${outcome.status === 'applied' ? 'Applied' : outcome.status === 'needs_you' ? 'Parked' : 'Dry run'}: ${job.title} @ ${job.company} — ${outcome.note ?? ''}`,
    grade: job.grade,
  });
}

/**
 * Inspect and fill the visible form. Returns { total, filled, resume, parked?, reason?, note?, captcha? }.
 */
async function fillForm(page, job, profile) {
  const selectors = 'input, textarea, select';
  const total = await page.locator(selectors).count();
  if (total === 0) {
    return { total: 0, filled: 0, resume: false, parked: true, reason: 'unknown_form', note: 'No form fields found on this page — it may load in a separate application step.' };
  }

  let filled = 0;
  let resume = false;
  const unansweredRequired = [];

  for (let i = 0; i < total; i++) {
    const el = page.locator(selectors).nth(i);
    const info = await el.evaluate((n) => {
      const node = document.querySelectorAll('input, textarea, select')[n];
      return {
        tag: node.tagName.toLowerCase(),
        type: node.type || '',
        name: node.name || '',
        disabled: node.disabled,
        visible: !!(node.offsetParent || node.getClientRects().length),
      };
    }, i).catch(() => null);
    if (!info || !info.visible || info.disabled) continue;
    if (info.tag === 'input' && ['hidden', 'submit', 'button', 'reset', 'image'].includes(info.type)) continue;

    const label = (await labelFor(page, el).catch(() => '')) || info.name || '';
    const key = label.toLowerCase();

    // File / resume field
    if (info.tag === 'input' && info.type === 'file') {
      const pdf = job.pdfPath ? path.join(paths.cv, job.pdfPath) : undefined;
      const md = path.join(paths.cv, `${job.id}.md`);
      if (pdf && (await import('node:fs')).existsSync(pdf)) {
        await el.setInputFiles(pdf).catch(() => {});
        resume = true;
        filled++;
      } else {
        if (LEGAL_RE.test(key) || /require/i.test(key)) unansweredRequired.push(label || 'resume/CV');
      }
      continue;
    }

    const isRequired = await el.evaluate((n) => {
      const node = document.querySelectorAll('input, textarea, select')[n];
      if (node.required) return true;
      return /required/i.test(node.closest('label, .form-group, .field')?.className || '') || node.hasAttribute('aria-required');
    }, i).catch(() => false);

    let value = undefined;
    for (const [re, resolve] of FIELD_MAP) {
      if (re.test(key)) {
        value = resolve?.(profile);
        break;
      }
    }

    if (value === undefined || value === null) {
      if (isRequired) unansweredRequired.push(label || info.name || `field ${i}`);
      continue;
    }
    value = String(value);

    try {
      if (info.tag === 'select') {
        const opts = await el.locator('option').allTextContents();
        const match =
          opts.find((o) => o.toLowerCase() === value.toLowerCase()) ||
          opts.find((o) => o.toLowerCase().startsWith(value.toLowerCase())) ||
          opts.find((o) => value.toLowerCase().startsWith(o.toLowerCase().trim()));
        if (match) {
          await el.selectOption({ label: match });
          filled++;
        } else if (isRequired) {
          unansweredRequired.push(label || 'select field');
        }
      } else if (info.tag === 'input' && (info.type === 'radio' || info.type === 'checkbox')) {
        // radio/checkbox: try to find an option element whose text matches the value
        const group = page.locator(`input[type="${info.type}"][name="${CSS.escape(info.name || '')}"]`);
        const count = await group.count().catch(() => 0);
        let matched = false;
        for (let k = 0; k < count && !matched; k++) {
          const opt = group.nth(k);
          const t = await opt.evaluate((n) => {
            const node = n;
            return node.closest('label')?.textContent || document.querySelector(`label[for="${CSS.escape(node.id)}"]`)?.textContent || node.value || '';
          }, opt).catch(() => '');
          if (t.toLowerCase().trim() === value.toLowerCase().trim() || t.toLowerCase().includes(value.toLowerCase())) {
            await opt.check().catch(() => opt.click().catch(() => {}));
            filled++;
            matched = true;
          }
        }
        if (!matched && isRequired) unansweredRequired.push(label || info.name || 'radio group');
      } else {
        await el.click({ timeout: 2000 }).catch(() => {});
        await el.fill(value).catch(async () => {
          await el.type(value, { delay: 18 }).catch(() => {});
        });
        filled++;
      }
    } catch {
      if (isRequired) unansweredRequired.push(label || info.name || `field ${i}`);
    }
    await pause(150, 500);
  }

  if (await detectCaptcha(page)) return { total, filled, resume, captcha: true };

  if (unansweredRequired.length > 0) {
    return {
      total,
      filled,
      resume,
      parked: true,
      reason: LEGAL_RE.test(unansweredRequired.join(' ')) ? 'legal_question' : 'unknown_form',
      note: `Required fields could not be answered from your profile (parked, not guessed): ${[...new Set(unansweredRequired)].slice(0, 5).join(', ')}`,
    };
  }

  return { total, filled, resume };
}

/**
 * Live mode only: find the final submit button, click once, verify.
 */
async function trySubmit(page) {
  const btn = page
    .locator('button[type="submit"], input[type="submit"], a:has-text("Submit application"), button:has-text("Submit")')
    .first();
  const visible = await btn.isVisible({ timeout: 4000 }).catch(() => false);
  if (!visible) {
    return { ok: false, reason: 'unknown_form', note: 'No final submit button could be identified — parked rather than guessing.' };
  }
  await pause(400, 900);
  await btn.click().catch(() => {});
  await page.waitForTimeout(3500);
  const body = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
  const url = page.url();
  const successWords = /thank you|application (has been|was) (submitted|received)|we received|success|submitted|good to go|next steps/i;
  const formGone = !(await page.locator('input, textarea').count().catch(() => 1)) || (await page.locator('input, textarea').count().catch(() => 0)) === 0;
  const validationError = /required|please (enter|fill|select|check)|error/i.test(body.slice(0, 3000)) && !successWords.test(body.slice(0, 3000));
  if (validationError) return { ok: false, reason: 'unknown_form', note: 'Validation errors remain after submit attempt.' };
  if (successWords.test(body.slice(0, 3000)) || formGone || /confirm|thank|success/i.test(url)) return { ok: true };
  return { ok: false, reason: 'unknown_form', note: 'Could not confidently confirm submission — parked for verification.' };
}

if (isMainModule(import.meta.url)) {
  applyRun()
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((err) => {
      appendActivity({ phase: 'apply', level: 'bad', message: `Apply run crashed: ${String(err?.message ?? err).split('\n')[0]}` });
      console.error(err);
      process.exitCode = 1;
    });
}
