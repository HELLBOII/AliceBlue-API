import CryptoJS from 'crypto-js'

// Salt for encryption - in production, this should be stored securely
const ENCRYPTION_SALT = 'aliceblue-trading-salt-2024'

/**
 * Encrypts a string using AES encryption with a salt
 * @param text - The text to encrypt
 * @returns The encrypted string
 */
export function encryptText(text: string): string {
  if (!text) return text
  
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_SALT).toString()
    return encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    return text
  }
}

/**
 * Decrypts a string using AES decryption with a salt
 * @param encryptedText - The encrypted text to decrypt
 * @returns The decrypted string
 */
export function decryptText(encryptedText: string): string {
  if (!encryptedText) return encryptedText
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_SALT)
    return decrypted.toString(CryptoJS.enc.Utf8)
  } catch (error) {
    console.error('Decryption error:', error)
    return encryptedText
  }
}

/**
 * Encrypts AliceBlue account credentials
 * @param accounts - Array of AliceBlue accounts
 * @returns Array of accounts with encrypted UserId and ApiKey
 */
export function encryptAliceBlueAccounts(accounts: Array<{
  Name: string
  Category: string
  UserId: string
  ApiKey: string
}>): Array<{
  Name: string
  Category: string
  UserId: string
  ApiKey: string
}> {
  return accounts.map(account => ({
    ...account,
    UserId: encryptText(account.UserId),
    ApiKey: encryptText(account.ApiKey)
  }))
}

/**
 * Decrypts AliceBlue account credentials
 * @param accounts - Array of AliceBlue accounts with encrypted credentials
 * @returns Array of accounts with decrypted UserId and ApiKey
 */
export function decryptAliceBlueAccounts(accounts: Array<{
  Name: string
  Category: string
  UserId: string
  ApiKey: string
}>): Array<{
  Name: string
  Category: string
  UserId: string
  ApiKey: string
}> {
  return accounts.map(account => ({
    ...account,
    UserId: decryptText(account.UserId),
    ApiKey: decryptText(account.ApiKey)
  }))
}

/**
 * Checks if a string appears to be encrypted (base64-like format)
 * @param text - The text to check
 * @returns True if the text appears to be encrypted
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false
  
  // Check if it looks like base64 encoded data
  const base64Regex = /^[A-Za-z0-9+/]+=*$/
  return base64Regex.test(text) && text.length > 20
}
