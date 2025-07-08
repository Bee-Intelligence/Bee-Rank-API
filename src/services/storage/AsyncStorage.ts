
import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageService {
  /**
   * Store a string value
   */
  async setString(key: string, value: string): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error storing string for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Retrieve a string value
   */
  async getString(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error retrieving string for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Store an object value (serialized as JSON)
   */
  async setObject<T>(key: string, value: T): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (error) {
      console.error(`Error storing object for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Retrieve an object value (parsed from JSON)
   */
  async getObject<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) as T : null;
    } catch (error) {
      console.error(`Error retrieving object for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove a value
   */
  async removeItem(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing item for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }

  /**
   * Get all keys
   */
  async getAllKeys(): Promise<string[] | null> {
    try {
      return [...await AsyncStorage.getAllKeys()];
    } catch (error) {
      console.error('Error getting all keys:', error);
      return null;
    }
  }

  /**
   * Multi-get items
   */
  async multiGet(keys: string[]): Promise<[string, string | null][] | null> {
    try {
      return [...await AsyncStorage.multiGet(keys)];
    } catch (error) {
      console.error('Error multi-getting items:', error);
      return null;
    }
  }

  /**
   * Multi-set items
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<boolean> {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
      return true;
    } catch (error) {
      console.error('Error multi-setting items:', error);
      return false;
    }
  }
}

export default new StorageService();