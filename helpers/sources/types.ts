import { BookApiResult } from '../bookApi';

/**
 * Contract every book provider implements.
 *
 * `ref` in a `BookSearchResult` is opaque outside its own source: only the
 * source that produced it knows how to turn it back into a full record.
 */
export interface BookSource {
  id: BookSourceId;
  /**
   * Whether the user has anything to set for this source. Distinct from
   * `isConfigured`: Open Library is always ready yet has nothing to configure,
   * so `isConfigured` alone cannot tell the settings screen what is tappable.
   */
  hasSettings: boolean;
  /**
   * Whether this source can be queried right now. Credentials are a private
   * matter between a source and its provider — the cascade only asks.
   */
  isConfigured(apiKey: unknown): boolean;
  searchByTitle(query: string, apiKey: unknown): Promise<BookApiResult<BookSearchResult[]>>;
  searchByIsbn(isbn: string, apiKey: unknown): Promise<BookApiResult<BookSearchResult | undefined>>;
  /** Enriches a search hit with the fields the list endpoint does not carry. */
  fetchDetails(result: BookSearchResult, apiKey: unknown): Promise<BookApiResult<BookSearchResult>>;
}
