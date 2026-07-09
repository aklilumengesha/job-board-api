import { Injectable } from '@nestjs/common';

/**
 * Mock Cache Service for Testing
 * Provides in-memory caching without Redis dependency
 */
@Injectable()
export class CacheServiceMock {
  private cache: Map<string, any> = new Map();

  async onModuleInit() {
    // No Redis connection needed
  }

  async onModuleDestroy() {
    this.cache.clear();
  }

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get(key) || null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.cache.set(key, value);
    if (ttl) {
      setTimeout(() => this.cache.delete(key), ttl * 1000);
    }
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());
    if (pattern === '*') return allKeys;
    const regex = new RegExp(pattern.replace('*', '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  async ttl(key: string): Promise<number> {
    return this.cache.has(key) ? -1 : -2;
  }

  async flush(): Promise<void> {
    this.cache.clear();
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return keys.map(key => this.cache.get(key) || null);
  }

  async mset(keyValues: { key: string; value: any; ttl?: number }[]): Promise<void> {
    for (const { key, value, ttl } of keyValues) {
      await this.set(key, value, ttl);
    }
  }

  async increment(key: string): Promise<number> {
    const current = this.cache.get(key) || 0;
    const newValue = current + 1;
    this.cache.set(key, newValue);
    return newValue;
  }

  async decrement(key: string): Promise<number> {
    const current = this.cache.get(key) || 0;
    const newValue = current - 1;
    this.cache.set(key, newValue);
    return newValue;
  }
}
