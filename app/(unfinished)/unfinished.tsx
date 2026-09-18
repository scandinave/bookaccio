import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import React, { useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BookItem from '@/components/bookItem';
import SeriesItem from '@/components/seriesItem';
import AddBookModals from '@/components/addBookModals';
import { Colors } from '@/constants/Colors';
import { BookState } from '@/constants/bookState';
import { buildListEntries } from '@/helpers/buildListEntries';
import { useBookSearch } from '@/hooks/useBookSearch';
import { useAccentColorContext } from '@/providers/accentColorProvider';
import { useBlackThemeContext } from '@/providers/blackThemeProvider';
import { useFullBookListContext } from '@/providers/booksFullListProvider';
import { useDarkModeContext } from '@/providers/themeProvider';

const Unfinished = () => {
  const [isDarkMode] = useDarkModeContext();

  const [accentColor] = useAccentColorContext();

  const [isBlackTheme] = useBlackThemeContext();

  const [fullBookList] = useFullBookListContext();

  const insets = useSafeAreaInsets();

  // One implementation for every book-list screen: a change here cannot miss one.
  const search = useBookSearch(BookState.UNFINISHED);

  // Not optional: BookListLayout re-renders this subtree on every keystroke in
  // the search bar, and rebuilding the rows each time would allocate the lot.
  const entries = useMemo(() => buildListEntries(fullBookList, BookState.UNFINISHED), [fullBookList]);

  return (
    <View style={[styles.container, { backgroundColor: isBlackTheme ? Colors.fullBlack : isDarkMode ? Colors.black : Colors.white }]}>
      <ActivityIndicator
        style={styles.activitiyIndicator}
        animating={search.loading}
        size={'large'}
        color={accentColor}
      />
      <FlatList
        // Never index-based: entries shift as books are moved or deleted, and a
        // reused BookItem would carry its open menu over to another row.
        keyExtractor={(entry) => (entry.kind === 'series' ? `s:${entry.key}` : `b:${entry.book.id}`)}
        data={entries}
        extraData={entries}
        renderItem={({ item }) => (item.kind === 'series' ? <SeriesItem data={item} /> : <BookItem data={item.book} />)}
        ListFooterComponent={() => <View style={{ height: 10 + insets.bottom }} />}
        // Unlike the tabs, this screen keeps its two buttons visible while
        // scrolling — the back button is the only way out of it.
      />

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
        <Pressable
          onPress={() => router.back()}
          style={[styles.backIcon, { bottom: 10 + insets.bottom }]}
        >
          <MaterialCommunityIcons
            name="arrow-left-circle"
            size={60}
            color={accentColor}
          />
        </Pressable>
      </View>

      <AddBookModals search={search} />
    </View>
  );
};

export default Unfinished;

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

  backIcon: {
    position: 'absolute',
    left: 30,
    bottom: 10,
  },
});
