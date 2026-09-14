import { getData } from '@/helpers/storage';
import { createContext, useContext, useEffect, useState } from 'react';
import * as ScreenCapture from 'expo-screen-capture';

type ScreenShotContextProps = [boolean, React.Dispatch<React.SetStateAction<boolean>>];

export const PreventScreenShotContext = createContext<ScreenShotContextProps | []>([]);

const PreventScreenShotProvider = ({ children }: { children: React.ReactNode }) => {
  const [isScreenShotDisabled, setIsScreenShotDisabled] = useState(false);

  const applyScreenCaptureSetting = (disabled: boolean) => {
    const call = disabled ? ScreenCapture.preventScreenCaptureAsync('screenshot') : ScreenCapture.allowScreenCaptureAsync('screenshot');
    call.catch((err) => console.log('[screenCapture] could not apply setting:', err instanceof Error ? err.message : err));
  };

  // Reading storage in the render body fired a new AsyncStorage read on every
  // render, and each resolution also hit the native ScreenCapture module.
  useEffect(() => {
    getData('isScreenShotDisabled').then((data) => {
      setIsScreenShotDisabled(data === true);
    });
  }, []);

  useEffect(() => {
    applyScreenCaptureSetting(isScreenShotDisabled);
  }, [isScreenShotDisabled]);

  return <PreventScreenShotContext.Provider value={[isScreenShotDisabled, setIsScreenShotDisabled]}>{children}</PreventScreenShotContext.Provider>;
};

export default PreventScreenShotProvider;

export const usePreventScreenShotContext = (): ScreenShotContextProps => {
  const [isScreenShotDisabled, setIsScreenShotDisabled] = useContext(PreventScreenShotContext);

  if (isScreenShotDisabled === undefined || setIsScreenShotDisabled === undefined) {
    throw new Error('Custom Error: isScreenShotDisabled or setIsScreenShotDisabled is undefined');
  }

  return [isScreenShotDisabled, setIsScreenShotDisabled];
};
