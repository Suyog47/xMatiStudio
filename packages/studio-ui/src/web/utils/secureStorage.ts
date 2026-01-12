import { encryptData, decryptData } from '../utils/crypto-utils'

/**
 * Secure wrapper for sessionStorage that automatically encrypts/decrypts data
 */
class SecureSessionStorage {
  /**
   * Set an item in sessionStorage with encryption
   * @param key - The storage key
   * @param value - The value to store (will be encrypted)
   */
  setItem(key: string, value: string): void {
    try {
      const encrypted = encryptData(value)
      if (encrypted) {
        sessionStorage.setItem(key, encrypted)
      }
    } catch (error) {
      console.error(`[SecureStorage] Failed to set item "${key}":`, error)
      throw error
    }
  }

  /**
   * Get an item from sessionStorage with decryption
   * @param key - The storage key
   * @returns The decrypted value or null if not found
   */
  getItem(key: string): string | null {
    try {
      const encrypted = sessionStorage.getItem(key)
      if (!encrypted) {
        return null
      }

      const decrypted = decryptData(encrypted)
      return decrypted
    } catch (error) {
      console.error(`[SecureStorage] Failed to get item "${key}":`, error)
      // If decryption fails, remove the corrupted item
      sessionStorage.removeItem(key)
      return null
    }
  }

  /**
   * Remove an item from sessionStorage
   * @param key - The storage key
   */
  removeItem(key: string): void {
    sessionStorage.removeItem(key)
  }

  /**
   * Clear all items from sessionStorage
   */
  clear(): void {
    sessionStorage.clear()
  }

  /**
   * Check if a key exists in sessionStorage
   * @param key - The storage key
   * @returns true if the key exists, false otherwise
   */
  hasItem(key: string): boolean {
    return sessionStorage.getItem(key) !== null
  }

  /**
   * Get the number of items in sessionStorage
   */
  get length(): number {
    return sessionStorage.length
  }

  /**
   * Get the key at a specific index
   * @param index - The index
   */
  key(index: number): string | null {
    return sessionStorage.key(index)
  }
}

/**
 * Secure wrapper for localStorage that automatically encrypts/decrypts data
 */
class SecureLocalStorage {
  /**
   * Set an item in localStorage with encryption
   * @param key - The storage key
   * @param value - The value to store (will be encrypted)
   */
  setItem(key: string, value: string): void {
    try {
      const encrypted = encryptData(value)
      if (encrypted) {
        localStorage.setItem(key, encrypted)
      }
    } catch (error) {
      console.error(`[SecureStorage] Failed to set item "${key}":`, error)
      throw error
    }
  }

  /**
   * Get an item from localStorage with decryption
   * @param key - The storage key
   * @returns The decrypted value or null if not found
   */
  getItem(key: string): string | null {
    try {
      const encrypted = localStorage.getItem(key)
      if (!encrypted) {
        return null
      }

      const decrypted = decryptData(encrypted)
      return decrypted
    } catch (error) {
      console.error(`[SecureStorage] Failed to get item "${key}":`, error)
      // If decryption fails, remove the corrupted item
      localStorage.removeItem(key)
      return null
    }
  }

  /**
   * Remove an item from localStorage
   * @param key - The storage key
   */
  removeItem(key: string): void {
    localStorage.removeItem(key)
  }

  /**
   * Clear all items from localStorage
   */
  clear(): void {
    localStorage.clear()
  }

  /**
   * Check if a key exists in localStorage
   * @param key - The storage key
   * @returns true if the key exists, false otherwise
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(key) !== null
  }

  /**
   * Get the number of items in localStorage
   */
  get length(): number {
    return localStorage.length
  }

  /**
   * Get the key at a specific index
   * @param index - The index
   */
  key(index: number): string | null {
    return localStorage.key(index)
  }
}

// Export singleton instances
export const secureSessionStorage = new SecureSessionStorage()
export const secureLocalStorage = new SecureLocalStorage()
