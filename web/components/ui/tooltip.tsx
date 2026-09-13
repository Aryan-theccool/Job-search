import * as React from 'react';
import { cn } from '@/lib/utils';

/** Lightweight CSS hover tooltip (no portal, no focus management needed for our uses). */
function Tooltip({
  children,
  content,
  className,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium text-ink opacity-0 shadow-soft transition-opacity duration-150 group-hover/tip:opacity-100 glass-strong',
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}

export { Tooltip };
