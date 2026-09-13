import { readSnapshot, statSignature } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Server-Sent Events stream.
 *  - sends a full snapshot immediately (event: snapshot)
 *  - every ~1s compares an mtime+size signature of the shared files;
 *    on change sends a fresh snapshot (event: update)
 *  - ping comment every 15s to keep proxies happy
 *  - cleans up timers when the request aborts
 */
export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let lastSig = statSignature();
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // initial full snapshot
      try {
        send('snapshot', readSnapshot());
      } catch {
        /* still ping */
      }

      const tick = setInterval(() => {
        let sig = '';
        try {
          sig = statSignature();
        } catch {
          return;
        }
        if (sig !== lastSig) {
          lastSig = sig;
          try {
            send('update', readSnapshot());
          } catch {
            /* ignore */
          }
        }
      }, 1000);

      const ping = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          closed = true;
        }
      }, 15000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(tick);
        clearInterval(ping);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
