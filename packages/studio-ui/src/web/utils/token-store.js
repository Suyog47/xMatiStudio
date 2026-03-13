import { encryptData, decryptData } from './crypto-utils'

// Creates and returns a new unique symbol key with an optional debug label
export const createKey = (label) => Symbol(label)

// This Map is ONLY accessible inside this closure
// It cannot be accessed from window or browser console, providing better security
const _vault = new Map() // Map<Symbol, encryptedValue>

// Associates a value to the private vault under the provided Symbol key
// Encrypts the value before storage
export const setForKey = (key, value) => {
  if (typeof key !== 'symbol') {
    throw new TypeError('setForKey: key must be a Symbol')
  }

  // Encrypt the value before storing
  const encryptedValue = encryptData(value)
  _vault.set(key, encryptedValue)
  return value // Return original value for convenience
}

// Retrieves the value for the given Symbol key from the private vault
// Decrypts the value after retrieval
export const getForKey = (key) => {
  if (typeof key !== 'symbol') {
    throw new TypeError('getForKey: key must be a Symbol')
  }

  const encryptedValue = _vault.get(key)
  if (!encryptedValue) {
    return undefined
  }

  // Decrypt the value before returning
  try {
    return decryptData(encryptedValue)
  } catch (error) {
    console.error('Failed to decrypt value for key:', key.toString())
    return undefined
  }
}

// Checks if the private vault has a value for the given Symbol key
export const hasForKey = (key) => {
  if (typeof key !== 'symbol') {
    throw new TypeError('hasForKey: key must be a Symbol')
  }

  return _vault.has(key)
}

// Deletes the value associated with the given Symbol key from the private vault
export const deleteForKey = (key) => {
  if (typeof key !== 'symbol') {
    throw new TypeError('deleteForKey: key must be a Symbol')
  }

  return _vault.delete(key)
}

export const createStore = (label) => {
  const key = createKey(label)

  return {
    key,
    set: (value) => setForKey(key, value),
    get: () => getForKey(key),
    has: () => hasForKey(key),
    delete: () => deleteForKey(key)
  }
}

// Pre-created store for AES and JWT encryption keys
export const aesKeyStore = createStore('aes-key')
export const jwtKeyStore = createStore('jwt-key')
export const formDataStore = createStore('formData')
export const subDataStore = createStore('subData')
export const hitlAccessStore = createStore('hitlAccess')
