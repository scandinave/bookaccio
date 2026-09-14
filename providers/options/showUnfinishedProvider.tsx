import { getData } from '@/helpers/storage';
import { createContext, useContext, useEffect, useState } from 'react';

type UnfinishedContextProps = [boolean, React.Dispatch<React.SetStateAction<boolean>>];

const UnfinishedContext = createContext<UnfinishedContextProps | []>([]);

const UnfinishedProvider = ({ children }: { children: React.ReactNode }) => {
  const [showUnfinished, setShowUnfinished] = useState(false);
  // Reading storage in the render body fired a new AsyncStorage read on
  // every render, and each resolution triggered another render.
  useEffect(() => {
    getData('showUnfinished').then((data) => {
      if (data !== undefined) {
        setShowUnfinished(data);
      }
    });
  }, []);
  return <UnfinishedContext.Provider value={[showUnfinished, setShowUnfinished]}>{children}</UnfinishedContext.Provider>;
};

export default UnfinishedProvider;

export const useUnfinishedContext = (): UnfinishedContextProps => {
  const [showUnfinished, setShowUnfinished] = useContext(UnfinishedContext);

  if (showUnfinished === undefined || setShowUnfinished === undefined) {
    throw new Error('Custom Error: showUnfinished or setShowUnfinished is undefined');
  }

  return [showUnfinished, setShowUnfinished];
};
