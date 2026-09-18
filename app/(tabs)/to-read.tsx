import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import React, { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

const ToRead = () => {
  const [isDarkMode] = useDarkModeContext();

  const [accentColor] = useAccentColorContext();

  const [isBlackTheme] = useBlackThemeContext();

  const [hidePlusBtn, setHidePlusBtn] = useState(false);

  const [fullBookList] = useFullBookListContext();

  // One implementation for every book-list screen: a change here cannot miss one.
  const search = useBookSearch(BookState.READ_LATER);

  // Not optional: BookListLayout re-renders this subtree on every keystroke in
  // the search bar, and rebuilding the rows each time would allocate the lot.
  const entries = useMemo(() => buildListEntries(fullBookList, BookState.READ_LATER), [fullBookList]);

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
        ListFooterComponent={() => <View style={{ height: 10 }} />}
        onMomentumScrollBegin={() => setHidePlusBtn(true)}
        onMomentumScrollEnd={() => setHidePlusBtn(false)}
      />

      <Pressable
        onPress={search.openAddModal}
        style={styles.plusIcon}
      >
        {hidePlusBtn ? null : (
          <MaterialCommunityIcons
            name="plus-circle"
            size={70}
            color={accentColor}
          />
        )}
      </Pressable>

      <AddBookModals search={search} />
    </View>
  );
};

export default ToRead;

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
    bottom: 20,
  },
});
