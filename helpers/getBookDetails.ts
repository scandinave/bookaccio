import axios from 'axios';
import { BookApiResult, REQUEST_TIMEOUT_MS, failure, logApiError, success } from './bookApi';
import { buildVolumesUrl, classifyGoogleError, sanitizeApiKey } from './googleBooksApi';

/**
 * Searches Google Books by title.
 *
 * Resolves to an empty array when there is genuinely no match; every transport,
 * auth or quota failure comes back as `{ ok: false, kind }` so the caller can
 * tell the two apart.
 */
export const getBookDetails = async (bookTitle: string, apiKey: unknown): Promise<BookApiResult<BookSearchResultProp[]>> => {
  const query = bookTitle.trim();
  if (query === '') return success([]);

  const key = sanitizeApiKey(apiKey);
  if (key === '') return failure('missing-key');

  try {
    const res = await axios.get(buildVolumesUrl(encodeURIComponent(query), key), { timeout: REQUEST_TIMEOUT_MS });
    // Google omits `items` entirely when totalItems is 0.
    const items = res.data?.items;
    return success(Array.isArray(items) ? items : []);
  } catch (err) {
    logApiError('title search', err);
    return failure(classifyGoogleError(err));
  }
};
