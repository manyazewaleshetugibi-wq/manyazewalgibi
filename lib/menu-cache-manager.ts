// lib/menu-cache-manager.ts
'use client'

import { SecureStorage } from './encryption'

export class MenuCacheManager {
  private static instance: MenuCacheManager
  private storage: SecureStorage
  private cacheDuration: number

  private constructor() {
    this.storage = SecureStorage.getInstance()
    this.cacheDuration = 5 * 60 * 1000 // 5 minutes
  }

  static getInstance(): MenuCacheManager {
    if (!MenuCacheManager.instance) {
      MenuCacheManager.instance = new MenuCacheManager()
    }
    return MenuCacheManager.instance
  }

  // Cache keys
  private getKeys() {
    return {
      categories: 'menu_categories',
      items: 'menu_items',
      waiters: 'menu_waiters',
      timestamp: 'menu_timestamp',
      version: 'menu_version'
    }
  }

  // Save all menu data
  async saveMenuData(categories: any[], items: any[], waiters: any[]): Promise<void> {
    try {
      const keys = this.getKeys()
      
      // Save each piece of data
      this.storage.setItem(keys.categories, categories)
      this.storage.setItem(keys.items, items)
      this.storage.setItem(keys.waiters, waiters)
      this.storage.setItem(keys.timestamp, Date.now())
      this.storage.setItem(keys.version, 'v2')
      
      console.log('✅ Menu data saved securely')
    } catch (error) {
      console.error('Failed to save menu data:', error)
      throw error
    }
  }

  // Load all menu data
  async loadMenuData(): Promise<{
    categories: any[]
    items: any[]
    waiters: any[]
    timestamp: number | null
    version: string | null
    isValid: boolean
  }> {
    const empty = { categories: [], items: [], waiters: [], timestamp: null, version: null, isValid: false }
    try {
      const keys = this.getKeys()

      const categories = this.storage.getItem<any[]>(keys.categories)
      const items = this.storage.getItem<any[]>(keys.items)

      // If either returned null it means decryption failed (corrupt/old key) — wipe and refetch
      if (!Array.isArray(categories) || !Array.isArray(items)) {
        console.warn('⚠️ Cache corrupt or key changed — clearing cache')
        await this.clearCache()
        return empty
      }

      const waiters = this.storage.getItem<any[]>(keys.waiters) || []
      const timestamp = this.storage.getItem<number>(keys.timestamp) || null
      const version = this.storage.getItem<string>(keys.version) || null
      const isValid = this.isCacheValid(timestamp)

      return { categories, items, waiters, timestamp, version, isValid }
    } catch (error) {
      console.error('Failed to load menu data:', error)
      await this.clearCache()
      return empty
    }
  }

  // Check if cache is valid
  private isCacheValid(timestamp: number | null): boolean {
    if (!timestamp) return false
    const elapsed = Date.now() - timestamp
    return elapsed < this.cacheDuration
  }

  // Clear all cache
  async clearCache(): Promise<void> {
    const keys = this.getKeys()
    Object.values(keys).forEach(key => {
      this.storage.removeItem(key)
    })
    console.log('🗑️ Menu cache cleared')
  }

  // Migrate old plain text data to encrypted
  async migrateOldData(): Promise<boolean> {
    try {
      console.log('🔄 Starting migration of old data...')
      
      const oldKeys = ['menu_categories', 'menu_items', 'menu_waiters', 'menu_timestamp', 'menu_version']
      const newKeys = this.getKeys()
      let migrated = false

      for (let i = 0; i < oldKeys.length; i++) {
        const oldKey = oldKeys[i]
        const newKey = Object.values(newKeys)[i]
        
        // Check if old key exists
        const oldData = localStorage.getItem(oldKey)
        if (oldData) {
          try {
            // Try to parse as JSON
            const parsed = JSON.parse(oldData)
            
            // Store with encryption
            this.storage.setItem(newKey, parsed)
            
            // Remove old data
            localStorage.removeItem(oldKey)
            
            migrated = true
            console.log(`✅ Migrated ${oldKey} to encrypted ${newKey}`)
          } catch (e) {
            console.warn(`⚠️ Could not migrate ${oldKey}, skipping...`)
          }
        }
      }

      return migrated
    } catch (error) {
      console.error('Migration failed:', error)
      return false
    }
  }
}