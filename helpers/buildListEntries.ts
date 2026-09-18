import { BookState, BookStateStringProps } from '@/constants/bookState';
import { seriesKey } from './series';

export type SeriesEntry = {
  kind: 'series';
  key: string;
  /** First spelling encountered, kept for display. */
  name: string;
  volumes: Book[];
  state?: BookStateStringProps;
};

export type ListEntry = { kind: 'book'; book: Book } | SeriesEntry;

/**
 * Highest priority *present* wins — no counting.
 *
 * A majority rule would move a seven-volume series to "Done" as soon as the
 * sixth was finished, dropping it out of "Reading" exactly when it matters.
 * Pure priority is deterministic, needs no tie-break, and a series only leaves
 * a tab when its last volume of that status does.
 */
const STATE_PRIORITY: BookStateStringProps[] = [BookState.READING, BookState.READ_LATER, BookState.UNFINISHED, BookState.READ];

function dominantState(volumes: Book[]): BookStateStringProps | undefined {
  // Undefined when no volume has a state, so such a series shows up in no tab —
  // the same treatment a stateless standalone book already gets.
  return STATE_PRIORITY.find((candidate) => volumes.some((volume) => volume?.state === candidate));
}

/** By rank, volumes without one last, then by title. */
export function compareVolumes(a: Book, b: Book): number {
  const left = typeof a?.seriesIndex === 'number' && Number.isFinite(a.seriesIndex) ? a.seriesIndex : Infinity;
  const right = typeof b?.seriesIndex === 'number' && Number.isFinite(b.seriesIndex) ? b.seriesIndex : Infinity;

  // The guard also keeps `Infinity - Infinity` (NaN, an inconsistent
  // comparator) out of the result when neither volume carries a rank.
  if (left !== right) return left - right;

  return (a?.title ?? '').localeCompare(b?.title ?? '');
}

/** Every volume of one series, in reading order. */
export function collectSeriesVolumes(books: Book[], key: string): Book[] {
  return books.filter((book) => seriesKey(book?.series) === key).sort(compareVolumes);
}

/**
 * The rows one status list shows: standalone books of that status, plus the
 * series whose dominant status is that one, collapsed to a single row.
 *
 * A series is emitted at the position of its first volume in the full array, so
 * its place is the same in every tab and the order `handleSort` persists still
 * means something. The consequence to accept: after sorting by title a series
 * sits where its alphabetically-first *volume* is, not under its own name.
 */
export function buildListEntries(books: Book[], state: BookStateStringProps): ListEntry[] {
  const groups = new Map<string, Book[]>();

  for (const book of books) {
    const key = seriesKey(book?.series);
    if (!key) continue;

    const bucket = groups.get(key);
    if (bucket) bucket.push(book);
    else groups.set(key, [book]);
  }

  const emitted = new Set<string>();
  const entries: ListEntry[] = [];

  for (const book of books) {
    const key = seriesKey(book?.series);

    if (!key) {
      entries.push({ kind: 'book', book });
      continue;
    }

    if (emitted.has(key)) continue;
    emitted.add(key);

    const volumes = [...(groups.get(key) ?? [])].sort(compareVolumes);
    entries.push({
      kind: 'series',
      key,
      name: (book.series ?? '').trim(),
      volumes,
      state: dominantState(volumes),
    });
  }

  return entries.filter((entry) => (entry.kind === 'book' ? entry.book?.state === state : entry.state === state));
}
