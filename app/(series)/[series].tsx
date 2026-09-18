import { ActivityIndicator, FlatList, InteractionManager, Pressable, StyleSheet, View } from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BookItem from '@/components/bookItem';
import AddBookModals from '@/components/addBookModals';
import { Colors } from '@/constants/Colors';
import { BookState } from '@/constants/bookState';
import { collectSeriesVolumes } from '@/helpers/buildListEntries';
import { getBookList } from '@/helpers/getBookList';
import { useBookSearch } from '@/hooks/useBookSearch';
import { useAccentColorContext } from '@/providers/accentColorProvider';
import { useBlackThemeContext } from '@/providers/blackThemeProvider';
import { useFullBookListContext } from '@/providers/booksFullListProvider';
import { useDarkModeContext } from '@/providers/themeProvider';

/**
 * Every volume of one series, whatever its status.
 *
 * Volumes are plain `BookItem`s, so editing (through the details screen) and
 * deleting (through the three-dot menu) keep working here with no extra code —
 * which is precisely where those actions were asked to live.
 */
const Series = () => {
  const insets = useSafeAreaInsets();

  const [isDarkMode] = useDarkModeContext();

  const [accentColor] = useAccentColorContext();

  const [isBlackTheme] = useBlackThemeContext();

  const [fullBookList, setFullBookList] = useFullBookListContext();

  const { series, name } = useLocalSearchParams<{ series: string; name?: string }>();

  const [isHydrated, setIsHydrated] = useState(false);

  const isFocused = useIsFocused();

  /**
   * Reads the list itself rather than trusting the context.
   *
   * Leaving the tabs does clear the search filter, but `onSearch('')` reads
   * storage asynchronously while this screen mounts and paints immediately —
   * so searching, then opening a series, would flash a partial list. Every
   * other pushed screen in the app hydrates the same way.
   */
  useEffect(() => {
    getBookList().then((data) => {
      if (Array.isArray(data)) setFullBookList([...data]);
      setIsHydrated(true);
    });
  }, []);

  // A new volume is one you have not read yet; the form's status list can still
  // be changed before saving.
  const search = useBookSearch(BookState.READ_LATER, name);

  const volumes = useMemo(() => collectSeriesVolumes(fullBookList, series ?? ''), [fullBookList, series]);

  useEffect(() => {
    if (!isHydrated || !isFocused || volumes.length > 0) return;

    // Leaving synchronously would navigate while the delete confirmation modal
    // is still dismissing, which strands its backdrop — the same trap the add
    // screen works around with `onModalHide`.
    const task = InteractionManager.runAfterInteractions(() => router.back());
    return () => task.cancel();
  }, [isHydrated, isFocused, volumes.length]);

  return (
    <View style={[styles.container, { backgroundColor: isBlackTheme ? Colors.fullBlack : isDarkMode ? Colors.black : Colors.white }]}>
      <ActivityIndicator
        style={styles.activitiyIndicator}
        animating={search.loading}
        size={'large'}
        color={accentColor}
      />
      <FlatList
        keyExtractor={(book) => book.id.toString()}
        data={volumes}
        extraData={volumes}
        renderItem={({ item }) => <BookItem data={item} />}
        ListFooterComponent={() => <View style={{ height: 10 + insets.bottom }} />}
      />

      {/* No tab bar here, so the button carries the system inset itself. */}
      <View style={{ height: 75 + insets.bottom }}>
        <Pressable
          onPress={search.openAddModal}
          style={[styles.plusIcon, { bottom: 10 + insets.bottom }]}
        >
          <MaterialCommunityIcons
            name="plus-circle"
            size={60}
            color={accentColor}
          />
        </Pressable>
      </View>

      <AddBookModals search={search} />
    </View>
  );
};

export default Series;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  activitiyIndicator: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },

  plusIcon: {
    position: 'absolute',
    right: 30,
    bottom: 10,
  },
});
