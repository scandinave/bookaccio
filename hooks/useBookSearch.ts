import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard } from 'react-native';
import { router } from 'expo-router';
import BarcodeZxingScan from 'rn-barcode-zxing-scan';
import { BookStateStringProps } from '@/constants/bookState';
import { alertBookApiFailure, alertNoResult } from '@/helpers/bookSearchAlert';
import { fetchDetailsForResult, searchIsbnAcrossSources, searchTitleAcrossSources } from '@/helpers/sources';
import { useApiKeyContext } from '@/providers/apiKeyProvider';
import { useBookSourcesContext } from '@/providers/bookSourcesProvider';
import { useSelectedBookContext } from '@/providers/selectedBookProvider';

/**
 * Everything a book-list screen needs to search for a book.
 *
 * `seriesName` is set when the search starts from inside a series: the new
 * volume then joins that series whatever its title turns out to say.
 */
export function useBookSearch(targetState: BookStateStringProps, seriesName?: string) {
  const [, setSelectedBook] = useSelectedBookContext();
  const [apiKey] = useApiKeyContext();
  const [bookSources] = useBookSourcesContext();
  const { t } = useTranslation();

  const [firstModal, setFirstModal] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const [isbnModal, setIsbnModal] = useState(false);
  const [title, setTitle] = useState('');
  const [isbn, setIsbn] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const goToAddBook = () => {
    router.push({
      pathname: '/(addBook)/[addBook]',
      params: seriesName ? { addBook: targetState, series: seriesName } : { addBook: targetState },
    });
  };

  const openAddModal = () => setFirstModal(true);

  async function searchByTitle(value: string) {
    Keyboard.dismiss();
    if (value.trim() === '') return;
    setLoading(true);
    try {
      const result = await searchTitleAcrossSources(value, bookSources, apiKey);
      if (!result.ok) {
        alertBookApiFailure(result.kind, t);
        return;
      }
      setResults(result.data);
      setIsSearchActive(result.data.length > 0);
      if (result.data.length === 0) alertNoResult(t, 'title');
    } finally {
      setLoading(false);
    }
  }

  async function searchByIsbn(value: string) {
    Keyboard.dismiss();
    if (value.trim() === '') return;
    setLoading(true);
    try {
      const result = await searchIsbnAcrossSources(value, bookSources, apiKey);
      if (!result.ok) {
        alertBookApiFailure(result.kind, t);
        return;
      }
      if (!result.data) {
        alertNoResult(t, 'isbn');
        return;
      }
      await selectResult(result.data, { closeModal: () => setIsbnModal(false) });
    } finally {
      setLoading(false);
    }
  }

  async function selectResult(book: BookSearchResult, options?: { closeModal?: () => void }) {
    const detailed = await fetchDetailsForResult(book, apiKey);
    if (!detailed.ok) {
      // Stay on the results list: navigating would open the form filled with
      // whatever book was selected previously.
      alertBookApiFailure(detailed.kind, t);
      return;
    }
    setSelectedBook(detailed.data);
    Keyboard.dismiss();
    options?.closeModal?.();
    setSearchModal(false);
    goToAddBook();
  }

  function addManually() {
    setSelectedBook(undefined);
    Keyboard.dismiss();
    setFirstModal(false);
    goToAddBook();
  }

  function scanBarcode() {
    BarcodeZxingScan.showQrReader(async (error: any, data: any) => {
      if (error) {
        console.log('[bookSearch] barcode scan failed:', error);
        return;
      }
      setLoading(true);
      try {
        const result = await searchIsbnAcrossSources(data, bookSources, apiKey);
        if (!result.ok) {
          alertBookApiFailure(result.kind, t);
          return;
        }
        if (!result.data) {
          alertNoResult(t, 'isbn');
          return;
        }
        await selectResult(result.data);
      } finally {
        setLoading(false);
      }
    });
  }

  return {
    firstModal,
    setFirstModal,
    searchModal,
    setSearchModal,
    isbnModal,
    setIsbnModal,
    title,
    setTitle,
    isbn,
    setIsbn,
    isSearchActive,
    results,
    loading,
    openAddModal,
    searchByTitle,
    searchByIsbn,
    selectResult,
    addManually,
    scanBarcode,
  };
}
