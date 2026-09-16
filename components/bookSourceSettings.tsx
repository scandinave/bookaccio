import { StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import { useState } from 'react';
import BouncyCheckbox from 'react-native-bouncy-checkbox';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';
import { setData } from '@/helpers/storage';
import { findSource } from '@/helpers/sources';
import { useAccentColorContext } from '@/providers/accentColorProvider';
import { useApiKeyContext } from '@/providers/apiKeyProvider';
import { useDarkModeContext } from '@/providers/themeProvider';
import { useBookSourcesContext } from '@/providers/bookSourcesProvider';
import BookSourceConfigModal from '@/components/bookSourceConfigModal';

/** Proper nouns: deliberately not translated. */
const SOURCE_LABELS: Record<BookSourceId, string> = {
  'google-books': 'Google Books',
  'open-library': 'Open Library',
};

/**
 * Lets the user pick which providers are searched, and in which order.
 *
 * Order is a priority: the search stops at the first source that returns
 * something, so the top entry is tried first. A source's own settings live in
 * a modal rather than on this page, which would otherwise grow by a whole
 * section per provider.
 */
export default function BookSourceSettings() {
  const [bookSources, setBookSources] = useBookSourcesContext();
  const [accentColor] = useAccentColorContext();
  const [isDarkMode] = useDarkModeContext();
  const [apiKey] = useApiKeyContext();
  const { t } = useTranslation();

  const [configuring, setConfiguring] = useState<BookSourceId | null>(null);

  const textColor = isDarkMode ? Colors.light : Colors.dark;

  const persist = (next: BookSourceConfig[]) => {
    setBookSources(next);
    setData('bookSources', next);
  };

  const toggle = (id: BookSourceId, enabled: boolean) => {
    const next = bookSources.map((entry) => (entry.id === id ? { ...entry, enabled } : entry));
    if (!next.some((entry) => entry.enabled)) {
      Alert.alert(t('error'), t('source-min-one'));
      return;
    }
    persist(next);

    // Turning on a source that cannot run yet: take the user straight to its
    // settings instead of letting it be silently skipped at search time.
    const source = findSource(id);
    if (enabled && source?.hasSettings && !source.isConfigured(apiKey)) {
      setConfiguring(id);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= bookSources.length) return;
    const next = [...bookSources];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.hint, { color: textColor }]}>{t('source-order-hint')}</Text>

      {bookSources.map((entry, index) => {
        const source = findSource(entry.id);
        const configurable = !!source?.hasSettings;
        const needsSetup = configurable && entry.enabled && !source.isConfigured(apiKey);

        return (
          <View
            key={entry.id}
            style={styles.row}
          >
            <BouncyCheckbox
              style={styles.checkbox}
              fillColor={accentColor}
              iconStyle={{ borderRadius: 5 }}
              innerIconStyle={{ borderRadius: 5 }}
              isChecked={entry.enabled}
              onPress={(checked) => toggle(entry.id, checked)}
              disableText
            />

            {configurable ? (
              <Pressable
                style={styles.name}
                onPress={() => setConfiguring(entry.id)}
              >
                {needsSetup && (
                  <MaterialIcons
                    name="warning"
                    size={18}
                    color={Colors.red}
                    accessibilityLabel={t('source-not-configured')}
                  />
                )}
                <Text style={[styles.label, { color: textColor }]}>{SOURCE_LABELS[entry.id]}</Text>
              </Pressable>
            ) : (
              <View style={styles.name}>
                <Text style={[styles.label, { color: textColor }]}>{SOURCE_LABELS[entry.id]}</Text>
              </View>
            )}

            <View style={styles.arrows}>
              <Pressable
                onPress={() => move(index, -1)}
                disabled={index === 0}
                hitSlop={8}
              >
                <MaterialIcons
                  name="keyboard-arrow-up"
                  size={28}
                  color={index === 0 ? Colors.gray : accentColor}
                />
              </Pressable>
              <Pressable
                onPress={() => move(index, 1)}
                disabled={index === bookSources.length - 1}
                hitSlop={8}
              >
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={28}
                  color={index === bookSources.length - 1 ? Colors.gray : accentColor}
                />
              </Pressable>
            </View>
          </View>
        );
      })}

      <BookSourceConfigModal
        sourceId={configuring}
        onClose={() => setConfiguring(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },

  hint: {
    fontSize: 13,
    opacity: 0.8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // With `disableText` the checkbox is just the box, so it no longer fills the
  // row — and it no longer carries the margin its own label used to provide.
  checkbox: {
    flexGrow: 0,
    marginRight: 10,
  },

  name: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  arrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  label: {
    fontSize: 16,
    textDecorationLine: 'none',
  },
});
