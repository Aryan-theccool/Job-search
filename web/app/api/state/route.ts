import { NextResponse } from 'next/server';
import { readSnapshot } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Full current Snapshot as JSON. */
export async function GET() {
  try {
    return NextResponse.json(readSnapshot());
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
