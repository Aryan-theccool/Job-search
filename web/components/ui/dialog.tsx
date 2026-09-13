'use client';

import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';

const Dialog = BaseDialog.Root;
const DialogTrigger = BaseDialog.Trigger;
const DialogClose = BaseDialog.Close;
const DialogPortal = BaseDialog.Portal;

function DialogBackdrop({ className, ...props }: React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop>) {
  return <BaseDialog.Backdrop className={cn('fixed inset-0 z-50 bg-ink/35 backdrop-blur-[2px] animate-fade-in', className)} {...props} />;
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

const DialogTitle = BaseDialog.Title;
const DialogDescription = BaseDialog.Description;

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseDialog.Popup>) {
  return (
    <DialogPortal>
      <DialogBackdrop />
      <BaseDialog.Popup
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 glass-strong rounded-4xl shadow-pop p-6 animate-scale-in',
          className,
        )}
        {...props}
      >
        {children}
      </BaseDialog.Popup>
    </DialogPortal>
  );
}

export { Dialog, DialogTrigger, DialogClose, DialogBackdrop, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogPortal };
