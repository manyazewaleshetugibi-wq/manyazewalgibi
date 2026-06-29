// lib/encryption.ts
'use client'

import CryptoJS from 'crypto-js'

export class EncryptionService {
  private static instance: EncryptionService
  private readonly SECRET_KEY: string

  private constructor() {
    // Generate a consistent key for this session
    this.SECRET_KEY = this.generateSecretKey()
  }

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService()
    }
    return EncryptionService.instance
  }

  private generateSecretKey(): string {
    // Use a combination of factors for a more secure key
    const baseKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'menu-app-secure-key-2024'
    const salt = process.env.NEXT_PUBLIC_ENCRYPTION_SALT || 'menu-app-salt'
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const timestamp = new Date().toDateString()
    
    // Create a unique key based on multiple factors
    const combined = `${baseKey}:${salt}:${userAgent}:${timestamp}`
    
    // Hash it to create a consistent key
    return CryptoJS.SHA256(combined).toString()
  }

  // Encrypt data
  encrypt(data: any): string {
    try {
      const jsonString = JSON.stringify(data)
      const encrypted = CryptoJS.AES.encrypt(jsonString, this.SECRET_KEY, {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })
      return encrypted.toString()
    } catch (error) {
      console.error('Encryption error:', error)
      // Fallback: base64 encode
      return btoa(JSON.stringify(data))
    }
  }

  // Decrypt data
  decrypt(encryptedData: string): any {
    try {
      // Check if it's encrypted (starts with our encryption pattern)
      if (!this.isEncrypted(encryptedData)) {
        // Try to parse as JSON (legacy data)
        try {
          return JSON.parse(encryptedData)
        } catch {
          return null
        }
      }

      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.SECRET_KEY, {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })
      
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8)
      return JSON.parse(decryptedString)
    } catch (error) {
      console.error('Decryption error:', error)
      return null
    }
  }

  // Check if data is encrypted
  isEncrypted(data: string): boolean {
    try {
      // Encrypted data typically contains base64 characters and is longer
      return data.length > 20 && /^[A-Za-z0-9+/=]+$/.test(data)
    } catch {
      return false
    }
  }
}

// Storage Manager with Encryption
export class SecureStorage {
  private static instance: SecureStorage
  private encryptionService: EncryptionService

  private constructor() {
    this.encryptionService = EncryptionService.getInstance()
  }

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage()
    }
    return SecureStorage.instance
  }

  // Set encrypted item
  setItem(key: string, value: any): void {
    try {
      const encrypted = this.encryptionService.encrypt(value)
      localStorage.setItem(this.getEncryptedKey(key), encrypted)
    } catch (error) {
      console.error(`Failed to store data for ${key}:`, error)
      // Fallback: store as JSON
      localStorage.setItem(this.getEncryptedKey(key), JSON.stringify(value))
    }
  }

  // Get decrypted item
  getItem<T = any>(key: string): T | null {
    try {
      const encryptedKey = this.getEncryptedKey(key)
      const data = localStorage.getItem(encryptedKey)
      if (!data) return null

      // Try to decrypt
      const decrypted = this.encryptionService.decrypt(data)
      return decrypted as T
    } catch (error) {
      console.error(`Failed to retrieve data for ${key}:`, error)
      return null
    }
  }

  // Remove item
  removeItem(key: string): void {
    localStorage.removeItem(this.getEncryptedKey(key))
  }

  // Get encrypted key name
  private getEncryptedKey(key: string): string {
    return `encrypted_${key}`
  }

  // Check if data exists
  hasItem(key: string): boolean {
    return localStorage.getItem(this.getEncryptedKey(key)) !== null
  }
}