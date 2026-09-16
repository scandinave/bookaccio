import axios from 'axios';

/**
 * Source-agnostic core shared by every book provider.
 *
 * Nothing here may know about a particular service: an implementation that
 * needed to import another implementation's module would make the two
 * siblings depend on each other. Provider specifics — endpoints, URL
 * building, vendor error codes — belong in that provider's own module.
 */

export const REQUEST_TIMEOUT_MS = 15000;

/**
 * Why every failure gets a kind: a missing key, an exhausted quota and a dead
 * network used to collapse into the same "book not found" alert, which told the
 * user the opposite of what had happened.
 */
export type BookApiErrorKind = 'missing-key' | 'auth' | 'rate-limit' | 'network' | 'server' | 'invalid-isbn' | 'unknown';

export type BookApiResult<T> = { ok: true; data: T } | { ok: false; kind: BookApiErrorKind };

export const success = <T>(data: T): BookApiResult<T> => ({ ok: true, data });

export const failure = <T>(kind: BookApiErrorKind): BookApiResult<T> => ({ ok: false, kind });

/** Strips hyphens, spaces and the trailing newline some barcode scanners append. */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase();
}

export function isValidIsbn(isbn: string): boolean {
  return isbn.length === 10 || isbn.length === 13;
}

/** Classification from the HTTP status alone. Providers refine it with their own error codes. */
export function classifyHttpError(err: unknown): BookApiErrorKind {
  if (!axios.isAxiosError(err)) return 'unknown';

  const status = err.response?.status;
  // No response at all: offline, DNS failure or timeout.
  if (status === undefined) return 'network';

  if (status === 429) return 'rate-limit';
  if (status === 400 || status === 401 || status === 403) return 'auth';
  if (status >= 500) return 'server';

  return 'unknown';
}

/** Never log the error object itself: an AxiosError's `config.url` can carry an API key. */
export function logApiError(context: string, err: unknown): void {
  console.log(`[bookSearch] ${context}:`, err instanceof Error ? err.message : err);
}
