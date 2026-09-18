import axios from 'axios';
import { BookApiResult, REQUEST_TIMEOUT_MS, classifyHttpError, failure, isValidIsbn, logApiError, normalizeIsbn, success } from '../bookApi';
import { BookSource } from './types';

const SEARCH_ENDPOINT = 'https://openlibrary.org/search.json';
const COVER_ENDPOINT = 'https://covers.openlibrary.org/b/id';

/**
 * Without `fields` the search endpoint returns very large documents.
 *
 * The series columns are `series_name` / `series_position`, not `series`:
 * asking for `series` is accepted and then silently ignored, which would have
 * made series detection never fire with no error anywhere.
 */
const SEARCH_FIELDS =
  'key,title,subtitle,author_name,first_publish_year,number_of_pages_median,cover_i,isbn,language,publisher,series_name,series_position';

const RESULT_LIMIT = 20;

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  cover_i?: number;
  isbn?: string[];
  language?: string[];
  publisher?: string[];
  series_name?: string[];
  /** Positions arrive as strings, and "2.5" exists in the wild. */
  series_position?: string[];
};

/** `isbn` mixes 10- and 13-digit entries; prefer a 13. */
function pickIsbn(isbns?: string[]): string | undefined {
  if (!isbns?.length) return undefined;
  return isbns.find((value) => normalizeIsbn(value).length === 13) ?? isbns[0];
}

function pickSeriesIndex(positions?: string[]): number | undefined {
  const parsed = parseFloat(positions?.[0] ?? '');
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toSearchResult(doc: OpenLibraryDoc): BookSearchResult {
  return {
    sourceId: 'open-library',
    // e.g. "/works/OL82563W" — kept whole, it is what the details endpoint takes.
    ref: doc.key ?? '',
    title: doc.title ?? '',
    subtitle: doc.subtitle,
    authors: doc.author_name ? [...doc.author_name] : [],
    thumbnail: doc.cover_i ? `${COVER_ENDPOINT}/${doc.cover_i}-M.jpg` : undefined,
    publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
    publisher: doc.publisher?.[0],
    pageCount: doc.number_of_pages_median,
    isbn: pickIsbn(doc.isbn),
    // Open Library reports MARC codes ("fre", "ger") where Google uses two letters.
    language: doc.language?.[0],
    // The only place a real series *name* is available from either provider.
    series: doc.series_name?.[0],
    seriesIndex: pickSeriesIndex(doc.series_position),
  };
}

async function runSearch(query: string): Promise<BookApiResult<BookSearchResult[]>> {
  const url = `${SEARCH_ENDPOINT}?${query}&limit=${RESULT_LIMIT}&fields=${encodeURIComponent(SEARCH_FIELDS)}`;
  try {
    const res = await axios.get(url, { timeout: REQUEST_TIMEOUT_MS });
    const docs = res.data?.docs;
    return success(Array.isArray(docs) ? docs.map(toSearchResult) : []);
  } catch (err) {
    logApiError('open library search', err);
    return failure(classifyHttpError(err));
  }
}

export const openLibrarySource: BookSource = {
  id: 'open-library',
  hasSettings: false,
  // No credentials at all: this is what lets the app work out of the box.
  isConfigured: () => true,

  searchByTitle(query) {
    const trimmed = query.trim();
    if (trimmed === '') return Promise.resolve(success([]));
    return runSearch(`title=${encodeURIComponent(trimmed)}`);
  },

  async searchByIsbn(value) {
    const isbn = normalizeIsbn(value);
    if (!isValidIsbn(isbn)) return failure('invalid-isbn');

    const result = await runSearch(`q=isbn:${encodeURIComponent(isbn)}`);
    if (!result.ok) return result;
    // The search endpoint does not echo the ISBN we asked for, so keep it.
    const first = result.data[0];
    return success(first ? { ...first, isbn } : undefined);
  },

  /** The search endpoint carries no description; the work record does. */
  async fetchDetails(book) {
    if (!book.ref) return success(book);
    try {
      const res = await axios.get(`https://openlibrary.org${book.ref}.json`, { timeout: REQUEST_TIMEOUT_MS });
      const rawDescription = res.data?.description;
      // Older records store a plain string, newer ones a { type, value } object.
      const description = typeof rawDescription === 'string' ? rawDescription : rawDescription?.value;
      const subjects = Array.isArray(res.data?.subjects) ? res.data.subjects.slice(0, 5) : undefined;
      return success({ ...book, description: description ?? book.description, categories: subjects ?? book.categories });
    } catch (err) {
      // The hit is already usable; a missing description must not block the form.
      logApiError('open library work', err);
      return success(book);
    }
  },
};
