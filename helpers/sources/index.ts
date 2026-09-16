import { BookApiErrorKind, BookApiResult, failure, success } from '../bookApi';
import { googleBooksSource } from './googleBooksSource';
import { openLibrarySource } from './openLibrarySource';
import { BookSource } from './types';

export type { BookSource } from './types';

/** Declaration order is also the default search order. */
export const BOOK_SOURCES: BookSource[] = [googleBooksSource, openLibrarySource];

export const DEFAULT_SOURCE_CONFIG: BookSourceConfig[] = BOOK_SOURCES.map((source) => ({ id: source.id, enabled: true }));

export function findSource(id: BookSourceId): BookSource | undefined {
  return BOOK_SOURCES.find((source) => source.id === id);
}

/** The enabled sources, in the user's configured order. */
export function orderedSources(config: BookSourceConfig[]): BookSource[] {
  return config
    .filter((entry) => entry.enabled)
    .map((entry) => findSource(entry.id))
    .filter((source): source is BookSource => source !== undefined);
}

/**
 * Queries each configured source in turn and stops at the first non-empty answer.
 *
 * A source that cannot run — Google Books without a key — is skipped rather
 * than reported: with Open Library enabled the app stays usable with no
 * configuration at all. An alert is only warranted when nothing ran.
 *
 * A source answering "no match" is not a failure, so one clean empty answer
 * outweighs another source's error: the user hears "not found", not "offline".
 */
async function cascade<T>(
  config: BookSourceConfig[],
  apiKey: unknown,
  query: (source: BookSource) => Promise<BookApiResult<T>>,
  isEmpty: (data: T) => boolean,
  emptyValue: T
): Promise<BookApiResult<T>> {
  let ran = 0;
  let skipped = 0;
  let sawEmptyAnswer = false;
  let lastFailure: BookApiErrorKind | undefined;

  for (const source of orderedSources(config)) {
    if (!source.isConfigured(apiKey)) {
      skipped += 1;
      continue;
    }

    ran += 1;
    const result = await query(source);
    if (!result.ok) {
      lastFailure = result.kind;
      continue;
    }
    if (!isEmpty(result.data)) return result;
    sawEmptyAnswer = true;
  }

  if (ran === 0) return failure(skipped > 0 ? 'missing-key' : 'unknown');
  if (!sawEmptyAnswer && lastFailure !== undefined) return failure(lastFailure);
  return success(emptyValue);
}

export function searchTitleAcrossSources(query: string, config: BookSourceConfig[], apiKey: unknown) {
  return cascade<BookSearchResult[]>(config, apiKey, (source) => source.searchByTitle(query, apiKey), (data) => data.length === 0, []);
}

export function searchIsbnAcrossSources(isbn: string, config: BookSourceConfig[], apiKey: unknown) {
  return cascade<BookSearchResult | undefined>(config, apiKey, (source) => source.searchByIsbn(isbn, apiKey), (data) => data === undefined, undefined);
}

/** Details always go back to the source that produced the hit. */
export function fetchDetailsForResult(book: BookSearchResult, apiKey: unknown): Promise<BookApiResult<BookSearchResult>> {
  const source = findSource(book.sourceId);
  if (!source) return Promise.resolve(success(book));
  return source.fetchDetails(book, apiKey);
}
