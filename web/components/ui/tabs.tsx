'use client';

import * as React from 'react';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { cn } from '@/lib/utils';

const Tabs = BaseTabs.Root;

const TabsList = React.forwardRef<
  React.ComponentRef<typeof BaseTabs.List>,
  React.ComponentPropsWithoutRef<typeof BaseTabs.List>
>(({ className, ...props }, ref) => (
  <BaseTabs.List
    ref={ref}
    className={cn('inline-flex items-center gap-1 rounded-2xl border border-line bg-ink/5 p-1', className)}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof BaseTabs.Tab>,
  React.ComponentPropsWithoutRef<typeof BaseTabs.Tab>
>(({ className, children, ...props }, ref) => (
  <BaseTabs.Tab
    ref={ref}
    className={cn(
      'rounded-xl px-3.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/50 data-[selected]:bg-paper data-[selected]:text-ink data-[selected]:shadow-soft cursor-pointer',
      className,
    )}
    {...props}
  >
    {children}
  </BaseTabs.Tab>
));
TabsTrigger.displayName = 'TabsTrigger';

const TabsPanel = React.forwardRef<
  React.ComponentRef<typeof BaseTabs.Panel>,
  React.ComponentPropsWithoutRef<typeof BaseTabs.Panel>
>(({ className, ...props }, ref) => (
  <BaseTabs.Panel
    ref={ref}
    className={cn('focus-visible:outline-none', className)}
    {...props}
  />
));
TabsPanel.displayName = 'TabsPanel';

export { Tabs, TabsList, TabsTrigger, TabsPanel };
