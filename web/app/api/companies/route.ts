import { NextResponse } from 'next/server';
import { loadCompanies, saveCompanies } from '@/lib/data';
import type { Company, ATS } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ATS_VALUES: ATS[] = ['greenhouse', 'lever', 'ashby', 'workable', 'workday', 'other'];

/**
 * body: { action: 'add', name, ats, token, careersUrl? }
 *   or: { action: 'toggle', id, enabled }   where id is "ats:token"
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const companies = loadCompanies();

    if (body?.action === 'add') {
      const name = String(body.name ?? '').trim();
      const token = String(body.token ?? '').trim();
      const ats = String(body.ats ?? '') as ATS;
      if (!name || !token || !ATS_VALUES.includes(ats)) {
        return NextResponse.json({ ok: false, error: 'name, token and a valid ats are required' }, { status: 400 });
      }
      const idx = companies.findIndex((c) => c.ats === ats && c.token === token);
      const rec: Company = { name, ats, token, careersUrl: body.careersUrl || undefined, enabled: true };
      if (idx === -1) companies.push(rec);
      else companies[idx] = { ...companies[idx], ...rec };
      saveCompanies(companies);
      return NextResponse.json({ ok: true, companies });
    }

    if (body?.action === 'toggle') {
      const id = String(body.id ?? '');
      const enabled = Boolean(body.enabled);
      const idx = companies.findIndex((c) => `${c.ats}:${c.token}` === id);
      if (idx === -1) return NextResponse.json({ ok: false, error: 'company not found' }, { status: 404 });
      companies[idx] = { ...companies[idx], enabled };
      saveCompanies(companies);
      return NextResponse.json({ ok: true, companies });
    }

    return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
