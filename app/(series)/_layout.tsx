import { Pressable, StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useAccentColorContext } from '@/providers/accentColorProvider';

const SeriesLayout = () => {
  const insets = useSafeAreaInsets();

  const [accentColor] = useAccentColorContext();

  /**
   * The title comes from the route, never from the volumes on screen: it has to
   * survive both the moment before the list is read back from storage and the
   * deletion of the last volume.
   */
  const { name } = useLocalSearchParams<{ name?: string }>();

  return (
    <>
      <View style={[styles.header, { backgroundColor: accentColor, borderColor: accentColor, height: 90 + insets.top, paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <View style={styles.backIconContainer}>
            <Pressable
              style={{ paddingHorizontal: 8 }}
              onPress={() => router.back()}
            >
              <MaterialIcons
                name="chevron-left"
                size={35}
                color={Colors.light}
              />
            </Pressable>
          </View>
          <View style={styles.headerTextContainer}>
            <Text
              style={styles.headerText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {name}
            </Text>
          </View>
          {/* Balances the back chevron: a series has nothing to edit. */}
          <View style={styles.backIconContainer} />
        </View>
      </View>
      <Stack>
        <Stack.Screen
          name="[series]"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
};

export default SeriesLayout;

const styles = StyleSheet.create({
  header: {
    height: 90,
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },

  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },

  backIconContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 5,
  },

  headerTextContainer: {
    width: '75%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerText: {
    fontSize: 25,
    color: 'white',
    fontFamily: 'OswaldB',
    textAlign: 'center',
  },
});
