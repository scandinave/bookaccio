import { getData } from '@/helpers/storage';
import { createContext, useContext, useEffect, useState } from 'react';

type ShowPageNumberContextProps = [boolean, React.Dispatch<React.SetStateAction<boolean>>];

const ShowPageNumberContext = createContext<ShowPageNumberContextProps | []>([]);

const ShowPageNumberProvider = ({ children }: { children: React.ReactNode }) => {
  const [pageNumberShown, setPageNumberShown] = useState(true);

  // Reading storage in the render body fired a new AsyncStorage read on
  // every render, and each resolution triggered another render.
  useEffect(() => {
    getData('pageNumberShown').then((value) => {
      if (value !== undefined) {
        setPageNumberShown(value);
      }
    });
  }, []);

  return <ShowPageNumberContext.Provider value={[pageNumberShown, setPageNumberShown]}>{children}</ShowPageNumberContext.Provider>;
};

export default ShowPageNumberProvider;

export const usePageNumberShownContext = (): ShowPageNumberContextProps => {
  const [pageNumberShown, setPageNumberShown] = useContext(ShowPageNumberContext);

  if (pageNumberShown === undefined || setPageNumberShown === undefined) {
    throw new Error('Custom Error: ratingShown or setRatingShown is undefined');
  }

  return [pageNumberShown, setPageNumberShown];
};
