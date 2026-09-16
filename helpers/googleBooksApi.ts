import axios from 'axios';
import { BookApiErrorKind, classifyHttpError } from './bookApi';

/** Everything specific to the Google Books API. Shared pieces live in `bookApi.ts`. */

const VOLUMES_ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';

/** Tolerates undefined and the Error object getData() can hand back on a corrupted value. */
export function sanitizeApiKey(apiKey: unknown): string {
  return typeof apiKey === 'string' ? apiKey.trim() : '';
}

/**
 * `query` must already carry any Google operator (e.g. `isbn:`) with its VALUE
 * percent-encoded by the caller. Encoding the whole string would escape the
 * operator's colon as well.
 */
export function buildVolumesUrl(query: string, apiKey: string, extra: Record<string, string> = {}): string {
  const params = [`q=${query}`, `key=${encodeURIComponent(apiKey)}`];
  for (const [name, value] of Object.entries(extra)) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }
  return `${VOLUMES_ENDPOINT}?${params.join('&')}`;
}

export function buildVolumeByIdUrl(volumeId: string, apiKey: string): string {
  return `${VOLUMES_ENDPOINT}/${encodeURIComponent(volumeId)}?key=${encodeURIComponent(apiKey)}`;
}

const QUOTA_REASONS = ['rateLimitExceeded', 'userRateLimitExceeded', 'dailyLimitExceeded', 'dailyLimitExceededUnreg', 'quotaExceeded'];

/**
 * Google answers an exhausted quota with 403 as often as 429, and only the
 * `reason` code tells the two apart — hence this refinement over the plain
 * status-based classification.
 */
export function classifyGoogleError(err: unknown): BookApiErrorKind {
  const reason = axios.isAxiosError(err) ? (err.response?.data as any)?.error?.errors?.[0]?.reason : undefined;
  if (QUOTA_REASONS.includes(reason)) return 'rate-limit';
  return classifyHttpError(err);
}
