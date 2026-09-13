// Lever public posting feed.
// Endpoint: https://api.lever.co/v0/postings/<token>?mode=json
import { fetchJson } from './_http.mjs';

/**
 * @param {object} entry { name, ats, token, enabled, careersUrl }
 * @param {object} ctx unused for now (kept for provider interface parity)
 * @returns {Promise<Array<{title: string, url: string, location: string, salary?: object, postedAt?: string}>>}
 */
export async function fetch(entry, _ctx) {
  const data = await fetchJson(`https://api.lever.co/v0/postings/${encodeURIComponent(entry.token)}?mode=json`);
  if (data == null) return null; // fetch failed — distinguish from a genuinely empty board
  if (!Array.isArray(data)) return [];
  return data
    .map((j) => ({
      title: j.text ?? '',
      url: j.hostedUrl ?? j.applyUrl ?? '',
      location: j.categories?.location || j.categories?.office || 'Unknown',
      // Lever's public API does not expose salary ranges.
      salary: undefined,
      postedAt: j.createdAt || undefined,
    }))
    .filter((j) => j.title && j.url);
}
