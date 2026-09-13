// Tiny fetch wrapper for public ATS feeds.
// - AbortController timeout (~9s)
// - Clear local-tool user agent
// - Returns parsed JSON on success, null on any failure (callers skip gracefully).

const UA = 'KarmendraJobHunter/0.1 (local personal job-search tool; +https://github.com/Aryan-theccool/Job-search)';

export async function fetchJson(url, { timeoutMs = 9000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
