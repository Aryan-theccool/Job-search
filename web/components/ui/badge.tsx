import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-line bg-ink/5 text-ink-muted',
        sky: 'border-sky/40 bg-sky-soft text-ink',
        sage: 'border-sage/40 bg-sage-soft text-ink',
        amber: 'border-amber/40 bg-amber-soft text-ink',
        rose: 'border-rose/40 bg-rose-soft text-ink',
        ink: 'border-transparent bg-ink text-paper',
        outline: 'border-line-strong text-ink-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
