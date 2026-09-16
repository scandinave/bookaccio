import { Tabs } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';
import { useAccentColorContext } from '@/providers/accentColorProvider';
import { useBlackThemeContext } from '@/providers/blackThemeProvider';
import { useDarkModeContext } from '@/providers/themeProvider';
import BookListLayout from '@/components/bookListLayout';

const TabsLayout = () => {
  const [isDarkMode] = useDarkModeContext();
  const [accentColor] = useAccentColorContext();
  const [isBlackTheme] = useBlackThemeContext();
  const { t } = useTranslation();

  // Stays here rather than in BookListLayout: it only ever feeds `tabBarIcon`,
  // and the navigator is the one thing each route declares for itself.
  const CustomIcon = ({ focused, name, title }: { focused: boolean; name: any; title: string }) => (
    <View>
      <View style={[styles.customIconFill, { backgroundColor: focused ? accentColor : isBlackTheme ? Colors.closeBlack : isDarkMode ? Colors.dark : Colors.light }]}>
        <Icon
          name={focused ? name : `${name}-outline`}
          size={30}
          color={focused ? Colors.light : isDarkMode ? Colors.light : Colors.gray}
        />
        {focused ? <Text style={{ color: Colors.light, fontWeight: 'bold' }}>{title}</Text> : null}
      </View>
    </View>
  );

  return (
    <BookListLayout showUnfinishedLink>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: isBlackTheme ? Colors.closeBlack : isDarkMode ? Colors.dark : Colors.light,
            height: 70,
            borderColor: isBlackTheme ? Colors.closeBlack : isDarkMode ? Colors.dark : Colors.light,
            paddingTop: 16,
            borderWidth: 0,
          },
          // tabBarPosition: 'bottom',
        }}
      >
        <Tabs.Screen
          name="to-read"
          options={{
            headerShown: false,
            headerTitle: 'To Read',
            tabBarIcon: ({ focused }) => (
              <CustomIcon
                name="bookmark"
                focused={focused}
                title={t('for-later')}
              />
            ),

            // unmountOnBlur: true,
          }}
        />
        <Tabs.Screen
          name="home"
          options={{
            headerShown: false,
            headerTitle: 'Reading',
            tabBarIcon: ({ focused }) => (
              <CustomIcon
                name="book-open-page-variant"
                focused={focused}
                title={t('reading')}
              />
            ),
            // unmountOnBlur: true,
          }}
        />
        <Tabs.Screen
          name="read"
          options={{
            headerShown: false,
            headerTitle: 'Read',
            tabBarIcon: ({ focused }) => (
              <CustomIcon
                name="book"
                focused={focused}
                title={t('done')}
              />
            ),
            // unmountOnBlur: true,
          }}
        />
      </Tabs>
    </BookListLayout>
  );
};

export default TabsLayout;

const styles = StyleSheet.create({
  customIconFill: {
    borderRadius: 40,
    width: 100,
    height: 60,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  }
});
