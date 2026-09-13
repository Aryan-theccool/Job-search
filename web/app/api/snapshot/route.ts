import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { P, REPO_ROOT } from '@/lib/paths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function runSeed(): Promise<void> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [path.join(REPO_ROOT, 'engine', 'seed.mjs')],
      { cwd: REPO_ROOT, timeout: 180000 },
      () => resolve(),
    );
  });
}

/**
 * POST { mode: 'demo' | 'real' }
 *  - demo: seed a realistic demo dataset (placeholder identity, real submit blocked)
 *  - real: reset to an empty real dataset WITHOUT deleting base CV/profile
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const mode = body?.mode;

    if (mode === 'demo') {
      await runSeed();
      return NextResponse.json({ ok: true, mode });
    }

    if (mode === 'real') {
      fs.mkdirSync(path.dirname(P.jobs), { recursive: true });
      fs.writeFileSync(P.jobs, '[]');
      fs.writeFileSync(P.runs, '[]');
      fs.writeFileSync(P.activity, '');
      fs.writeFileSync(P.commands, '');
      // remove generated CVs/PDFs but keep the user's base CV
      if (fs.existsSync(P.cvDir)) {
        for (const f of fs.readdirSync(P.cvDir)) {
          if (f === 'base.md' || f.startsWith('base.md.tmp')) continue;
          try { fs.rmSync(path.join(P.cvDir, f)); } catch { /* ignore */ }
        }
      }
      fs.appendFileSync(
        P.activity,
        JSON.stringify({ id: `evt_${Date.now().toString(36)}`, ts: new Date().toISOString(), phase: 'system', level: 'info', message: 'Reset to a fresh real dataset — run a hunt to start scanning' }) + '\n',
      );
      return NextResponse.json({ ok: true, mode });
    }

    return NextResponse.json({ ok: false, error: 'mode must be "demo" or "real"' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
