import { BookApiResult, success } from '../bookApi';
import { sanitizeApiKey } from '../googleBooksApi';
import { getBookDetails } from '../getBookDetails';
import { getBookByIsbn } from '../getBookByIsbn';
import { getVolumeById } from '../getVolumeById';
import { BookSource } from './types';

/** Google returns "Fiction / Fantasy" style categories and http: thumbnails. */
function toSearchResult(volume: BookSearchResultProp): BookSearchResult {
  const info = volume?.volumeInfo;
  const identifiers = info?.industryIdentifiers ?? [];
  const isbn13 = identifiers.find((entry) => entry?.type === 'ISBN_13')?.identifier;

  return {
    sourceId: 'google-books',
    ref: volume?.id,
    title: info?.title ?? '',
    subtitle: info?.subtitle,
    authors: info?.authors ? [...info.authors] : [],
    thumbnail: info?.imageLinks?.thumbnail,
    publishedDate: info?.publishedDate?.slice(0, 4),
    publisher: info?.publisher,
    pageCount: info?.pageCount,
    description: info?.description,
    categories: info?.categories ? [...info.categories] : undefined,
    isbn: isbn13 ?? identifiers[0]?.identifier,
    language: info?.language,
  };
}

export const googleBooksSource: BookSource = {
  id: 'google-books',
  hasSettings: true,
  isConfigured: (apiKey) => sanitizeApiKey(apiKey) !== '',

  async searchByTitle(query, apiKey) {
    const result = await getBookDetails(query, apiKey);
    return result.ok ? success(result.data.map(toSearchResult)) : result;
  },

  async searchByIsbn(isbn, apiKey) {
    const result = await getBookByIsbn(isbn, apiKey);
    if (!result.ok) return result;
    return success(result.data ? toSearchResult(result.data) : undefined);
  },

  async fetchDetails(book, apiKey): Promise<BookApiResult<BookSearchResult>> {
    const result = await getVolumeById(book.ref, apiKey);
    return result.ok ? success(toSearchResult(result.data)) : result;
  },
};
