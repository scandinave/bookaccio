declare module '*.png';

declare module 'rn-barcode-zxing-scan';

declare interface SettingItemProps {
  label: string;
  data: { title: string; value: string | boolean }[];
}

declare interface BookItem {
  author: string;
  currentPage: number;
  endDate: number;
  googleBooksLink: string;
  id: number;
  isbn: string;
  labels: any;
  language: string;
  pageCount: number;
  position: number;
  publishedDate: string;
  rating: number;
  startDate: number;
  state: string;
  subTitle: string;
  summary: string;
  thumbnailAddress: string;
  title: string;
  wishlistDate: number;
}

declare interface BookSearchResultProp {
  id: string;
  selfLink: string;
  volumeInfo: {
    authors: [author: string];
    canonicalVolumeLink: string;
    categories: [];
    description: string;
    imageLinks: { thumbnail: string };
    language: string;
    publishedDate: string;
    publisher: string;
    title: string;
    subtitle: string;
    industryIdentifiers: { type: string; identifier: string }[];
    pageCount: number;
    /**
     * Undocumented, and absent from most volumes. It carries a rank and an
     * opaque series id — never the series name, which is why the name is
     * always recovered from the title.
     */
    seriesInfo?: {
      bookDisplayNumber?: string;
      volumeSeries?: { seriesId?: string; orderNumber?: number }[];
    };
  };
}

declare type BookSourceId = 'google-books' | 'open-library';

/**
 * A search hit, normalised across providers.
 *
 * Screens and the add-book form consume this shape only, so adding a provider
 * never reaches past its own source module.
 */
declare interface BookSourceConfig {
  id: BookSourceId;
  enabled: boolean;
}

declare interface BookSearchResult {
  sourceId: BookSourceId;
  /** Provider-specific handle used to fetch the full record. */
  ref: string;
  title: string;
  subtitle?: string;
  authors: string[];
  thumbnail?: string;
  publishedDate?: string;
  publisher?: string;
  pageCount?: number;
  description?: string;
  categories?: string[];
  isbn?: string;
  language?: string;
  /** Series name as the provider reports it. */
  series?: string;
  /** Rank within the series. */
  seriesIndex?: number;
}

declare interface Book {
  id: number;
  currentPage: number;
  authors?: string[];
  categories?: string[];
  description?: string;
  imageLinks?: {
    extraLarge?: string;
    large?: string;
    medium?: string;
    small?: string;
    smallThumbnail?: string;
    thumbnail?: string;
  };
  language?: string;
  maturityRating?: 'NOT_MATURE' | 'MATURE';
  pageCount: number;
  previewLink?: string;
  printedPageCount?: number;
  publishedDate?: string;
  publisher?: string;
  subtitle?: string;
  title?: string;
  state?: 'READ' | 'READING' | 'READ_LATER' | 'UNFINISHED';
  startDate: number;
  endDate: number;
  rating?: number;
  isbn?: string;
  notes?: string;
  review?: string;
  originalTitle?: string;
  translator?: string;
  /**
   * Series this volume belongs to. Absent or empty means a standalone book.
   * Filled by detection when the book is created, and freely editable after.
   */
  series?: string;
  /** Rank within the series; absent when it is not known. */
  seriesIndex?: number;
}

declare interface BookOptional {
  id: number;
  currentPage?: number;
  authors?: string[];
  categories?: string[];
  description?: string;
  imageLinks?: {
    extraLarge?: string;
    large?: string;
    medium?: string;
    small?: string;
    smallThumbnail?: string;
    thumbnail?: string;
  };
  language?: string;
  maturityRating?: 'NOT_MATURE' | 'MATURE';
  pageCount?: number;
  previewLink?: string;
  printedPageCount?: number;
  publishedDate?: string;
  publisher?: string;
  subtitle?: string;
  title?: string;
  state?: 'READ' | 'READING' | 'READ_LATER' | 'UNFINISHED';
  startDate?: Date;
  endDate?: Date;
  rating?: number;
  isbn?: string;
}

declare interface CryptoDetails {
  name: string;
  code: string;
  address: string;
  icon: string;
  offIcon: any;
}
