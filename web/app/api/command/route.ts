import { NextResponse } from 'next/server';
import { queueCommand } from '@/lib/data';
import type { CommandType } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED: CommandType[] = [
  'discard', 'mark_applied', 'scan_now', 'pause', 'resume',
  'save_prefs', 'save_company', 'park', 'mark_cv', 'mark_status',
];

/** Validate + append a command for the engine's next cycle. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const type = body?.type as CommandType | undefined;
    if (!type || !ALLOWED.includes(type)) {
      return NextResponse.json({ ok: false, error: `unknown command type: ${type}` }, { status: 400 });
    }
    queueCommand(type, { jobId: body?.jobId, payload: body?.payload });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
