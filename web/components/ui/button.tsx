import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-ink text-paper hover:opacity-90 shadow-soft',
        sky:
          'bg-sky-soft text-ink border border-line hover:bg-sky/30',
        sage:
          'bg-sage-soft text-ink border border-line hover:bg-sage/30',
        amber:
          'bg-amber-soft text-ink border border-amber/40 hover:bg-amber/25',
        rose:
          'bg-rose-soft text-ink border border-rose/40 hover:bg-rose/25',
        outline:
          'border border-line-strong bg-transparent hover:bg-ink/5',
        ghost:
          'bg-transparent hover:bg-ink/8',
        link:
          'underline-offset-4 hover:underline h-auto',
      },
      size: {
        default: 'h-10 px-4 text-sm',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

export { Button, buttonVariants };
