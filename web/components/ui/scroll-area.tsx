import * as React from 'react';
import { cn } from '@/lib/utils';

/** Styled scroll container with a soft inner fade. */
const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('overflow-y-auto overscroll-contain', className)} {...props} />
  ),
);
ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };
