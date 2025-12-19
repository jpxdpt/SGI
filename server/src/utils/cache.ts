/**
 * Cache em memória simples para queries frequentes
 * Em produção, substituir por Redis
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTTL: number; // em milissegundos

  constructor(maxSize = 1000, defaultTTL = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;

    // Limpar entradas expiradas a cada minuto
    setInterval(() => {
      this.cleanExpired();
    }, 60 * 1000);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data: value, expiresAt });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  deletePrefix(prefix: string): void {
    const keysToRemove: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => this.cache.delete(key));
  }

  deletePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToRemove: string[] = [];
    for (const key of this.cache.keys()) {
      if (regex.test(key)) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => this.cache.delete(key));
  }

  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) expiredCount++;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired: expiredCount,
      active: this.cache.size - expiredCount,
    };
  }
}

export const cache = new MemoryCache(1000, 5 * 60 * 1000);

export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl?: number,
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) return cached;

  const result = await queryFn();
  cache.set(key, result, ttl);
  return result;
}

export function invalidateCachePattern(pattern: string): void {
  cache.deletePattern(pattern);
}
