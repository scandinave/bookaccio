/**
 * Series detection, shared by every provider and by the one-time migration.
 *
 * Nothing here may know about a particular service — same rule as `bookApi.ts`.
 * A provider hands over what it found; this module decides what a series is.
 */

export type SeriesHint = { name: string; index?: number };

/** Roman numerals, anchored so the pattern cannot match the empty string. */
const ROMAN = '(?=[MDCLXVI])M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})';

const NUMBER = `(?:\\d{1,4}|${ROMAN})`;

/** Explicit volume markers, in the four languages the app ships. */
const MARKER = '(?:tomes?|t\\.?|livres?|parties?|vol\\.?|volumes?|books?|band|libro|pt\\.?)';

/**
 * At least one separator before the marker — not optional.
 *
 * With `*` here, "Fahrenheit 451" matched: the `t.` marker latched onto the
 * final `t` of *Fahrenheit* and the book became volume 451 of a series called
 * "Fahrenhei". The `\b` in front of the marker guards the same class of bug.
 */
const SEPARATOR = '[\\s,:;\\-–—(\\[]+';

const PATTERNS: RegExp[] = [
  // "Dune, tome 2" · "Le Seigneur des Anneaux, T3" · "Discworld (Vol. 5)"
  new RegExp(`^(.+?)${SEPARATOR}\\b${MARKER}\\s*(${NUMBER})(?!\\w)`, 'i'),
  // "Fondation #4" — no word boundary precedes `#`, so it needs its own pattern.
  /^(.+?)\s*#\s*(\d{1,4})(?!\w)/,
  // "Le Trône de Fer - 1" — a spaced dash is specific enough to spare "1984".
  /^(.+?)\s+[-–—]\s+(\d{1,3})\s*$/,
];

const ROMAN_VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

function romanToNumber(value: string): number | undefined {
  let total = 0;
  for (let i = 0; i < value.length; i++) {
    const current = ROMAN_VALUES[value[i]];
    if (current === undefined) return undefined;
    const next = ROMAN_VALUES[value[i + 1]];
    total += next !== undefined && next > current ? -current : current;
  }
  return total > 0 ? total : undefined;
}

function toIndex(raw: string): number | undefined {
  if (/^\d+$/.test(raw)) {
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return romanToNumber(raw.toUpperCase());
}

function foldAccents(value: string): string {
  try {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
  } catch {
    // Some Hermes builds ship without full Unicode normalisation. Grouping then
    // stays accent-sensitive, which only matters for a series spelled both ways.
    return value;
  }
}

/**
 * The value books are grouped on: case- and accent-insensitive.
 *
 * Slashes are stripped because the key travels as a dynamic route segment —
 * "Le Trône de Fer / A Song of Ice and Fire" would otherwise split the path.
 */
export function seriesKey(name?: string): string {
  if (!name) return '';
  return foldAccents(name).toLowerCase().replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Reads a series out of a title.
 *
 * Deliberately conservative: a bare trailing number is refused, so "1984",
 * "Apollo 13" and "Fahrenheit 451" stay standalone books. Spelled-out numbers
 * ("Book Three") are not handled — a miss, never a false positive, and the
 * Series field is editable.
 */
export function parseSeriesFromTitle(title?: string, subtitle?: string): SeriesHint | undefined {
  for (const candidate of [title, subtitle]) {
    const trimmed = candidate?.trim();
    if (!trimmed) continue;

    for (const pattern of PATTERNS) {
      const match = pattern.exec(trimmed);
      if (!match) continue;

      const name = match[1].replace(/[\s,:;\-–—(\[]+$/, '').trim();
      if (name.length < 2) continue;

      const index = toIndex(match[2]);
      if (index === undefined) continue;

      return { name, index };
    }
  }
  return undefined;
}

/**
 * Provider metadata first, title second.
 *
 * In practice the metadata path only fires for Open Library, and only for
 * users without a Google Books key: the source cascade stops at the first
 * non-empty answer, so a configured Google key hides Open Library entirely.
 * The title parser is the main road, not the shoulder.
 */
export function detectSeries(result?: Partial<BookSearchResult>): SeriesHint | undefined {
  const fromTitle = parseSeriesFromTitle(result?.title, result?.subtitle);

  const name = result?.series?.trim();
  if (name) {
    return { name, index: result?.seriesIndex ?? fromTitle?.index };
  }

  // Google reports a rank without a name. Keep the rank and take the name from
  // the title, rather than dropping a good number for want of a label.
  if (!fromTitle) return undefined;
  return { name: fromTitle.name, index: result?.seriesIndex ?? fromTitle.index };
}
