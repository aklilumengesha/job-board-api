# ✅ Queue Service - COMPLETE

## 📦 What We Built

### Queue Service (Step 10)
**Location**: `src/infrastructure/queue/`

#### Features:
- ✅ **Background Job Processing**
  - BullMQ integration with Redis
  - Multiple queue support
  - Worker registration with concurrency
  - Job lifecycle management

- ✅ **Job Management**
  - Add single jobs with `addJob()`
  - Add bulk jobs with `addBulkJobs()`
  - Job priorities (higher number = higher priority)
  - Delayed jobs (schedule for future)
  - Automatic retry with exponential backoff

- ✅ **Queue Operations**
  - Pause/resume queues
  - Clean completed/failed jobs
  - Drain queue (remove waiting jobs)
  - Obliterate queue (remove everything)
  - Get queue statistics

- ✅ **Worker Features**
  - Configurable concurrency (parallel processing)
  - Event listeners (completed, failed, error)
  - Automatic error handling
  - Winston logging integration

---

## 📁 File Structure

```
src/infrastructure/queue/
├── queue.service.ts                ✅ Queue service (BullMQ)
└── queue.module.ts                 ✅ Queue module (global)
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
# Install Redis on Windows (via Chocolatey)
choco install redis-64

# Or use Docker
docker run -d -p 6379:6379 redis:alpine
```

**Production:**
- Use managed Redis (AWS ElastiCache, Redis Cloud, etc.)
- Set REDIS_PASSWORD for security

---

## 💻 Usage Examples

### 1. Register a Worker (Process Background Jobs)

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@infrastructure/queue';
import { EmailService } from '@infrastructure/email';

@Injectable()
export class EmailQueueProcessor implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit() {
    // Register worker to process email jobs
    this.queueService.registerWorker(
      'email-queue',
      async (job) => {
        const { type, email, data } = job.data;

        switch (type) {
          case 'welcome':
            await this.emailService.sendWelcomeEmail(email, data.userName);
            break;
          case 'verification':
            await this.emailService.sendVerificationEmail(email, data.userName, data.token);
            break;
          case 'password-reset':
            await this.emailService.sendPasswordResetEmail(email, data.userName, data.token);
            break;
        }

        return { success: true, email, type };
      },
      5, // Process 5 jobs concurrently
    );
  }
}
```

### 2. Add Background Job

```typescript
// In your AuthService or controller
async register(registerDto: RegisterDto) {
  // Create user...
  const user = await this.prisma.user.create({ data: userData });

  // Send welcome email in background (non-blocking)
  await this.queueService.addJob(
    'email-queue',
    'send-welcome-email',
    {
      type: 'welcome',
      email: user.email,
      data: { userName: user.firstName },
    },
    {
      priority: 1, // High priority
      attempts: 3, // Retry up to 3 times
    }
  );

  return user;
}
```

### 3. Delayed Job (Schedule for Future)

```typescript
// Send reminder 24 hours after user registers
await this.queueService.addJob(
  'notification-queue',
  'send-reminder',
  {
    userId: user.id,
    message: 'Complete your profile!',
  },
  {
    delay: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  }
);
```

### 4. Bulk Jobs

```typescript
// Send application status updates to multiple applicants
const jobs = applications.map(app => ({
  name: 'send-status-update',
  data: {
    email: app.jobSeeker.user.email,
    jobTitle: app.job.title,
    status: app.status,
  },
}));

await this.queueService.addBulkJobs('email-queue', jobs);
```

### 5. Queue Statistics

```typescript
// Monitor queue health
const stats = await this.queueService.getQueueStats('email-queue');

console.log(stats);
// {
//   waiting: 10,    // Jobs waiting to be processed
//   active: 2,      // Jobs currently being processed
//   completed: 1500, // Successfully completed jobs
//   failed: 5,      // Failed jobs
//   delayed: 3      // Jobs scheduled for future
// }
```

### 6. Queue Management

```typescript
// Pause queue (stop processing)
await this.queueService.pauseQueue('email-queue');

// Resume queue
await this.queueService.resumeQueue('email-queue');

// Clean old completed jobs (older than 1 hour)
await this.queueService.cleanQueue('email-queue', 'completed', 3600000);

// Remove all waiting jobs
await this.queueService.drainQueue('email-queue');

// Remove everything (use with caution!)
await this.queueService.obliterateQueue('test-queue');
```

### 7. Job Priority

```typescript
// High priority (processes first)
await this.queueService.addJob('queue', 'urgent-task', data, {
  priority: 10,
});

// Low priority (processes last)
await this.queueService.addJob('queue', 'background-task', data, {
  priority: 1,
});
```

---

## 🎯 Use Cases

### Email Queue
- ✅ Send welcome emails asynchronously
- ✅ Send verification emails
- ✅ Send password reset emails
- ✅ Send application notifications
- ✅ Batch email campaigns

### File Processing Queue
- ✅ Virus scan uploaded files
- ✅ Generate PDF reports
- ✅ Compress images
- ✅ Convert file formats

### Notification Queue
- ✅ Send push notifications
- ✅ Send SMS messages
- ✅ Schedule reminders
- ✅ Job expiry notifications

### Data Processing Queue
- ✅ Import/export CSV files
- ✅ Generate analytics reports
- ✅ Clean up expired data
- ✅ Sync with external APIs

---

## 🔄 Job Lifecycle

```
1. Job Added → waiting
2. Worker picks up → active
3. Processing...
   → Success → completed
   → Error → failed → retry → active (or failed after max attempts)
4. Cleanup (auto-removed based on retention settings)
```

---

## ⚙️ Advanced Configuration

### Custom Retry Strategy

```typescript
await this.queueService.addJob(
  'queue-name',
  'job-name',
  data,
  {
    attempts: 5,
    backoff: {
      type: 'exponential', // or 'fixed'
      delay: 2000, // 2 seconds, doubles each retry
    },
  }
);

// Retry delays: 2s, 4s, 8s, 16s, 32s
```

### Job Retention

The service is pre-configured to:
- Keep last 100 completed jobs
- Keep last 500 failed jobs
- Auto-remove older jobs

---

## 📊 Monitoring

### View Queue Status

```typescript
@Get('queues/status')
async getQueueStatus() {
  const emailStats = await this.queueService.getQueueStats('email-queue');
  const notificationStats = await this.queueService.getQueueStats('notification-queue');

  return {
    email: emailStats,
    notification: notificationStats,
  };
}
```

### Get Specific Job

```typescript
const job = await this.queueService.getJob('email-queue', jobId);
console.log(job.progress); // Job progress
console.log(job.returnvalue); // Job result
```

---

## 🚀 Production Best Practices

1. **Use Separate Queues**
   - Email queue (high priority)
   - File processing queue (lower priority)
   - Analytics queue (low priority)

2. **Set Appropriate Concurrency**
   - Email: 5-10 concurrent jobs
   - File processing: 2-3 (CPU intensive)
   - API calls: 5-20 (depends on rate limits)

3. **Monitor Queue Health**
   - Check queue lengths regularly
   - Alert on high failure rates
   - Clean old jobs periodically

4. **Handle Failures Gracefully**
   - Log failures for debugging
   - Implement dead letter queue for critical jobs
   - Alert on repeated failures

---

## 📦 Dependencies

```json
{
  "bullmq": "^5.x",
  "redis": "^4.x"
}
```

---

## ✨ Key Features

1. **Reliability** - Redis-backed persistence
2. **Scalability** - Multiple workers, multiple queues
3. **Retry Logic** - Exponential backoff
4. **Monitoring** - Queue statistics and job tracking
5. **Flexibility** - Priority, delays, bulk operations
6. **Error Handling** - Automatic retries with logging
7. **Type-Safe** - Full TypeScript support

---

## 🧪 Build Status

```bash
npm run build
```
✅ **Status**: PASSING

---

**Status**: ✅ QUEUE SERVICE COMPLETE
**Build**: ✅ PASSING  
**Date**: July 6, 2026
**Files Created**: 2 (service, module)
**Lines of Code**: ~350+
