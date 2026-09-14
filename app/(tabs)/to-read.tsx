import { StyleSheet, Text, View, FlatList, Pressable, ScrollView, TextInput, Keyboard, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import Modal from 'react-native-modal';
import BookItem from '@/components/bookItem';
import { useDarkModeContext } from '@/providers/themeProvider';
import { Colors } from '@/constants/Colors';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Entypo, Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useAccentColorContext } from '@/providers/accentColorProvider';
import BookSearchItem from '@/components/bookSearchItem';
import { getBookDetails } from '@/helpers/getBookDetails';
import { router } from 'expo-router';
import { useSelectedBookContext } from '@/providers/selectedBookProvider';
import { useFontsContext } from '@/providers/fontProvider';
import { useFullBookListContext } from '@/providers/booksFullListProvider';
import { getBookByIsbn } from '@/helpers/getBookByIsbn';
import { getVolumeById } from '@/helpers/getVolumeById';
import { alertBookApiFailure, alertNoResult } from '@/helpers/bookSearchAlert';
import BarcodeZxingScan from 'rn-barcode-zxing-scan';
import { useBlackThemeContext } from '@/providers/blackThemeProvider';
import { BookState } from '@/constants/bookState';
import { useTranslation } from 'react-i18next';
import { useApiKeyContext } from '@/providers/apiKeyProvider';

const ToRead = () => {
  const [isDarkMode, setIsDarkMode] = useDarkModeContext();

  const [accentColor, setAccentColor] = useAccentColorContext();

  const [selectedBook, setSelectedBook] = useSelectedBookContext();

  const [isBlackTheme, setIsBlackTheme] = useBlackThemeContext();

  const [font, setFont] = useFontsContext();

  const [hidePlusBtn, setHidePlusBtn] = useState(false);

  const [firstModal, setFirstModal] = useState(false);

  const [searchModal, setSearchModal] = useState(false);

  const [isbnModal, setIsbnModal] = useState(false);

  const [title, setTitle] = useState('');

  const [isbn, setIsbn] = useState('');

  const [isSearchActive, setIsSearchActive] = useState(false);

  const [bookSearchResults, setBookSearchResults] = useState<BookSearchResultProp[]>([]);

  const [fullBookList, setFullBookList] = useFullBookListContext();

  const [apiKey] = useApiKeyContext();

  const [loadingAnimation, setLoadingAnimation] = useState(false);

  const { t } = useTranslation();

  function handleAddBook() {
    setFirstModal(true);
  }

  async function handleBookSearch(title: string) {
    Keyboard.dismiss();
    if (title.trim() === '') return;
    setLoadingAnimation(true);
    try {
      const result = await getBookDetails(title, apiKey);
      if (!result.ok) {
        alertBookApiFailure(result.kind, t);
        return;
      }
      setBookSearchResults(result.data);
      setIsSearchActive(result.data.length > 0);
      if (result.data.length === 0) alertNoResult(t, 'title');
    } finally {
      setLoadingAnimation(false);
    }
  }

  async function handleBookSearchByIsbn(isbn: string) {
    Keyboard.dismiss();
    if (isbn.trim() === '') return;
    setLoadingAnimation(true);
    try {
      const result = await getBookByIsbn(isbn, apiKey);
      if (!result.ok) {
        alertBookApiFailure(result.kind, t);
        return;
      }
      if (!result.data) {
        alertNoResult(t, 'isbn');
        return;
      }
      setSelectedBook(result.data);
      setIsbnModal(false);
      router.push({ pathname: '/(addBook)/[addBook]', params: { addBook: BookState.READ_LATER } });
    } finally {
      setLoadingAnimation(false);
    }
  }

  async function handleBookSelection(id: string, state: string) {
    setLoadingAnimation(true);
    try {
      const result = await getVolumeById(id, apiKey);
      if (!result.ok) {
        // Stay on the results list: navigating here would open the form filled
        // with whatever book was selected previously.
        alertBookApiFailure(result.kind, t);
        return;
      }
      setSelectedBook(result.data);
      Keyboard.dismiss();
      setSearchModal(false);
      router.push({ pathname: '/(addBook)/[addBook]', params: { addBook: state } });
    } finally {
      setLoadingAnimation(false);
    }
  }

  function addBookManually(state: string) {
    setSelectedBook({});
    Keyboard.dismiss();
    setFirstModal(false);
    router.push({ pathname: '/(addBook)/[addBook]', params: { addBook: state } });
  }

  const barcodeScanned = async (barcode: string) => {
    try {
      const result = await getBookByIsbn(barcode, apiKey);
      if (!result.ok) {
        alertBookApiFailure(result.kind, t);
        return;
      }
      if (!result.data) {
        alertNoResult(t, 'isbn');
        return;
      }
      setSelectedBook(result.data);
      router.push({ pathname: '/(addBook)/[addBook]', params: { addBook: BookState.READ_LATER } });
    } finally {
      setLoadingAnimation(false);
    }
  };

  function handleBarcodeSearch() {
    BarcodeZxingScan.showQrReader(async (error: any, data: any) => {
      if (error) {
        console.log('Error:', error);
        return;
      } else {
        setLoadingAnimation(true);
        barcodeScanned(data);
      }
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: isBlackTheme ? Colors.fullBlack : isDarkMode ? Colors.black : Colors.white }]}>
      <ActivityIndicator
        style={styles.activitiyIndicator}
        animating={loadingAnimation}
        size={'large'}
        color={accentColor}
      />
      <FlatList
        keyExtractor={(_, index) => index.toString()}
        data={fullBookList}
        extraData={fullBookList}
        renderItem={({ item }) => <View>{item.state === BookState.READ_LATER ? <BookItem data={item} /> : null}</View>}
        ListFooterComponent={() => <View style={{ height: 10 }} />}
        // onScrollBeginDrag={() => setHidePlusBtn(true)}
        // onScrollEndDrag={() => setHidePlusBtn(false)}
        onMomentumScrollBegin={() => setHidePlusBtn(true)}
        onMomentumScrollEnd={() => setHidePlusBtn(false)}
      />

      <Pressable
        onPress={handleAddBook}
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
      <Modal
        isVisible={firstModal}
        onBackdropPress={() => setFirstModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? accentColor : Colors.light }]}>
          <Text style={[styles.modalHeader, { fontFamily: `${font}B` }]}>{t('add-book')}</Text>
          <View style={styles.modalButtonContainer}>
            <Pressable
              onPress={() => addBookManually(BookState.READ_LATER)}
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
                setFirstModal(false);
                setSearchModal(true);
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
                setFirstModal(false);
                setIsbnModal(true);
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
                setFirstModal(false);
                handleBarcodeSearch();
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
        isVisible={searchModal}
        onBackdropPress={() => setSearchModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? accentColor : Colors.light }]}>
          <Text style={[styles.modalHeader, { fontFamily: `${font}B` }]}>{t('enter-title')}</Text>
          <View style={styles.modalSearchInputContainer}>
            <TextInput
              style={[styles.modalSearchInput, { fontFamily: `${font}B` }]}
              value={title}
              onChangeText={(value) => setTitle(value)}
              onSubmitEditing={() => handleBookSearch(title)}
            />
            <Pressable onPress={() => setTitle('')}>
              <MaterialIcons
                name="close"
                size={20}
              />
            </Pressable>
          </View>
          <Pressable
            onTouchStart={() => handleBookSearch(title)}
            style={styles.searchContainer}
          >
            <Text style={[{ fontFamily: `${font}B` }]}>{t('search').toUpperCase()}</Text>
          </Pressable>
          {isSearchActive && (
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={{ width: '90%' }}
            >
              {bookSearchResults?.map((book) => (
                <View key={book.id}>
                  <BookSearchItem
                    book={book}
                    onPress={() => handleBookSelection(book.id, BookState.READ_LATER)}
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
      <Modal
        isVisible={isbnModal}
        onBackdropPress={() => setIsbnModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? accentColor : Colors.light }]}>
          <Text style={[styles.modalHeader, { fontFamily: `${font}B` }]}>{t('enter-isbn')}</Text>
          <View style={styles.modalSearchInputContainer}>
            <TextInput
              style={[styles.modalSearchInput, { fontFamily: `${font}B` }]}
              value={isbn}
              onChangeText={(value) => setIsbn(value)}
              onSubmitEditing={() => handleBookSearchByIsbn(isbn)}
              keyboardType="numeric"
            />
            <Pressable onPress={() => setIsbn('')}>
              <MaterialIcons
                name="close"
                size={20}
              />
            </Pressable>
          </View>
          <TouchableOpacity
            onPressIn={() => handleBookSearchByIsbn(isbn)}
            style={styles.searchContainer}
          >
            <Text style={[{ fontFamily: `${font}B` }]}>{t('get').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
