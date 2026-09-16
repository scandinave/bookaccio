import { Link } from 'expo-router';
import { View, Text, StyleSheet, Pressable, TextInput, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Entypo, Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons/';
import Modal from 'react-native-modal';
import React, { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';
import { getBookList } from '@/helpers/getBookList';
import { storeBooks } from '@/helpers/storeBooks';
import { useAccentColorContext } from '@/providers/accentColorProvider';
import { useDarkModeContext } from '@/providers/themeProvider';
import { useFontsContext } from '@/providers/fontProvider';
import { useFullBookListContext } from '@/providers/booksFullListProvider';

/**
 * The chrome every book-list route shares: header, search bar, menu and sort
 * modals, wrapped around whichever navigator the route declares.
 *
 * `(tabs)` and `(unfinished)` are sibling root-stack groups, so each used to
 * carry its own copy — 87% of one file was a verbatim duplicate of the other,
 * and the copies had already drifted: the sort labels were translated on one
 * side and left hardcoded in English on the other.
 */
export default function BookListLayout({ children, showUnfinishedLink = false }: { children: React.ReactNode; showUnfinishedLink?: boolean }) {
  const [isDarkMode] = useDarkModeContext();
  const [accentColor] = useAccentColorContext();
  const [font] = useFontsContext();
  const [, setFullBookList] = useFullBookListContext();

  const [modalVisible, setModalVisible] = useState(false);
  const [isSearchContainer, setIsSearchContainerVisible] = useState(false);
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [searchTxt, setSearchTxt] = useState('');

  const textInputRef = useRef<TextInput>(null);
  const isScreenFocused = useIsFocused();
  const { t } = useTranslation();

  // Pre-existing quirk kept as-is: `searchTxt` is read here but absent from the
  // dependency array, so this only re-runs on focus changes.
  useEffect(() => {
    if (isScreenFocused && searchTxt !== '') {
      getBookList().then((data: Book[]) => {
        setFullBookList([...data.filter((book) => book.title?.toLowerCase().includes(searchTxt.toLowerCase()) || (book?.authors ?? []).join(',').toLowerCase().includes(searchTxt.toLowerCase()))]);
      });
    } else {
      getBookList().then((data) => {
        setFullBookList([...data]);
      });
    }
  }, [isScreenFocused]);

  function onSearch(value: string) {
    if (value === '') {
      getBookList().then((data) => {
        setFullBookList(data);
      });
    } else {
      getBookList().then((data: Book[]) => {
        let tempArr = data.filter((book) => {
          return book?.title!.toLowerCase().includes(value.toLowerCase()) || (book?.authors ?? []).join(',').toLowerCase().includes(value.toLowerCase());
        });
        setFullBookList(tempArr);
      });
    }
  }

  function handleSort(value: string) {
    let tempArr;
    switch (value) {
      case 'title':
        getBookList().then((data: Book[]) => {
          tempArr = data.sort((a, b) => (a?.title! > b?.title! ? 1 : -1));
          setFullBookList([...tempArr]);
          storeBooks([...tempArr]);
          setIsSortModalVisible(false);
          // Pre-existing quirk: clears the native input without resetting
          // `searchTxt`, which is what actually drives its value.
          textInputRef.current?.clear();
        });
        break;
      case 'dateAsc':
        getBookList().then((data: Book[]) => {
          tempArr = data.sort((a, b) => a.startDate - b.startDate);
          setFullBookList([...tempArr]);
          storeBooks([...tempArr]);
          setIsSortModalVisible(false);
          textInputRef.current?.clear();
        });
        break;
      case 'dateDesc':
        getBookList().then((data: Book[]) => {
          tempArr = data.sort((a, b) => b.startDate - a.startDate);
          setFullBookList([...tempArr]);
          storeBooks([...tempArr]);
          setIsSortModalVisible(false);
          textInputRef.current?.clear();
        });
        break;
    }
  }

  const MenuLink = ({ href, icon, label }: { href: any; icon: React.ReactNode; label: string }) => (
    <View>
      <Link
        href={href}
        asChild
      >
        <Pressable
          style={styles.linkContainer}
          onPress={() => setModalVisible(false)}
        >
          {icon}
          <Text style={[styles.linkText, { color: isDarkMode ? Colors.light : accentColor }]}>{label}</Text>
        </Pressable>
      </Link>
    </View>
  );

  const menuIconColor = isDarkMode ? Colors.light : accentColor;

  return (
    <>
      <StatusBar style="light" />
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <View style={styles.headerInner}>
          <Text style={styles.headerText}>BOOKACCIO</Text>
          <View style={styles.rightContainer}>
            <Pressable
              onPress={() => {
                setIsSearchContainerVisible(true);
                // commenting this out because in phone, sometimes the keyboard doesn't show up
                // textInputRef.current?.focus();
              }}
              style={styles.headerIconContainer}
            >
              <Entypo
                name="magnifying-glass"
                size={22}
                color="white"
              />
            </Pressable>
            <Pressable
              onPress={() => setModalVisible(true)}
              style={styles.headerIconContainer}
            >
              <Entypo
                name="dots-three-vertical"
                size={22}
                color="white"
              />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={[styles.secondaryHeaderContainer, { display: isSearchContainer ? 'flex' : 'none', backgroundColor: accentColor }]}>
        <View style={styles.searchContainerInner}>
          <View style={{ justifyContent: 'center' }}>
            <Entypo
              name="magnifying-glass"
              size={24}
              color={accentColor}
            />
          </View>
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <TextInput
              ref={textInputRef}
              value={searchTxt}
              style={[styles.searchInput, { fontFamily: `${font}B` }]}
              onChangeText={(value) => {
                setSearchTxt(value);
                onSearch(value);
              }}
              numberOfLines={1}
              multiline={false}
              placeholder={t('search-by-title-or-author')}
              placeholderTextColor={'#9e9e9e'}
            />
          </View>
        </View>
        <View style={styles.optionsBtnContainer}>
          <Pressable
            style={{ padding: 2 }}
            onTouchStart={() => setIsSortModalVisible(true)}
          >
            <Ionicons
              name="options-sharp"
              size={24}
              color={Colors.light}
            />
          </Pressable>
          <Pressable
            style={{ padding: 2 }}
            onTouchStart={() => setIsSearchContainerVisible(false)}
          >
            <Ionicons
              name="close"
              size={24}
              color={Colors.light}
            />
          </Pressable>
        </View>
      </View>

      {children}

      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => setModalVisible(false)}
      >
        <View style={[styles.modalView, { backgroundColor: isDarkMode ? accentColor : Colors.light }]}>
          <Pressable
            style={[styles.closeBtn]}
            onPress={() => setModalVisible(false)}
          >
            <MaterialIcons
              name="close"
              size={23}
              color={menuIconColor}
            />
          </Pressable>
          <View>
            {/* A screen does not link to itself. */}
            {showUnfinishedLink && (
              <MenuLink
                href={'/(unfinished)/unfinished'}
                label={t('unfinished')}
                icon={
                  <MaterialCommunityIcons
                    name="bookmark-remove"
                    size={22}
                    color={menuIconColor}
                  />
                }
              />
            )}
            <MenuLink
              href={'/(settings)/settings'}
              label={t('settings')}
              icon={
                <MaterialIcons
                  name="settings"
                  size={22}
                  color={menuIconColor}
                />
              }
            />
            <MenuLink
              href={'/(settings)/about'}
              label={t('about')}
              icon={
                <MaterialIcons
                  name="info"
                  size={22}
                  color={menuIconColor}
                />
              }
            />
          </View>
        </View>
      </Modal>

      <Modal
        isVisible={isSortModalVisible}
        onBackdropPress={() => setIsSortModalVisible(false)}
      >
        <View style={[styles.sortModal, { backgroundColor: isDarkMode ? Colors.dark : Colors.light }]}>
          <TouchableOpacity
            onPress={() => handleSort('title')}
            style={[styles.sortModalBtn, { backgroundColor: accentColor }]}
          >
            <Text style={[styles.sortModalTxt, { fontFamily: `${font}B` }]}>{t('sort-by-title')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSort('dateAsc')}
            style={[styles.sortModalBtn, { backgroundColor: accentColor }]}
          >
            <Text style={[styles.sortModalTxt, { fontFamily: `${font}B` }]}>{t('sort-by-start-e2l')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSort('dateDesc')}
            style={[styles.sortModalBtn, { backgroundColor: accentColor }]}
          >
            <Text style={[styles.sortModalTxt, { fontFamily: `${font}B` }]}>{t('sort-by-start-l2e')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    height: 90,
    justifyContent: 'flex-end',
    paddingLeft: 20,
    paddingBottom: 10,
  },

  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerText: {
    fontSize: 25,
    color: 'white',
    // fontWeight: 'bold',
    fontFamily: 'OswaldB',
    // letterSpacing: 0.5,
  },


  headerIconContainer: {
    paddingLeft: 5,
    paddingRight: 15,
    paddingVertical: 8,
  },

  rightContainer: {
    flexDirection: 'row',
  },

  secondaryHeaderContainer: {
    width: '100%',
    position: 'absolute',
    height: 90,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  searchContainerInner: {
    backgroundColor: Colors.light,
    flexDirection: 'row',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    justifyContent: 'space-between',
    flex: 1,
  },

  optionsBtnContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 10,
    marginLeft: 10,
    paddingHorizontal: 5,
  },

  searchInput: {
    padding: 5,
    fontSize: 16,
  },

  modalView: {
    height: 200,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    margin: -20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },

  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },

  linkText: {
    fontSize: 17,
    fontFamily: 'MontB',
  },

  closeBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
  },

  sortModal: {
    padding: 15,
    paddingVertical: 35,
    borderRadius: 10,
    gap: 10,
  },

  sortModalBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },

  sortModalTxt: {
    textAlign: 'center',
    color: Colors.light,
  },
});
