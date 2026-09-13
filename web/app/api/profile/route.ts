import { NextResponse } from 'next/server';
import { loadProfile, saveProfile } from '@/lib/data';
import type { Profile } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Validate basic fields and save the profile. Saving a real profile sets onboarded=true, isDemo=false. */
export async function POST(req: Request) {
  try {
    const patch = await req.json().catch(() => null);
    if (!patch || typeof patch !== 'object') {
      return NextResponse.json({ ok: false, error: 'body must be an object' }, { status: 400 });
    }
    const current = loadProfile();
    const next: Profile = { ...current, ...patch, updatedAt: new Date().toISOString() };
    // keep sub-objects merged
    next.compensation = { ...current.compensation, ...(patch.compensation ?? {}) };
    next.legal = { ...current.legal, ...(patch.legal ?? {}) };
    if (patch.legal?.ee) next.legal.ee = { ...current.legal.ee, ...patch.legal.ee };

    // basic sanity validation
    if (next.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next.email)) {
      return NextResponse.json({ ok: false, error: 'invalid email address' }, { status: 400 });
    }

    saveProfile(next);
    return NextResponse.json({ ok: true, profile: next });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
