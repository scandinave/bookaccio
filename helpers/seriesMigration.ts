import { getBookList } from './getBookList';
import { detectSeries } from './series';
import { getData, setData } from './storage';

/**
 * One-time backfill that gives books already in the library a series.
 *
 * A version number rather than a boolean, so the pass can be replayed later if
 * the title parser improves.
 */
export const SERIES_DETECTION_VERSION = 1;

const VERSION_KEY = 'seriesDetectionVersion';

/**
 * Fills `series`/`seriesIndex` on the books that have none.
 *
 * Spreads the book instead of rebuilding it: a hand-written field list here
 * would destroy every other field of every book at once, irreversibly. Only
 * absent values are filled, so re-running never clobbers a user's correction.
 */
export function applySeriesDetection(books: Book[]): Book[] {
  return books.map((book) => {
    if (!book || book.series !== undefined) return book;

    const hint = detectSeries({ title: book.title, subtitle: book.subtitle });
    if (!hint) return book;

    return { ...book, series: hint.name, seriesIndex: hint.index };
  });
}

let inFlight: Promise<void> | undefined;

/** Fast Refresh remounts the root layout; two concurrent passes must not interleave. */
export function migrateSeriesOnce(): Promise<void> {
  if (!inFlight) inFlight = run();
  return inFlight;
}

async function run(): Promise<void> {
  if ((await getData(VERSION_KEY)) === SERIES_DETECTION_VERSION) return;

  // `getBookList` returns the error object itself when it fails, so the guard
  // is against an Error, not just against a missing value.
  const data = await getBookList();
  if (!Array.isArray(data)) {
    console.log('[series] migration skipped: stored book list is not an array');
    return;
  }

  const next = applySeriesDetection(data);
  if (next.length !== data.length) {
    throw new Error(`[series] migration would change the book count (${data.length} -> ${next.length})`);
  }

  if (next.some((book, index) => book !== data[index])) {
    // `storeBooks` swallows write failures and returns nothing, so go through
    // `setData` directly: marking the library migrated after a lost write would
    // leave it permanently ungrouped with the gate satisfied.
    const written = await setData('bookList', next);
    if (!written) {
      console.log('[series] migration not recorded: the book list could not be written');
      return;
    }
  }

  await setData(VERSION_KEY, SERIES_DETECTION_VERSION);
}
