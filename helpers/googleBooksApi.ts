import axios from 'axios';

const VOLUMES_ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';

export const REQUEST_TIMEOUT_MS = 15000;

export type BookApiErrorKind = 'missing-key' | 'auth' | 'rate-limit' | 'network' | 'server' | 'invalid-isbn' | 'unknown';

export type BookApiResult<T> = { ok: true; data: T } | { ok: false; kind: BookApiErrorKind };

export const success = <T>(data: T): BookApiResult<T> => ({ ok: true, data });

export const failure = <T>(kind: BookApiErrorKind): BookApiResult<T> => ({ ok: false, kind });

/** Tolerates undefined and the Error object getData() can hand back on a corrupted value. */
export function sanitizeApiKey(apiKey: unknown): string {
  return typeof apiKey === 'string' ? apiKey.trim() : '';
}

/** Strips hyphens, spaces and the trailing newline some barcode scanners append. */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase();
}

export function isValidIsbn(isbn: string): boolean {
  return isbn.length === 10 || isbn.length === 13;
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

export function classifyAxiosError(err: unknown): BookApiErrorKind {
  if (!axios.isAxiosError(err)) return 'unknown';

  const status = err.response?.status;
  // No response at all: offline, DNS failure or timeout.
  if (status === undefined) return 'network';

  const reason = (err.response?.data as any)?.error?.errors?.[0]?.reason;
  if (status === 429 || QUOTA_REASONS.includes(reason)) return 'rate-limit';
  if (status === 400 || status === 401 || status === 403) return 'auth';
  if (status >= 500) return 'server';

  return 'unknown';
}

/** Never log the AxiosError itself: its `config.url` carries the API key. */
export function logApiError(context: string, err: unknown): void {
  console.log(`[bookSearch] ${context}:`, err instanceof Error ? err.message : err);
}
