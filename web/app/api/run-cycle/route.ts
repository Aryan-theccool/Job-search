import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { P, REPO_ROOT } from '@/lib/paths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOCK_TTL_MS = 6 * 60 * 1000;

/**
 * Start a real engine cycle from the dashboard.
 * A time-based lock file under data/ prevents accidental overlapping runs.
 */
export async function POST() {
  try {
    fs.mkdirSync(path.dirname(P.cycleLock), { recursive: true });
    if (fs.existsSync(P.cycleLock)) {
      const age = Date.now() - fs.statSync(P.cycleLock).mtimeMs;
      if (age < LOCK_TTL_MS) {
        return NextResponse.json({ started: false, busy: true });
      }
    }
    fs.writeFileSync(P.cycleLock, new Date().toISOString());
    const child = spawn(
      process.execPath,
      [path.join(REPO_ROOT, 'engine', 'cycle.mjs'), '--force'],
      { detached: true, stdio: 'ignore', cwd: REPO_ROOT },
    );
    child.unref();
    return NextResponse.json({ started: true });
  } catch (err) {
    return NextResponse.json({ started: false, error: String(err) }, { status: 500 });
  }
}
