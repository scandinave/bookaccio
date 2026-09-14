import axios from 'axios';
import { BookApiResult, REQUEST_TIMEOUT_MS, buildVolumesUrl, classifyAxiosError, failure, logApiError, sanitizeApiKey, success } from './googleBooksApi';

/**
 * Probes a candidate API key with a cheap request.
 *
 * Returns the same `BookApiResult` shape as the search helpers, so the caller
 * can tell a rejected key from a device that is simply offline. The previous
 * version collapsed both into `null`, which made Settings claim the key was
 * wrong whenever the user had no connection.
 */
export async function checkApiKey(key: unknown): Promise<BookApiResult<true>> {
  const apiKey = sanitizeApiKey(key);
  if (apiKey === '') return failure('missing-key');

  try {
    await axios.get(buildVolumesUrl(encodeURIComponent('stoker'), apiKey), { timeout: REQUEST_TIMEOUT_MS });
    return success(true);
  } catch (err) {
    // Never log the error itself: its `config.url` carries the API key.
    logApiError('api key check', err);
    return failure(classifyAxiosError(err));
  }
}
