'use client';

import * as React from 'react';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { cn } from '@/lib/utils';

interface SliderProps {
  value: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  className?: string;
  'aria-label'?: string;
}

/** Base UI slider: Track (bg) + Indicator (fill) + Thumb. The library positions the thumb. */
const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value, min, max, step, onValueChange, ...rest }, ref) => (
    <BaseSlider.Root
      ref={ref as React.Ref<HTMLDivElement>}
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onValueChange?.(Array.isArray(v) ? [...v] : [v])}
      className={cn('flex w-full touch-none select-none items-center py-2', className)}
      {...rest}
    >
      <BaseSlider.Control className="relative flex w-full items-center">
        <BaseSlider.Track className="relative h-1.5 w-full rounded-full bg-ink/12">
          <BaseSlider.Indicator className="h-full rounded-full bg-amber" />
        </BaseSlider.Track>
        <BaseSlider.Thumb
          index={0}
          className="block h-4.5 w-4.5 cursor-grab rounded-full border-2 border-amber bg-paper shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/50 active:cursor-grabbing"
        />
      </BaseSlider.Control>
    </BaseSlider.Root>
  ),
);
Slider.displayName = 'Slider';

export { Slider };
