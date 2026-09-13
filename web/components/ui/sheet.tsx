'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

/** Right-side sheet (used for job details). Closes on Escape + backdrop click. */
export function Sheet({ open, onOpenChange, children, className }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/35 backdrop-blur-[2px] animate-fade-in" onClick={() => onOpenChange(false)} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute right-0 top-0 h-full w-[min(94vw,460px)] glass-strong shadow-pop animate-slide-in-right overflow-y-auto',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-3 border-b border-line', className)}>{children}</div>;
}

export function SheetContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
