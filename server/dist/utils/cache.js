"use strict";
/**
 * Cache em memória simples para queries frequentes
 * Em produção, substituir por Redis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
exports.cachedQuery = cachedQuery;
exports.invalidateCachePattern = invalidateCachePattern;
class MemoryCache {
    constructor(maxSize = 1000, defaultTTL = 5 * 60 * 1000) {
        this.cache = new Map();
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
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        // Verificar se expirou
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    /**
     * Guardar valor no cache
     */
    set(key, value, ttl) {
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
    delete(key) {
        this.cache.delete(key);
    }
    /**
     * Limpar todas as entradas expiradas
     */
    cleanExpired() {
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
    clear() {
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
exports.cache = new MemoryCache(1000, 5 * 60 * 1000); // 1000 entradas, 5 minutos TTL
/**
 * Helper para cache de queries - executa a função se não estiver em cache
 */
async function cachedQuery(key, queryFn, ttl) {
    // Tentar obter do cache
    const cached = exports.cache.get(key);
    if (cached !== null) {
        return cached;
    }
    // Executar query e guardar no cache
    const result = await queryFn();
    exports.cache.set(key, result, ttl);
    return result;
}
/**
 * Invalidar cache por padrão (útil para invalidar múltiplas chaves relacionadas)
 */
function invalidateCachePattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of exports.cache['cache'].keys()) {
        if (regex.test(key)) {
            exports.cache.delete(key);
        }
    }
}
