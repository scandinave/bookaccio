import { StyleSheet, Text, View, FlatList, Pressable, TextInput, Keyboard, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import React, { useState } from 'react';
import BookItem from '@/components/bookItem';
import { useDarkModeContext } from '@/providers/themeProvider';
import { Colors } from '@/constants/Colors';
import { Entypo, MaterialIcons, AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAccentColorContext } from '@/providers/accentColorProvider';
import { useFontsContext } from '@/providers/fontProvider';
import BookSearchItem from '@/components/bookSearchItem';
import { router } from 'expo-router';
import { useFullBookListContext } from '@/providers/booksFullListProvider';
import { useBlackThemeContext } from '@/providers/blackThemeProvider';
import { BookState } from '@/constants/bookState';
import { useBookSearch } from '@/hooks/useBookSearch';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Unfinished = () => {
  const [isDarkMode, setIsDarkMode] = useDarkModeContext();

  const [accentColor, setAccentColor] = useAccentColorContext();

  const [font, setFont] = useFontsContext();
  const [isBlackTheme, setIsBlackTheme] = useBlackThemeContext();

  const [hidePlusBtn, setHidePlusBtn] = useState(false);

  const [fullBookList] = useFullBookListContext();

  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // One implementation for all four list screens: a change here cannot miss one.
  const {
    firstModal,
    setFirstModal,
    searchModal,
    setSearchModal,
    isbnModal,
    setIsbnModal,
    title,
    setTitle,
    isbn,
    setIsbn,
    isSearchActive,
    results: bookSearchResults,
    loading: loadingAnimation,
    openAddModal: handleAddBook,
    searchByTitle: handleBookSearch,
    searchByIsbn: handleBookSearchByIsbn,
    selectResult,
    addManually,
    scanBarcode: handleBarcodeSearch,
  } = useBookSearch(BookState.UNFINISHED);

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
        renderItem={({ item }) => <View>{item.state === BookState.UNFINISHED ? <BookItem data={item} /> : null}</View>}
        ListFooterComponent={() => <View style={{ height: 10 + insets.bottom }} />}
        // onScrollBeginDrag={() => setHidePlusBtn(true)}
        // onScrollEndDrag={() => setHidePlusBtn(false)}
        // onMomentumScrollBegin={() => setHidePlusBtn(true)}
        // onMomentumScrollEnd={() => setHidePlusBtn(false)}
      />
      <View style={{ height: 75 + insets.bottom }}>
        <Pressable
          onPress={handleAddBook}
          style={[styles.plusIcon, { bottom: 10 + insets.bottom }]}
        >
          {hidePlusBtn ? null : (
            <MaterialCommunityIcons
              name="plus-circle"
              size={60}
              color={accentColor}
            />
          )}
        </Pressable>
        <Pressable
          onPress={() => {
            router.back();
          }}
          style={[styles.backIcon, { bottom: 10 + insets.bottom }]}
        >
          {hidePlusBtn ? null : (
            <MaterialCommunityIcons
              name="arrow-left-circle"
              size={60}
              color={accentColor}
            />
          )}
        </Pressable>
      </View>
      <Modal
        isVisible={firstModal}
        onBackdropPress={() => setFirstModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? accentColor : Colors.light }]}>
          <Text style={[styles.modalHeader, { fontFamily: `${font}B` }]}>{t('add-book')}</Text>
          <View style={styles.modalButtonContainer}>
            <Pressable
              onPress={() => addManually()}
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
              <AntDesign
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
              <Entypo
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
                <View key={book.ref}>
                  <BookSearchItem
                    book={book}
                    onPress={() => selectResult(book)}
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
