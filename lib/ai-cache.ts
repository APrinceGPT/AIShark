/**
 * AI Response Cache
 * Caches AI responses to avoid duplicate API calls and reduce costs
 */

interface CacheEntry {
  response: any;
  timestamp: number;
}

class AICache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxAge = 30 * 60 * 1000; // 30 minutes

  /**
   * Generate cache key from request parameters
   */
  private generateKey(endpoint: string, params: any): string {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  /**
   * Get cached response if available and not expired
   */
  get(endpoint: string, params: any): any | null {
    const key = this.generateKey(endpoint, params);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[Cache HIT] ${endpoint}`);
    return entry.response;
  }

  /**
   * Store response in cache
   */
  set(endpoint: string, params: any, response: any): void {
    const key = this.generateKey(endpoint, params);
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
    });
    console.log(`[Cache SET] ${endpoint} (Total cached: ${this.cache.size})`);
  }

  /**
   * Clear all cached responses
   */
  clear(): void {
    this.cache.clear();
    console.log('[Cache CLEAR] All cached responses cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const aiCache = new AICache();
