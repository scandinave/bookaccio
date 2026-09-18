import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';
import BookSearchItem from '@/components/bookSearchItem';
import { useAccentColorContext } from '@/providers/accentColorProvider';
import { useDarkModeContext } from '@/providers/themeProvider';
import { useFontsContext } from '@/providers/fontProvider';
import { useBookSearch } from '@/hooks/useBookSearch';

/**
 * The three chained modals every screen that can add a book needs: the four
 * ways in, the title search and its results, and the ISBN prompt.
 *
 * It used to be copied into each list screen, and the copies had drifted —
 * "Add Manually" was a Feather icon on one screen and AntDesign on three, the
 * ISBN icon was Entypo on `unfinished` and Feather elsewhere. The version kept
 * here is, icon by icon, whichever the majority of screens already showed.
 */
export default function AddBookModals({ search }: { search: ReturnType<typeof useBookSearch> }) {
  const [isDarkMode] = useDarkModeContext();
  const [accentColor] = useAccentColorContext();
  const [font] = useFontsContext();
  const { t } = useTranslation();

  const background = { backgroundColor: isDarkMode ? accentColor : Colors.light };

  return (
    <>
      <Modal
        isVisible={search.firstModal}
        onBackdropPress={() => search.setFirstModal(false)}
      >
        <View style={[styles.modalContainer, background]}>
          <Text style={[styles.modalHeader, { fontFamily: `${font}B` }]}>{t('add-book')}</Text>
          <View style={styles.modalButtonContainer}>
            <Pressable
              onPress={() => search.addManually()}
              style={styles.modalButton}
            >
              <AntDesign
                name="edit"
                size={25}
              />
              <Text style={{ fontFamily: `${font}B`, textAlign: 'center' }}>{t('add-manually')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                search.setFirstModal(false);
                search.setSearchModal(true);
              }}
              style={styles.modalButton}
            >
              <Feather
                name="search"
                size={25}
              />
              <Text style={{ fontFamily: `${font}B`, textAlign: 'center' }}>{t('search-title')}</Text>
            </Pressable>
          </View>
          <View style={styles.modalButtonContainer}>
            <Pressable
              onPress={() => {
                search.setFirstModal(false);
                search.setIsbnModal(true);
              }}
              style={styles.modalButton}
            >
              <Feather
                name="book"
                size={30}
              />
              <Text style={{ fontFamily: `${font}B`, textAlign: 'center' }}>{t('get-book')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                search.setFirstModal(false);
                search.scanBarcode();
              }}
              style={styles.modalButton}
            >
              <AntDesign
                name="barcode"
                size={30}
              />
              <Text style={{ fontFamily: `${font}B`, textAlign: 'center' }}>{t('scan-barcode')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        isVisible={search.searchModal}
        onBackdropPress={() => search.setSearchModal(false)}
      >
        <View style={[styles.modalContainer, background]}>
          <Text style={[styles.modalHeader, { fontFamily: `${font}B` }]}>{t('enter-title')}</Text>
          <View style={styles.modalSearchInputContainer}>
            <TextInput
              style={[styles.modalSearchInput, { fontFamily: `${font}B` }]}
              value={search.title}
              onChangeText={(value) => search.setTitle(value)}
              onSubmitEditing={() => search.searchByTitle(search.title)}
            />
            <Pressable onPress={() => search.setTitle('')}>
              <MaterialIcons
                name="close"
                size={20}
              />
            </Pressable>
          </View>
          <Pressable
            onTouchStart={() => search.searchByTitle(search.title)}
            style={styles.searchContainer}
          >
            <Text style={[{ fontFamily: `${font}B` }]}>{t('search').toUpperCase()}</Text>
          </Pressable>
          <ActivityIndicator
            style={styles.activityIndicator}
            animating={search.loading}
            size={'large'}
            color={'white'}
          />
          {search.isSearchActive && (
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={{ width: '90%' }}
            >
              {search.results?.map((book) => (
                <View key={book.ref}>
                  <BookSearchItem
                    book={book}
                    onPress={() => search.selectResult(book)}
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      <Modal
        isVisible={search.isbnModal}
        onBackdropPress={() => search.setIsbnModal(false)}
      >
        <View style={[styles.modalContainer, background]}>
          <Text style={[styles.modalHeader, { fontFamily: `${font}B` }]}>{t('enter-isbn')}</Text>
          <View style={styles.modalSearchInputContainer}>
            <TextInput
              style={[styles.modalSearchInput, { fontFamily: `${font}B` }]}
              value={search.isbn}
              onChangeText={(value) => search.setIsbn(value)}
              onSubmitEditing={() => search.searchByIsbn(search.isbn)}
              keyboardType="numeric"
            />
            <Pressable onPress={() => search.setIsbn('')}>
              <MaterialIcons
                name="close"
                size={20}
              />
            </Pressable>
          </View>
          <TouchableOpacity
            onPressIn={() => search.searchByIsbn(search.isbn)}
            style={styles.searchContainer}
          >
            <Text style={[{ fontFamily: `${font}B` }]}>{t('get').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  activityIndicator: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },

  modalContainer: {
    alignItems: 'center',
    borderRadius: 20,
    padding: 15,
    paddingBottom: 40,
    gap: 20,
  },

  modalHeader: {
    fontSize: 25,
  },

  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
  },

  modalButton: {
    width: 130,
    height: 130,
    borderWidth: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 5,
  },

  modalSearchInputContainer: {
    borderWidth: 1,
    width: '75%',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalSearchInput: {
    flex: 1,
    paddingHorizontal: 5,
  },

  searchContainer: {
    borderWidth: 1,
    paddingHorizontal: 25,
    paddingVertical: 5,
    borderRadius: 10,
  },

  modalScrollView: {
    height: 300,
  },
});
