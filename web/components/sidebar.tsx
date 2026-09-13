'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Radar, KanbanSquare, FileText, Building2, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSnapshot } from './live-provider';
import { Pill } from './visuals';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scan', label: 'Job Scan', icon: Radar },
  { href: '/applications', label: 'Applications', icon: KanbanSquare },
  { href: '/resumes', label: 'Resumes', icon: FileText },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const snap = useSnapshot();
  const needsYou = snap.jobs.filter((j) => j.status === 'needs_you').length;

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col gap-1 border-r border-line p-4">
      <div className="flex items-center gap-3 px-2 pt-2 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-paper font-display text-lg font-black shadow-soft">
          K
        </div>
        <div className="leading-tight">
          <div className="font-display text-[15px] font-bold tracking-tight">
            Karmendra AI
          </div>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Job Hunter
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-150',
                active
                  ? 'bg-ink text-paper shadow-soft'
                  : 'text-ink-muted hover:bg-ink/6 hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {href === '/applications' && needsYou > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                    active ? 'bg-paper/20 text-paper' : 'bg-rose-soft text-rose',
                  )}
                >
                  {needsYou}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 px-2 pb-2">
        {snap.profile.isDemo && (
          <div className="rounded-2xl border border-amber/40 bg-amber-soft p-3">
            <div className="text-[11px] font-bold text-ink">Demo profile active</div>
            <div className="mt-0.5 text-[10.5px] leading-relaxed text-ink-muted">
              Real applications are blocked. Set up your real profile in Settings to go live (dry run first).
            </div>
          </div>
        )}
        <div className="flex items-center justify-between px-1">
          <Pill tone="sage">{snap.companies.filter((c) => c.enabled).length} boards</Pill>
          <Pill tone="sky">{snap.jobs.length} roles</Pill>
        </div>
        <div className="font-hand px-1 text-[11px] text-ink-faint">keep humans in control</div>
      </div>
    </aside>
  );
}
