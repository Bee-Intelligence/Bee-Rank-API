
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_CREDENTIALS: 'user_credentials',
  BIOMETRIC_ENABLED: 'biometric_enabled',
};

export class SecureStorageService {
  // In-memory storage for demo purposes
  private memoryStorage: Record<string, string> = {};

  /**
   * Store a value securely
   */
  async setItem(key: string, value: string): Promise<boolean> {
    try {
      // In a real implementation, this would use a secure storage library
      // For now, we'll just store in memory
      this.memoryStorage[key] = value;

      // Also store in AsyncStorage for persistence in this demo
      // In a real app, you would NOT do this for sensitive data
      await AsyncStorage.setItem(key, value);

      return true;
    } catch (error) {
      console.error(`Error storing secure item for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Retrieve a value securely
   */
  async getItem(key: string): Promise<string | null> {
    try {
      // First try memory storage
      if (this.memoryStorage[key]) {
        return this.memoryStorage[key];
      }

      // Then try AsyncStorage (for demo persistence)
      const value = await AsyncStorage.getItem(key);
      if (value) {
        // Update memory storage
        this.memoryStorage[key] = value;
      }

      return value;
    } catch (error) {
      console.error(`Error retrieving secure item for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value
   */
  async deleteItem(key: string): Promise<boolean> {
    try {
      // Remove from memory storage
      delete this.memoryStorage[key];

      // Remove from AsyncStorage
      await AsyncStorage.removeItem(key);

      return true;
    } catch (error) {
      console.error(`Error deleting secure item for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Store user credentials securely
   */
  async saveUserCredentials(email: string, password: string): Promise<boolean> {
    try {
      const credentials = JSON.stringify({ email, password });
      return await this.setItem(STORAGE_KEYS.USER_CREDENTIALS, credentials);
    } catch (error) {
      console.error('Error saving user credentials:', error);
      return false;
    }
  }

  /**
   * Retrieve user credentials
   */
  async getUserCredentials(): Promise<{ email: string; password: string } | null> {
    try {
      const credentials = await this.getItem(STORAGE_KEYS.USER_CREDENTIALS);
      if (credentials) {
        return JSON.parse(credentials);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving user credentials:', error);
      return null;
    }
  }

  /**
   * Store authentication token
   */
  async saveAuthToken(token: string): Promise<boolean> {
    return await this.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  /**
   * Retrieve authentication token
   */
  async getAuthToken(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  /**
   * Delete authentication token
   */
  async deleteAuthToken(): Promise<boolean> {
    return await this.deleteItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  /**
   * Set biometric authentication status
   */
  async setBiometricEnabled(enabled: boolean): Promise<boolean> {
    return await this.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled.toString());
  }

  /**
   * Check if biometric authentication is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    const value = await this.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
    return value === 'true';
  }
}

export default new SecureStorageService();
