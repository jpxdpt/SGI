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
    // maxSize: número máximo de entradas no cache
    // defaultTTL: tempo de vida padrão (5 minutos)
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;

    // Limpar entradas expiradas a cada minuto
    setInterval(() => {
      this.cleanExpired();
    }, 60 * 1000);
  }

  /**
   * Obter valor do cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Verificar se expirou
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Guardar valor no cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Se o cache estiver cheio, remover entrada mais antiga
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data: value, expiresAt });
  }

  /**
   * Remover entrada do cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Limpar todas as entradas expiradas
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpar todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Obter estatísticas do cache
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired: expiredCount,
      active: this.cache.size - expiredCount,
    };
  }
}

// Instância global do cache
export const cache = new MemoryCache(1000, 5 * 60 * 1000); // 1000 entradas, 5 minutos TTL

/**
 * Helper para cache de queries - executa a função se não estiver em cache
 */
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl?: number,
): Promise<T> {
  // Tentar obter do cache
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Executar query e guardar no cache
  const result = await queryFn();
  cache.set(key, result, ttl);
  return result;
}

/**
 * Invalidar cache por padrão (útil para invalidar múltiplas chaves relacionadas)
 */
export function invalidateCachePattern(pattern: string): void {
  const regex = new RegExp(pattern);
  for (const key of cache['cache'].keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}





