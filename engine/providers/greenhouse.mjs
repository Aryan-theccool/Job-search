// Greenhouse public board feed.
// Endpoint: https://boards-api.greenhouse.io/v1/boards/<token>/jobs
import { fetchJson } from './_http.mjs';

/**
 * @param {object} entry { name, ats, token, enabled, careersUrl }
 * @param {object} ctx unused for now (kept for provider interface parity)
 * @returns {Promise<Array<{title: string, url: string, location: string, salary?: object, postedAt?: string}>>}
 */
export async function fetch(entry, _ctx) {
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(entry.token)}/jobs`);
  if (data == null) return null; // fetch failed — distinguish from a genuinely empty board
  const list = Array.isArray(data) ? data : Array.isArray(data?.jobs) ? data.jobs : [];
  return list
    .map((j) => {
      const sal = j.salary;
      return {
        title: j.title ?? '',
        url: j.absolute_url ?? j.app_url ?? '',
        location: j.location?.name || 'Unknown',
        salary:
          sal && (sal.min || sal.max)
            ? {
                min: sal.min ?? undefined,
                max: sal.max ?? undefined,
                currency: sal.currency || 'USD',
                period: sal.period || 'YEAR',
              }
            : undefined,
        postedAt: j.first_published || j.updated_at || undefined,
      };
    })
    .filter((j) => j.title && j.url);
}
