// Advanced caching system with TTL and memory management
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

// Size limits in bytes
const ONE_MB = 1024 * 1024;
const DEFAULT_MAX_CACHE_SIZE = 50 * ONE_MB; // 50MB default cache size
const AVG_ITEM_SIZE = 10 * 1024; // 10KB average item size

class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxSizeBytes: number = DEFAULT_MAX_CACHE_SIZE;
  private currentSizeBytes: number = 0;

  set<T>(key: string, data: T, ttl: number = 30 * 60 * 1000): void { // 30 min default TTL
    const now = Date.now();
    const entrySize = this.estimateSize(data);
    
    // Clean up if we don't have enough space
    if (this.currentSizeBytes + entrySize > this.maxSizeBytes) {
      this.cleanup(entrySize);
    }

    // Update or add new entry
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.currentSizeBytes -= existingEntry.size;
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      lastAccessed: now,
      ttl,
      size: entrySize
    });
    
    this.currentSizeBytes += entrySize;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) return null;
    
    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.currentSizeBytes -= entry.size;
      this.cache.delete(key);
      return null;
    }
    
    // Update last accessed time
    entry.lastAccessed = now;
    
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl: number = 5 * 60 * 1000): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }

  clear(): void {
    this.cache.clear();
  }

  private estimateSize(data: unknown): number {
    try {
      // Simple size estimation
      if (data === null || data === undefined) return 0;
      if (typeof data === 'string') return data.length * 2; // 2 bytes per char
      if (typeof data === 'number') return 8; // 8 bytes for number
      if (typeof data === 'boolean') return 1; // 1 byte for boolean
      if (Array.isArray(data)) {
        return data.reduce((sum, item) => sum + this.estimateSize(item), 0);
      }
      if (typeof data === 'object') {
        return Object.values(data as object).reduce(
          (sum, value) => sum + this.estimateSize(value), 0
        );
      }
      return AVG_ITEM_SIZE; // Fallback
    } catch (e) {
      console.warn('Error estimating cache entry size:', e);
      return AVG_ITEM_SIZE;
    }
  }

  cleanup(requiredSpace: number = 0): void {
    const now = Date.now();
    let entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, ...entry }));
    
    // Remove expired entries first
    const expiredEntries = entries.filter(
      entry => now - entry.timestamp > entry.ttl
    );
    
    expiredEntries.forEach(entry => {
      this.currentSizeBytes -= entry.size;
      this.cache.delete(entry.key);
    });
    
    // If we still need more space, remove least recently used entries
    let spaceToFree = (this.currentSizeBytes + requiredSpace) - this.maxSizeBytes;
    
    if (spaceToFree > 0) {
      // Sort by last accessed time (oldest first)
      entries = entries
        .filter(entry => now - entry.timestamp <= entry.ttl) // Only consider non-expired
        .sort((a, b) => a.lastAccessed - b.lastAccessed);
      
      // Remove entries until we have enough space
      for (const entry of entries) {
        if (spaceToFree <= 0) break;
        
        this.currentSizeBytes -= entry.size;
        spaceToFree -= entry.size;
        this.cache.delete(entry.key);
      }
    }
  }

  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        age: now - entry.timestamp,
        lastAccessed: now - entry.lastAccessed,
        size: entry.size,
        ttl: entry.ttl,
        expiresIn: entry.timestamp + entry.ttl - now
      }));

    const totalSizeMB = this.currentSizeBytes / ONE_MB;
    const maxSizeMB = this.maxSizeBytes / ONE_MB;
    
    return {
      entryCount: this.cache.size,
      totalSizeMB: totalSizeMB.toFixed(2),
      maxSizeMB: maxSizeMB.toFixed(2),
      usagePercent: ((totalSizeMB / maxSizeMB) * 100).toFixed(1) + '%',
      entries: entries.sort((a, b) => b.lastAccessed - a.lastAccessed).slice(0, 10) // Top 10 recently accessed
    };
  }
}

export const cache = new CacheManager();

// Expose cache clear function globally for debugging
if (typeof window !== 'undefined') {
  (window as { clearAppCache?: () => void }).clearAppCache = () => {
    cache.clear();
    console.log('Cache cleared!');
  };
}
