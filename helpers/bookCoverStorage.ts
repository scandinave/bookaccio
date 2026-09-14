import { Directory, File, Paths } from 'expo-file-system';

const COVERS_DIRNAME = 'covers';

/**
 * Covers picked from the gallery used to be stored as the ImagePicker cache URI
 * (`.../cache/ImagePicker/xxx.jpeg`). Android purges that directory whenever it
 * likes, so the cover silently disappeared. These helpers copy the picked file
 * into the document directory, which the system never reclaims.
 */
function coversDirectory(): Directory {
  const dir = new Directory(Paths.document, COVERS_DIRNAME);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** True only for files this module created — never touch remote URLs or foreign paths. */
export function isManagedCover(uri?: string | null): boolean {
  return !!uri && uri.startsWith('file://') && uri.includes(`/${COVERS_DIRNAME}/`);
}

/**
 * Copies a freshly picked image into permanent storage and returns its new URI.
 * Anything already permanent — a remote Google Books thumbnail, or a cover we
 * stored earlier — is passed through untouched.
 *
 * Called at save time rather than at pick time, so backing out of the form
 * leaves no orphan file behind.
 */
export function persistCoverIfNeeded(uri: string | undefined, bookId: number): string | undefined {
  if (!uri || !uri.startsWith('file://') || isManagedCover(uri)) return uri;

  try {
    const source = new File(uri);
    const extension = source.extension && source.extension.length <= 5 ? source.extension : '.jpg';
    const target = new File(coversDirectory(), `cover-${bookId}-${Date.now()}${extension}`);
    if (target.exists) target.delete();
    source.copy(target);
    return target.uri;
  } catch (err) {
    // Degrading to the cache URI keeps the book saveable; the cover may not survive.
    console.log('[cover] could not persist cover:', err instanceof Error ? err.message : err);
    return uri;
  }
}

export function deleteBookCover(uri?: string | null): void {
  try {
    if (!isManagedCover(uri)) return;
    const file = new File(uri!);
    if (file.exists) file.delete();
  } catch (err) {
    console.log('[cover] could not delete cover:', err instanceof Error ? err.message : err);
  }
}
