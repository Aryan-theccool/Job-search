import { NextResponse } from 'next/server';
import { savePrefs } from '@/lib/data';
import type { Prefs } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Merge a patch into the current prefs and save. */
export async function POST(req: Request) {
  try {
    const patch = await req.json().catch(() => null);
    if (!patch || typeof patch !== 'object') {
      return NextResponse.json({ ok: false, error: 'body must be an object' }, { status: 400 });
    }
    // strip anything that isn't a known pref key
    const keys: (keyof Prefs)[] = [
      'autonomy', 'autoSubmit', 'liveApply', 'minScore', 'dailyCap',
      'perCompanyCap', 'scanIntervalMin', 'workingHours', 'theme', 'blockedCompanies',
    ];
    const clean: Partial<Prefs> = {};
    for (const k of keys) {
      if (k in patch) (clean as Record<string, unknown>)[k] = (patch as Record<string, unknown>)[k];
    }
    const prefs = savePrefs(clean);
    return NextResponse.json({ ok: true, prefs });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
