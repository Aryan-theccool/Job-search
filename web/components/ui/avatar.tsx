import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm' };

/** Initials avatar with a warm deterministic background. */
const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(({ className, name = '?', size = 'md', ...props }, ref) => {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
  const hues = ['bg-sky-soft text-ink', 'bg-sage-soft text-ink', 'bg-amber-soft text-ink', 'bg-rose-soft text-ink'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return (
    <span
      ref={ref}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold', SIZES[size], hues[h % hues.length], className)}
      {...props}
    >
      {initials}
    </span>
  );
});
Avatar.displayName = 'Avatar';

export { Avatar };
