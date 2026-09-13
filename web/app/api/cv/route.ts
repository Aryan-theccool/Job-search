import { NextResponse } from 'next/server';
import { readCv, writeCv } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/cv?id=base|<jobId> → Markdown. POST {id, markdown} writes it safely. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? 'base';
  const md = readCv(id);
  if (md === null) {
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, id, markdown: md });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const id = String(body?.id ?? '');
    const markdown = body?.markdown;
    if (!id || typeof markdown !== 'string') {
      return NextResponse.json({ ok: false, error: 'id and markdown are required' }, { status: 400 });
    }
    writeCv(id, markdown);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
