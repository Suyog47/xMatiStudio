import CryptoJS from 'crypto-js'

/**
 * Generate a consistent encryption key based on browser fingerprint
 * This is derived from various browser properties for session-based encryption
 * @returns {string} A hashed fingerprint string to use as encryption key
 */
export const getSessionKey = () => {
  const screenObj = typeof window !== 'undefined' && window.screen ? window.screen : {}

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screenObj.colorDepth,
    screenObj.width && screenObj.height ? screenObj.width + 'x' + screenObj.height : '',
  ].join('|')

  // Hash the fingerprint to create a consistent key for this session
  return CryptoJS.SHA256(fingerprint).toString()
}

/**
 * Encrypt data using AES encryption
 * @param {any} data - The data to encrypt (will be JSON stringified)
 * @param {string} [customKey] - Optional custom encryption key. If not provided, uses session key
 * @returns {string|null} Encrypted data string or null if input is null/undefined
 * @throws {Error} If encryption fails
 */
export const encryptData = (data, customKey = null) => {
  if (data === null || data === undefined) {
    return null
  }

  try {
    const key = customKey || getSessionKey()
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key)
    return encrypted.toString()
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt data that was encrypted using AES encryption
 * @param {string} encryptedData - The encrypted data string to decrypt
 * @param {string} [customKey] - Optional custom encryption key. If not provided, uses session key
 * @returns {any|null} Decrypted and parsed data or null if input is empty
 * @throws {Error} If decryption fails or data is corrupted
 */
export const decryptData = (encryptedData, customKey = null) => {
  if (!encryptedData) {
    return null
  }

  try {
    const key = customKey || getSessionKey()
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key)
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8)

    if (!decryptedStr) {
      throw new Error('Decryption resulted in empty string')
    }

    return JSON.parse(decryptedStr)
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data - data may be corrupted')
  }
}

/**
 * Generate a hash of the input data using SHA256
 * @param {string} data - The data to hash
 * @returns {string} The SHA256 hash of the data
 */
export const hashData = (data) => {
  return CryptoJS.SHA256(data).toString()
}

/**
 * Encrypt data with a custom key (useful for storing in different contexts)
 * @param {any} data - The data to encrypt
 * @param {string} key - The encryption key
 * @returns {string|null} Encrypted data string
 */
export const encryptWithKey = (data, key) => {
  return encryptData(data, key)
}

/**
 * Decrypt data with a custom key (useful for retrieving from different contexts)
 * @param {string} encryptedData - The encrypted data string
 * @param {string} key - The decryption key
 * @returns {any|null} Decrypted data
 */
export const decryptWithKey = (encryptedData, key) => {
  return decryptData(encryptedData, key)
}
