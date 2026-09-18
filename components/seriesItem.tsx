import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import BookCover from '@/components/bookCover';
import { SeriesEntry } from '@/helpers/buildListEntries';
import { useAccentColorContext } from '@/providers/accentColorProvider';
import { useDarkModeContext } from '@/providers/themeProvider';
import { useFontsContext } from '@/providers/fontProvider';

/**
 * One series, collapsed to a single row among the standalone books.
 *
 * Built on the same container as `bookItem` so a mixed list stays even. The
 * three-dot menu is replaced by a chevron: a series has no status of its own to
 * move and no cover file to delete — those actions live on its volumes.
 */
export default function SeriesItem({ data }: { data: SeriesEntry }) {
  const [isDarkMode] = useDarkModeContext();
  const [accentColor] = useAccentColorContext();
  const [font] = useFontsContext();

  const first = data.volumes[0];
  const authors = data.volumes.find((volume) => volume?.authors?.[0])?.authors?.[0];

  return (
    <TouchableOpacity
      onPress={() => {
        router.push({
          pathname: '/(series)/[series]',
          params: { series: data.key, name: data.name },
        });
      }}
    >
      <View style={[styles.container, { borderColor: isDarkMode ? Colors.gray : Colors.dark }]}>
        <View>
          <BookCover
            style={styles.image}
            uri={first?.imageLinks?.thumbnail}
          />
        </View>
        <View style={styles.midContent}>
          <Text
            numberOfLines={1}
            style={[styles.title, { color: isDarkMode ? Colors.light : Colors.dark, fontFamily: `${font}B` }]}
          >
            {data.name.toUpperCase()}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.author, { color: isDarkMode ? Colors.gray : Colors.dark, fontFamily: `${font}R` }]}
          >
            {authors}
          </Text>
        </View>
        <View style={styles.endContent}>
          <Text style={[styles.count, { color: isDarkMode ? Colors.light : Colors.dark, fontFamily: `${font}R` }]}>({data.volumes.length})</Text>
          <MaterialIcons
            name="chevron-right"
            size={26}
            color={accentColor}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    margin: 10,
    padding: 10,
    borderWidth: 1,
    gap: 10,
    marginBottom: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },

  image: {
    width: 55,
    height: 80,
    borderRadius: 5,
  },

  midContent: {
    flex: 4,
    width: '70%',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },

  title: {
    letterSpacing: 0.5,
  },

  author: {
    width: 175,
    paddingBottom: 2,
  },

  endContent: {
    flex: 1.2,
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  count: {
    marginRight: 2,
  },
});
