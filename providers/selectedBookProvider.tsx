import { createContext, useContext, useState } from 'react';

type SelectedBookProps = [BookSearchResult | undefined, React.Dispatch<React.SetStateAction<BookSearchResult | undefined>>];

export const SelectedBookContext = createContext<SelectedBookProps | []>([]);

const SelectedBookProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | undefined>(undefined);

  return <SelectedBookContext.Provider value={[selectedBook, setSelectedBook]}>{children}</SelectedBookContext.Provider>;
};

export default SelectedBookProvider;

export function useSelectedBookContext(): SelectedBookProps {
  const [selectedBook, setSelectedBook] = useContext(SelectedBookContext);

  if (setSelectedBook === undefined) {
    throw new Error('useSelectedBookContext must be used inside SelectedBookProvider');
  }

  return [selectedBook, setSelectedBook];
}
