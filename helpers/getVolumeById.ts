import axios from 'axios';
import { BookApiResult, REQUEST_TIMEOUT_MS, failure, logApiError, success } from './bookApi';
import { buildVolumeByIdUrl, classifyGoogleError, sanitizeApiKey } from './googleBooksApi';

/**
 * Fetches the full volume for a search result.
 */
export async function getVolumeById(volumeId: string, apiKey: unknown): Promise<BookApiResult<BookSearchResultProp>> {
  const key = sanitizeApiKey(apiKey);
  if (key === '') return failure('missing-key');

  try {
    const res = await axios.get(buildVolumeByIdUrl(volumeId, key), { timeout: REQUEST_TIMEOUT_MS });
    return success(res.data);
  } catch (err) {
    logApiError('volume fetch', err);
    return failure(classifyGoogleError(err));
  }
}
