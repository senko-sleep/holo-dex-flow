// Local storage manager for API data persistence
// Stores API responses locally to reduce dependency on external APIs

interface StorageEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const STORAGE_PREFIX = 'holo_dex_';
const MAX_STORAGE_SIZE = 10 * 1024 * 1024; // 10MB limit

class LocalStorageManager {
  /**
   * Save data to localStorage with TTL
   */
  set<T>(key: string, data: T, ttl: number = 24 * 60 * 60 * 1000): boolean {
    try {
      const entry: StorageEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      const serialized = JSON.stringify(entry);
      
      // Check size before storing
      if (serialized.length > MAX_STORAGE_SIZE) {
        console.warn('Data too large for localStorage:', key);
        return false;
      }

      localStorage.setItem(STORAGE_PREFIX + key, serialized);
      return true;
    } catch (error) {
      // Handle quota exceeded or other errors
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old entries...');
        this.cleanup();
        
        // Try again after cleanup
        try {
          const entry: StorageEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
          };
          localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
          return true;
        } catch (retryError) {
          console.error('Failed to store data after cleanup:', retryError);
          return false;
        }
      }
      console.error('Error storing data in localStorage:', error);
      return false;
    }
  }

  /**
   * Get data from localStorage
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      if (!item) return null;

      const entry: StorageEntry<T> = JSON.parse(item);
      const now = Date.now();

      // Check if expired
      if (now - entry.timestamp > entry.ttl) {
        this.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove specific key
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  /**
   * Get or fetch data (with fallback to API)
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 24 * 60 * 60 * 1000
  ): Promise<T> {
    // Try localStorage first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from API
    const data = await fetchFn();
    
    // Store for next time
    this.set(key, data, ttl);
    
    return data;
  }

  /**
   * Clear all app data from localStorage
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      
      keys.forEach(key => {
        if (!key.startsWith(STORAGE_PREFIX)) return;
        
        try {
          const item = localStorage.getItem(key);
          if (!item) return;
          
          const entry: StorageEntry<unknown> = JSON.parse(item);
          
          // Remove if expired
          if (now - entry.timestamp > entry.ttl) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    totalKeys: number;
    totalSize: number;
    sizeMB: string;
    entries: Array<{ key: string; size: number; age: number }>;
  } {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
    let totalSize = 0;
    const entries: Array<{ key: string; size: number; age: number }> = [];
    const now = Date.now();

    keys.forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        const size = item.length * 2; // Approximate size in bytes
        totalSize += size;
        
        try {
          const entry: StorageEntry<unknown> = JSON.parse(item);
          entries.push({
            key: key.replace(STORAGE_PREFIX, ''),
            size,
            age: now - entry.timestamp,
          });
        } catch (error) {
          // Skip corrupted entries
        }
      }
    });

    return {
      totalKeys: keys.length,
      totalSize,
      sizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      entries: entries.sort((a, b) => b.size - a.size).slice(0, 10), // Top 10 by size
    };
  }
}

export const localStorageManager = new LocalStorageManager();

// Expose utilities globally for debugging
if (typeof window !== 'undefined') {
  (window as Window & { clearAppStorage?: () => void }).clearAppStorage = () => {
    localStorageManager.clear();
    console.log('Local storage cleared!');
  };
  
  (window as Window & { storageStats?: () => ReturnType<typeof localStorageManager.getStats> }).storageStats = () => {
    const stats = localStorageManager.getStats();
    console.log('Storage Statistics:', stats);
    return stats;
  };
}
