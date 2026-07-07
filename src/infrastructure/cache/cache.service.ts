import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { LoggerService } from '../../core/logger/logger.service';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Connect to Redis
   */
  private async connect(): Promise<void> {
    try {
      const host = this.configService.get<string>('REDIS_HOST', 'localhost');
      const port = this.configService.get<number>('REDIS_PORT', 6379);
      const password = this.configService.get<string>('REDIS_PASSWORD');
      const db = this.configService.get<number>('REDIS_DB', 0);

      this.client = createClient({
        socket: {
          host,
          port,
        },
        password: password || undefined,
        database: db,
      });

      // Error handler
      this.client.on('error', (error) => {
        this.logger.error(`Redis error: ${error.message}`, error.stack, 'CacheService');
        this.isConnected = false;
      });

      // Ready handler
      this.client.on('ready', () => {
        this.logger.log('Redis connection ready', 'CacheService');
        this.isConnected = true;
      });

      // Connect handler
      this.client.on('connect', () => {
        this.logger.log('Redis client connected', 'CacheService');
      });

      // Reconnecting handler
      this.client.on('reconnecting', () => {
        this.logger.warn('Redis client reconnecting...', 'CacheService');
      });

      await this.client.connect();
      this.logger.log(`Redis connected: ${host}:${port}`, 'CacheService');
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`, error.stack, 'CacheService');
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  private async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.logger.log('Redis disconnected', 'CacheService');
      this.isConnected = false;
    }
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);

      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }

      this.logger.debug(`Cache SET: ${key}`, 'CacheService');
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}: ${error.message}`, error.stack, 'CacheService');
      throw error;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);

      if (!value) {
        this.logger.debug(`Cache MISS: ${key}`, 'CacheService');
        return null;
      }

      this.logger.debug(`Cache HIT: ${key}`, 'CacheService');
      return JSON.parse(value as string) as T;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}: ${error.message}`, error.stack, 'CacheService');
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
      this.logger.debug(`Cache DEL: ${key}`, 'CacheService');
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}: ${error.message}`, error.stack, 'CacheService');
      throw error;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      await this.client.del(keys);
      this.logger.debug(`Cache DEL pattern ${pattern}: ${keys.length} keys deleted`, 'CacheService');
      return keys.length;
    } catch (error) {
      this.logger.error(
        `Cache DEL pattern error for ${pattern}: ${error.message}`,
        error.stack,
        'CacheService',
      );
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Cache EXISTS error for key ${key}: ${error.message}`, error.stack, 'CacheService');
      return false;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.expire(key, ttlSeconds);
      this.logger.debug(`Cache EXPIRE: ${key} (${ttlSeconds}s)`, 'CacheService');
    } catch (error) {
      this.logger.error(`Cache EXPIRE error for key ${key}: ${error.message}`, error.stack, 'CacheService');
      throw error;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error(`Cache TTL error for key ${key}: ${error.message}`, error.stack, 'CacheService');
      return -2; // Key doesn't exist
    }
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const result = await this.client.incrBy(key, amount);
      this.logger.debug(`Cache INCR: ${key} by ${amount}`, 'CacheService');
      return result;
    } catch (error) {
      this.logger.error(`Cache INCR error for key ${key}: ${error.message}`, error.stack, 'CacheService');
      throw error;
    }
  }

  /**
   * Decrement a numeric value
   */
  async decrement(key: string, amount: number = 1): Promise<number> {
    try {
      const result = await this.client.decrBy(key, amount);
      this.logger.debug(`Cache DECR: ${key} by ${amount}`, 'CacheService');
      return result;
    } catch (error) {
      this.logger.error(`Cache DECR error for key ${key}: ${error.message}`, error.stack, 'CacheService');
      throw error;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs: Record<string, any>): Promise<void> {
    try {
      const pairs = Object.entries(keyValuePairs).flatMap(([key, value]) => [
        key,
        JSON.stringify(value),
      ]);

      await this.client.mSet(pairs);
      this.logger.debug(`Cache MSET: ${Object.keys(keyValuePairs).length} keys`, 'CacheService');
    } catch (error) {
      this.logger.error(`Cache MSET error: ${error.message}`, error.stack, 'CacheService');
      throw error;
    }
  }

  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.client.mGet(keys);
      this.logger.debug(`Cache MGET: ${keys.length} keys`, 'CacheService');

      return values.map(value => (value ? JSON.parse(value as string) as T : null));
    } catch (error) {
      this.logger.error(`Cache MGET error: ${error.message}`, error.stack, 'CacheService');
      return keys.map(() => null);
    }
  }

  /**
   * Add item to set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      const result = await this.client.sAdd(key, members);
      this.logger.debug(`Cache SADD: ${key} (${members.length} members)`, 'CacheService');
      return result;
    } catch (error) {
      this.logger.error(`Cache SADD error for key ${key}: ${error.message}`, error.stack, 'CacheService');
      throw error;
    }
  }

  /**
   * Get all members of a set
   */
  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.sMembers(key);
    } catch (error) {
      this.logger.error(`Cache SMEMBERS error for key ${key}: ${error.message}`, error.stack, 'CacheService');
      return [];
    }
  }

  /**
   * Remove members from set
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      const result = await this.client.sRem(key, members);
      this.logger.debug(`Cache SREM: ${key} (${members.length} members)`, 'CacheService');
      return result;
    } catch (error) {
      this.logger.error(`Cache SREM error for key ${key}: ${error.message}`, error.stack, 'CacheService');
      throw error;
    }
  }

  /**
   * Flush all cache data
   */
  async flushAll(): Promise<void> {
    try {
      await this.client.flushAll();
      this.logger.warn('Cache FLUSHALL: All data removed', 'CacheService');
    } catch (error) {
      this.logger.error(`Cache FLUSHALL error: ${error.message}`, error.stack, 'CacheService');
      throw error;
    }
  }

  /**
   * Get cache info
   */
  async info(): Promise<string> {
    try {
      return await this.client.info();
    } catch (error) {
      this.logger.error(`Cache INFO error: ${error.message}`, error.stack, 'CacheService');
      return '';
    }
  }

  /**
   * Ping Redis server
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response === 'PONG';
    } catch (error) {
      this.logger.error(`Cache PING error: ${error.message}`, error.stack, 'CacheService');
      return false;
    }
  }

  /**
   * Get or set with callback (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Get from source
    const value = await callback();

    // Set in cache
    await this.set(key, value, ttlSeconds);

    return value;
  }
}
