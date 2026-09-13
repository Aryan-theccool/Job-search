// Karmendra AI Job Hunter — Markdown CV → print-friendly PDF via Playwright Chromium.
// Best-effort: if no browser runtime is installed, callers get { ok: false, error }
// and continue with the Markdown CV (the dashboard renders Markdown natively).
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { paths, ensureDirs } from './lib.mjs';

const PRINT_CSS = `
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #24231f; font-size: 12.5px; line-height: 1.5; max-width: 100%; margin: 0; }
  h1 { font-size: 22px; margin: 0 0 2px; letter-spacing: .2px; }
  h2 { font-size: 14px; margin: 18px 0 6px; padding-bottom: 3px; border-bottom: 1.5px solid #d8d2c4; text-transform: none; letter-spacing: .3px; }
  p, li { margin: 3px 0; }
  ul { margin: 4px 0; padding-left: 18px; }
  hr { border: none; border-top: 1px solid #e2ddd0; margin: 14px 0; }
  em, .muted { color: #6f6a5e; font-size: 11px; }
  a { color: inherit; text-decoration: none; }
`;

/**
 * @param {string} name job id (or 'base') — reads data/cv/<name>.md
 * @returns {Promise<{ok: boolean, path?: string, relPath?: string, error?: string}>}
 */
export async function renderPdf(name) {
  ensureDirs();
  const mdPath = path.join(paths.cv, `${name}.md`);
  if (!fs.existsSync(mdPath)) {
    return { ok: false, error: `CV not found: data/cv/${name}.md` };
  }
  const md = fs.readFileSync(mdPath, 'utf8');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${PRINT_CSS}</style></head><body>${
    await marked.parse(md)
  }</body></html>`;

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (err) {
    return { ok: false, error: `playwright not installed (${err?.message ?? err})` };
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const outPath = path.join(paths.cv, `${name}.pdf`);
    await page.pdf({ path: outPath, format: 'A4', printBackground: false });
    return { ok: true, path: outPath, relPath: `${name}.pdf` };
  } catch (err) {
    return {
      ok: false,
      error: `browser unavailable (${err?.message?.split('\n')[0] ?? 'launch failed'}). Run: npx playwright install chromium`,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
