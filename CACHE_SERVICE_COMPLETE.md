# ✅ Cache Service - COMPLETE

## 📦 What We Built

### Cache Service (Step 11)
**Location**: `src/infrastructure/cache/`

#### Features:
- ✅ **Redis Caching**
  - Redis client integration with auto-reconnect
  - Connection pooling and error handling
  - Structured logging with Winston

- ✅ **Basic Operations**
  - `set()` - Set value with optional TTL
  - `get()` - Get value (returns null if not found)
  - `del()` - Delete single key
  - `delPattern()` - Delete keys matching pattern
  - `exists()` - Check if key exists
  - `expire()` - Set expiration time
  - `ttl()` - Get remaining time-to-live

- ✅ **Advanced Operations**
  - `increment()` / `decrement()` - Atomic counters
  - `mset()` / `mget()` - Batch operations
  - `sadd()` / `smembers()` / `srem()` - Set operations
  - `getOrSet()` - Cache-aside pattern
  - `flushAll()` - Clear all cache
  - `info()` / `ping()` - Health checks

---

## 📁 File Structure

```
src/infrastructure/cache/
├── cache.service.ts                ✅ Cache service (Redis)
└── cache.module.ts                 ✅ Cache module (global)
```

---

## 🔧 Configuration

### Environment Variables

```env
# Redis (Cache & Queue)
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_DB=0
```

### Redis Setup

**Development (Local Redis):**
```bash
# Windows (via Chocolatey)
choco install redis-64
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:alpine

# Or use WSL
wsl
sudo apt install redis-server
redis-server
```

**Production:**
- AWS ElastiCache
- Redis Cloud
- Azure Cache for Redis
- Always set REDIS_PASSWORD in production!

---

## 💻 Usage Examples

### 1. Basic Caching

```typescript
import { Injectable } from '@nestjs/common';
import { CacheService } from '@infrastructure/cache';

@Injectable()
export class JobService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  async getActiveJobs() {
    // Try cache first
    const cached = await this.cacheService.get<Job[]>('jobs:active');
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const jobs = await this.prisma.job.findMany({
      where: { status: 'ACTIVE' },
    });

    // Store in cache for 5 minutes
    await this.cacheService.set('jobs:active', jobs, 300);

    return jobs;
  }
}
```

### 2. Cache-Aside Pattern (Recommended)

```typescript
async getActiveJobs() {
  return await this.cacheService.getOrSet(
    'jobs:active',
    async () => {
      // This callback only runs on cache miss
      return await this.prisma.job.findMany({
        where: { status: 'ACTIVE' },
      });
    },
    300, // 5 minutes TTL
  );
}
```

### 3. User Session Caching

```typescript
// Store user session
await this.cacheService.set(
  `session:${userId}`,
  {
    userId,
    email: user.email,
    role: user.role,
    lastActive: new Date(),
  },
  3600, // 1 hour
);

// Get user session
const session = await this.cacheService.get(`session:${userId}`);

// Extend session expiry
await this.cacheService.expire(`session:${userId}`, 3600);
```

### 4. Rate Limiting

```typescript
async checkRateLimit(ip: string): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  const requests = await this.cacheService.increment(key);

  if (requests === 1) {
    // First request - set expiry
    await this.cacheService.expire(key, 60); // 1 minute window
  }

  if (requests > 100) {
    throw new TooManyRequestsException('Rate limit exceeded');
  }

  return true;
}
```

### 5. View Counter

```typescript
// Increment job view count
async incrementViews(jobId: string) {
  const key = `job:${jobId}:views`;
  const views = await this.cacheService.increment(key);
  
  // Persist to database every 10 views
  if (views % 10 === 0) {
    await this.prisma.job.update({
      where: { id: jobId },
      data: { views },
    });
  }
  
  return views;
}
```

### 6. Delete Cache Pattern

```typescript
// Invalidate all job caches
async invalidateJobCaches() {
  const count = await this.cacheService.delPattern('jobs:*');
  console.log(`Invalidated ${count} job caches`);
}

// Invalidate specific cache
await this.cacheService.del('jobs:active');
```

### 7. Batch Operations

```typescript
// Set multiple keys at once
await this.cacheService.mset({
  'config:theme': 'dark',
  'config:language': 'en',
  'config:timezone': 'UTC',
});

// Get multiple keys at once
const [theme, language, timezone] = await this.cacheService.mget([
  'config:theme',
  'config:language',
  'config:timezone',
]);
```

### 8. Set Operations (Tags, Categories)

```typescript
// Add job to category set
await this.cacheService.sadd('category:tech:jobs', jobId1, jobId2, jobId3);

// Get all jobs in category
const jobIds = await this.cacheService.smembers('category:tech:jobs');

// Remove job from category
await this.cacheService.srem('category:tech:jobs', jobId1);
```

### 9. Cache Warmer (Pre-populate Cache)

```typescript
@Injectable()
export class CacheWarmer implements OnModuleInit {
  constructor(
    private readonly cacheService: CacheService,
    private readonly jobService: JobService,
  ) {}

  async onModuleInit() {
    // Pre-load frequently accessed data
    const activeJobs = await this.jobService.findAll({ status: 'ACTIVE' });
    await this.cacheService.set('jobs:active', activeJobs, 300);
    
    const categories = await this.categoryService.findAll();
    await this.cacheService.set('categories:all', categories, 3600);
  }
}
```

---

## 🎯 Use Cases

### Performance Optimization
- ✅ Cache active job listings (reduce DB load)
- ✅ Cache user profiles (faster authentication)
- ✅ Cache search results (improve search speed)
- ✅ Cache frequently accessed data

### Rate Limiting
- ✅ API rate limiting per IP
- ✅ Login attempt tracking
- ✅ Request throttling per user

### Session Management
- ✅ Store user sessions
- ✅ JWT token blacklist (logout)
- ✅ Remember me tokens

### Counters & Analytics
- ✅ Job view counts
- ✅ Application counts
- ✅ Real-time statistics

### Temporary Data
- ✅ Email verification tokens
- ✅ Password reset tokens
- ✅ OTP codes
- ✅ Form drafts

---

## 🔑 Cache Key Naming Convention

Use a structured naming pattern:

```typescript
// Good patterns
'jobs:active'              // All active jobs
'job:123:details'          // Specific job details
'user:456:profile'         // User profile
'category:tech:jobs'       // Jobs in tech category
'session:789'              // User session
'ratelimit:192.168.1.1'   // Rate limit for IP
'search:developer:NY'      // Search results

// Avoid
'jobs'                     // Too generic
'123'                      // Not descriptive
'mydata'                   // Unclear purpose
```

---

## ⏰ TTL (Time-To-Live) Guidelines

```typescript
// Very dynamic data (changes frequently)
await cache.set('job:recent', data, 60);  // 1 minute

// Dynamic data
await cache.set('jobs:active', data, 300); // 5 minutes

// Semi-static data
await cache.set('categories', data, 3600); // 1 hour

// Static data (rarely changes)
await cache.set('site:config', data, 86400); // 24 hours

// Temporary data
await cache.set('token:verify', data, 900); // 15 minutes
await cache.set('otp:123', code, 300); // 5 minutes

// Session data
await cache.set('session:456', data, 3600); // 1 hour
```

---

## 🚀 Best Practices

### 1. Always Set TTL
```typescript
// ❌ Bad - no expiry (memory leak risk)
await cache.set('key', value);

// ✅ Good - with expiry
await cache.set('key', value, 300);
```

### 2. Handle Cache Misses
```typescript
// ✅ Good - handle null
const data = await cache.get('key');
if (!data) {
  // Fetch from database
  data = await this.fetchFromDB();
  await cache.set('key', data, 300);
}
```

### 3. Use Cache-Aside Pattern
```typescript
// ✅ Best - built-in cache-aside
const data = await cache.getOrSet(
  'key',
  () => this.fetchFromDB(),
  300
);
```

### 4. Invalidate on Updates
```typescript
async updateJob(id: string, data: UpdateJobDto) {
  const job = await this.prisma.job.update({ where: { id }, data });
  
  // Invalidate related caches
  await this.cacheService.del(`job:${id}:details`);
  await this.cacheService.delPattern('jobs:*');
  
  return job;
}
```

### 5. Error Handling
```typescript
// Cache failures shouldn't break the app
try {
  const cached = await this.cacheService.get('key');
  if (cached) return cached;
} catch (error) {
  // Log but don't throw - fall back to DB
  this.logger.error('Cache error:', error);
}

// Always fetch from database as fallback
return await this.database.fetch();
```

---

## 📊 Monitoring

### Check Cache Health

```typescript
@Get('cache/health')
async getCacheHealth() {
  const isConnected = await this.cacheService.ping();
  const info = await this.cacheService.info();
  
  return {
    connected: isConnected,
    info,
  };
}
```

### Cache Hit Rate Tracking

```typescript
private cacheHits = 0;
private cacheMisses = 0;

async get(key: string) {
  const value = await this.cacheService.get(key);
  
  if (value) {
    this.cacheHits++;
  } else {
    this.cacheMisses++;
  }
  
  return value;
}

getCacheHitRate() {
  const total = this.cacheHits + this.cacheMisses;
  return total > 0 ? (this.cacheHits / total) * 100 : 0;
}
```

---

## 🔒 Security Considerations

1. **Set Password in Production**
   ```env
   REDIS_PASSWORD="strong-random-password"
   ```

2. **Use Different Redis DBs**
   ```env
   REDIS_DB=0  # Cache
   REDIS_DB=1  # Queue
   REDIS_DB=2  # Sessions
   ```

3. **Encrypt Sensitive Data**
   ```typescript
   // Don't cache sensitive data in plain text
   const encrypted = encrypt(sensitiveData);
   await cache.set('key', encrypted, 300);
   ```

4. **Validate Cache Data**
   ```typescript
   // Validate data from cache (could be stale/corrupted)
   const data = await cache.get('key');
   if (data && isValid(data)) {
     return data;
   }
   ```

---

## 📦 Dependencies

```json
{
  "redis": "^4.x"
}
```

---

## ✨ Key Features

1. **Performance** - Sub-millisecond operations
2. **Reliability** - Auto-reconnect on connection loss
3. **Flexibility** - Multiple data structures (string, set, hash)
4. **Type-Safe** - Full TypeScript support
5. **Patterns** - Cache-aside, counters, rate limiting
6. **Monitoring** - Info, ping, TTL checks
7. **Batch Operations** - mget, mset for efficiency

---

## 🧪 Build Status

```bash
npm run build
```
✅ **Status**: PASSING

---

**Status**: ✅ CACHE SERVICE COMPLETE
**Build**: ✅ PASSING
**Date**: July 6, 2026
**Files Created**: 2 (service, module)
**Lines of Code**: ~420+
