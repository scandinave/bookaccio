import { getData } from '@/helpers/storage';
import { BOOK_SOURCES, DEFAULT_SOURCE_CONFIG } from '@/helpers/sources';
import { createContext, useContext, useEffect, useState } from 'react';

type BookSourcesContextProps = [BookSourceConfig[], React.Dispatch<React.SetStateAction<BookSourceConfig[]>>];

export const BookSourcesContext = createContext<BookSourcesContextProps | []>([]);

/**
 * Reconciles a stored configuration with the sources this build actually ships.
 *
 * Keeps the user's order, drops entries for sources that no longer exist, and
 * appends any new source as enabled — so adding a provider does not leave
 * existing installs unable to reach it.
 */
export function reconcileSourceConfig(stored: unknown): BookSourceConfig[] {
  if (!Array.isArray(stored)) return DEFAULT_SOURCE_CONFIG;

  const known = stored.filter((entry): entry is BookSourceConfig => !!entry && BOOK_SOURCES.some((source) => source.id === entry.id));
  const missing = BOOK_SOURCES.filter((source) => !known.some((entry) => entry.id === source.id)).map((source) => ({ id: source.id, enabled: true }));
  const merged = [...known, ...missing];

  // Never leave the user with nothing to search.
  return merged.some((entry) => entry.enabled) ? merged : DEFAULT_SOURCE_CONFIG;
}

const BookSourcesProvider = ({ children }: { children: React.ReactNode }) => {
  const [bookSources, setBookSources] = useState<BookSourceConfig[]>(DEFAULT_SOURCE_CONFIG);

  useEffect(() => {
    getData('bookSources').then((stored) => {
      setBookSources(reconcileSourceConfig(stored));
    });
  }, []);

  return <BookSourcesContext.Provider value={[bookSources, setBookSources]}>{children}</BookSourcesContext.Provider>;
};

export default BookSourcesProvider;

export const useBookSourcesContext = (): BookSourcesContextProps => {
  const [bookSources, setBookSources] = useContext(BookSourcesContext);

  if (bookSources === undefined || setBookSources === undefined) {
    throw new Error('bookSources or setBookSources is undefined');
  }

  return [bookSources, setBookSources];
};
