'use client';

import * as React from 'react';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

interface SwitchProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseSwitch.Root>, 'className'> {
  className?: string;
}

const Switch = React.forwardRef<React.ComponentRef<typeof BaseSwitch.Root>, SwitchProps>(
  ({ className, ...props }, ref) => (
    <BaseSwitch.Root
      ref={ref}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-line bg-ink/15 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/50 data-checked:border-sage data-checked:bg-sage',
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        className={cn(
          'block h-4.5 w-4.5 rounded-full bg-paper shadow-soft transition-transform duration-200 data-checked:translate-x-5',
        )}
      />
    </BaseSwitch.Root>
  ),
);
Switch.displayName = 'Switch';

export { Switch };
