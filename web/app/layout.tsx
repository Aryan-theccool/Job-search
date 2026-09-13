import type { Metadata } from 'next';
import './globals.css';
import { readSnapshot } from '@/lib/data';
import { LiveProvider } from '@/components/live-provider';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { BackgroundScene } from '@/components/background-scene';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Karmendra AI Job Hunter',
  description:
    'A local AI job-hunting dashboard: scan public ATS feeds, score roles, tailor truthful resumes, and track every application.',
};

// The dashboard is live by design — always render fresh server-side,
// the SSE stream then keeps it moving.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const initial = readSnapshot();
  return (
    <html lang="en" data-theme={initial.prefs.theme} suppressHydrationWarning>
      <body>
        <LiveProvider initial={initial}>
          <BackgroundScene />
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main className="flex-1 p-6 lg:p-8">{children}</main>
            </div>
          </div>
          <Toaster />
        </LiveProvider>
      </body>
    </html>
  );
}
