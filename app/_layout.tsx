import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import Providers from '@/providers/providers';
import { useSeriesMigration } from '@/hooks/useSeriesMigration';

/** Matches the splash background, so the startup gate is not a white flash. */
const SPLASH_BACKGROUND = '#77b3d4';

export default function RootLayout() {
  // Declared before the gate below, and therefore before any screen mounts:
  // nothing may read `bookList` until the backfill has rewritten it.
  const isMigrated = useSeriesMigration();

  const [loaded] = useFonts({
    LibreB: require('../assets/fonts/LibreBaskerville-Bold.ttf'),
    LibreR: require('../assets/fonts/LibreBaskerville-Regular.ttf'),
    LoraB: require('../assets/fonts/Lora-Bold.ttf'),
    LoraR: require('../assets/fonts/Lora-Regular.ttf'),
    MontB: require('../assets/fonts/Montserrat-Bold.ttf'),
    MontR: require('../assets/fonts/Montserrat-Regular.ttf'),
    NunitoB: require('../assets/fonts/Nunito-Bold.ttf'),
    NunitoR: require('../assets/fonts/Nunito-Regular.ttf'),
    OswaldB: require('../assets/fonts/Oswald-Bold.ttf'),
    OswaldR: require('../assets/fonts/Oswald-Regular.ttf'),
    PlayFairB: require('../assets/fonts/PlayfairDisplay-Bold.ttf'),
    PlayFairR: require('../assets/fonts/PlayfairDisplay-Regular.ttf'),
    PoppinsB: require('../assets/fonts/Poppins-Bold.ttf'),
    PoppinsL: require('../assets/fonts/Poppins-Light.ttf'),
    PoppinsR: require('../assets/fonts/Poppins-Regular.ttf'),
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    QuicksandB: require('../assets/fonts/Quicksand-Bold.ttf'),
    QuicksandR: require('../assets/fonts/Quicksand-Regular.ttf'),
  });

  if (!loaded || !isMigrated) {
    return <View style={{ flex: 1, backgroundColor: SPLASH_BACKGROUND }} />;
  }

  return (
    <Providers>
      <Stack>
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(settings)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(bookDetails)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(addBook)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(editBook)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(unfinished)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(series)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(cryptoAddress)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(statistics)"
          options={{ headerShown: false }}
        />
      </Stack>
    </Providers>
  );
}
