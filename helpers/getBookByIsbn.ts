import axios from 'axios';
import { BookApiResult, REQUEST_TIMEOUT_MS, buildVolumesUrl, classifyAxiosError, failure, isValidIsbn, logApiError, normalizeIsbn, sanitizeApiKey, success } from './googleBooksApi';

/**
 * Looks a book up by ISBN, accepting hyphenated input and raw barcode payloads.
 *
 * Resolves to `undefined` when the ISBN is well formed but unknown to Google;
 * a malformed code is reported as `invalid-isbn` without hitting the network.
 */
export async function getBookByIsbn(value: string, apiKey: unknown): Promise<BookApiResult<BookSearchResultProp | undefined>> {
  const isbn = normalizeIsbn(value);
  if (!isValidIsbn(isbn)) return failure('invalid-isbn');

  const key = sanitizeApiKey(apiKey);
  if (key === '') return failure('missing-key');

  try {
    const res = await axios.get(buildVolumesUrl(`isbn:${encodeURIComponent(isbn)}`, key), { timeout: REQUEST_TIMEOUT_MS });
    const items = res.data?.items;
    return success(Array.isArray(items) && items.length > 0 ? items[0] : undefined);
  } catch (err) {
    logApiError('isbn search', err);
    return failure(classifyAxiosError(err));
  }
}
