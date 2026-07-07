import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { LoggerService } from '../../core/logger/logger.service';

export interface QueueJobData {
  type: string;
  payload: any;
}

export interface QueueOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly queues: Map<string, Queue> = new Map();
  private readonly workers: Map<string, Worker> = new Map();
  private readonly queueEvents: Map<string, QueueEvents> = new Map();
  private readonly connection: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    // Redis connection configuration
    this.connection = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
    };
  }

  async onModuleInit() {
    this.logger.log('Queue Service initialized', 'QueueService');
  }

  async onModuleDestroy() {
    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logger.log(`Queue ${name} closed`, 'QueueService');
    }

    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      this.logger.log(`Worker ${name} closed`, 'QueueService');
    }

    // Close all queue events
    for (const [name, queueEvents] of this.queueEvents) {
      await queueEvents.close();
      this.logger.log(`QueueEvents ${name} closed`, 'QueueService');
    }
  }

  /**
   * Get or create a queue
   */
  getQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      const queue = new Queue(queueName, {
        connection: this.connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 500, // Keep last 500 failed jobs
        },
      });

      this.queues.set(queueName, queue);
      this.logger.log(`Queue created: ${queueName}`, 'QueueService');
    }

    return this.queues.get(queueName);
  }

  /**
   * Add a job to queue
   */
  async addJob(
    queueName: string,
    jobName: string,
    data: any,
    options: QueueOptions = {},
  ): Promise<Job> {
    const queue = this.getQueue(queueName);

    try {
      const job = await queue.add(jobName, data, {
        priority: options.priority,
        delay: options.delay,
        attempts: options.attempts,
        backoff: options.backoff,
      });

      this.logger.log(
        `Job added to queue ${queueName}: ${jobName} (ID: ${job.id})`,
        'QueueService',
      );

      return job;
    } catch (error) {
      this.logger.error(
        `Failed to add job to queue ${queueName}: ${error.message}`,
        error.stack,
        'QueueService',
      );
      throw error;
    }
  }

  /**
   * Add multiple jobs to queue
   */
  async addBulkJobs(
    queueName: string,
    jobs: Array<{ name: string; data: any; opts?: QueueOptions }>,
  ): Promise<Job[]> {
    const queue = this.getQueue(queueName);

    try {
      const bulkJobs = jobs.map(job => ({
        name: job.name,
        data: job.data,
        opts: job.opts || {},
      }));

      const addedJobs = await queue.addBulk(bulkJobs);
      this.logger.log(`${jobs.length} jobs added to queue ${queueName}`, 'QueueService');

      return addedJobs;
    } catch (error) {
      this.logger.error(
        `Failed to add bulk jobs to queue ${queueName}: ${error.message}`,
        error.stack,
        'QueueService',
      );
      throw error;
    }
  }

  /**
   * Register a worker to process jobs
   */
  registerWorker(
    queueName: string,
    processor: (job: Job) => Promise<any>,
    concurrency: number = 1,
  ): Worker {
    if (this.workers.has(queueName)) {
      this.logger.warn(`Worker for queue ${queueName} already exists`, 'QueueService');
      return this.workers.get(queueName);
    }

    const worker = new Worker(queueName, processor, {
      connection: this.connection,
      concurrency,
    });

    // Worker event listeners
    worker.on('completed', (job: Job) => {
      this.logger.log(
        `Job ${job.id} in queue ${queueName} completed successfully`,
        'QueueService',
      );
    });

    worker.on('failed', (job: Job, error: Error) => {
      this.logger.error(
        `Job ${job.id} in queue ${queueName} failed: ${error.message}`,
        error.stack,
        'QueueService',
      );
    });

    worker.on('error', (error: Error) => {
      this.logger.error(
        `Worker error in queue ${queueName}: ${error.message}`,
        error.stack,
        'QueueService',
      );
    });

    this.workers.set(queueName, worker);
    this.logger.log(`Worker registered for queue: ${queueName}`, 'QueueService');

    return worker;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getQueue(queueName);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  /**
   * Get job by ID
   */
  async getJob(queueName: string, jobId: string): Promise<Job | null> {
    const queue = this.getQueue(queueName);
    return queue.getJob(jobId);
  }

  /**
   * Remove job by ID
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (job) {
      await job.remove();
      this.logger.log(`Job ${jobId} removed from queue ${queueName}`, 'QueueService');
    }
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.log(`Queue ${queueName} paused`, 'QueueService');
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`Queue ${queueName} resumed`, 'QueueService');
  }

  /**
   * Clean queue (remove completed/failed jobs)
   */
  async cleanQueue(
    queueName: string,
    status: 'completed' | 'failed',
    grace: number = 0,
  ): Promise<string[]> {
    const queue = this.getQueue(queueName);
    const cleaned = await queue.clean(grace, 1000, status);
    this.logger.log(
      `Cleaned ${cleaned.length} ${status} jobs from queue ${queueName}`,
      'QueueService',
    );
    return cleaned;
  }

  /**
   * Drain queue (remove all waiting jobs)
   */
  async drainQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.drain();
    this.logger.log(`Queue ${queueName} drained`, 'QueueService');
  }

  /**
   * Obliterate queue (remove everything)
   */
  async obliterateQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.obliterate();
    this.logger.warn(`Queue ${queueName} obliterated (all data removed)`, 'QueueService');
  }
}
