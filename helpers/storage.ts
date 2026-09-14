import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getData(key: string) {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return JSON.parse(value);
    }
  } catch (error) {
    console.log(`[storage] failed to read "${key}":`, error instanceof Error ? error.message : error);
  }
  return undefined;
}

export async function setData(key: string, value: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.log(`[storage] failed to write "${key}":`, error instanceof Error ? error.message : error);
    return false;
  }
}

export async function deleteData(key: string) {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.log(`[storage] failed to delete "${key}":`, error instanceof Error ? error.message : error);
    return false;
  }
}
