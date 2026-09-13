'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--glass-strong)',
          border: '1px solid var(--border)',
          color: 'var(--ink)',
          backdropFilter: 'blur(16px)',
        },
      }}
    />
  );
}
