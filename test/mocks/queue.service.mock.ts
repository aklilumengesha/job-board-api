import { Injectable } from '@nestjs/common';

/**
 * Mock Queue Service for Testing
 * Provides synchronous job processing without Redis/BullMQ dependency
 */
@Injectable()
export class QueueServiceMock {
  private jobs: Map<string, any[]> = new Map();

  async onModuleInit() {
    // No Redis connection needed
  }

  async onModuleDestroy() {
    this.jobs.clear();
  }

  async addJob(queueName: string, jobName: string, data: any, options?: any): Promise<any> {
    const job = {
      id: Date.now().toString(),
      name: jobName,
      data,
      options,
      timestamp: new Date(),
    };

    if (!this.jobs.has(queueName)) {
      this.jobs.set(queueName, []);
    }

    this.jobs.get(queueName)!.push(job);
    return job;
  }

  async getJob(queueName: string, jobId: string): Promise<any | null> {
    const queueJobs = this.jobs.get(queueName) || [];
    return queueJobs.find(job => job.id === jobId) || null;
  }

  async removeJob(queueName: string, jobId: string): Promise<void> {
    const queueJobs = this.jobs.get(queueName) || [];
    const index = queueJobs.findIndex(job => job.id === jobId);
    if (index > -1) {
      queueJobs.splice(index, 1);
    }
  }

  async getJobs(queueName: string, status?: string): Promise<any[]> {
    return this.jobs.get(queueName) || [];
  }

  async getJobCounts(queueName: string): Promise<any> {
    const queueJobs = this.jobs.get(queueName) || [];
    return {
      waiting: queueJobs.length,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }

  async pauseQueue(queueName: string): Promise<void> {
    // Mock implementation
  }

  async resumeQueue(queueName: string): Promise<void> {
    // Mock implementation
  }

  async cleanQueue(queueName: string, grace?: number, status?: string): Promise<void> {
    if (status === 'completed' || status === 'failed') {
      this.jobs.set(queueName, []);
    }
  }

  async getQueueStatus(queueName: string): Promise<any> {
    const queueJobs = this.jobs.get(queueName) || [];
    return {
      name: queueName,
      isPaused: false,
      jobCounts: await this.getJobCounts(queueName),
    };
  }

  async getAllQueues(): Promise<string[]> {
    return Array.from(this.jobs.keys());
  }

  registerProcessor(queueName: string, processor: any): void {
    // Mock implementation - in tests, we don't actually process jobs
  }

  async addBulk(queueName: string, jobs: any[]): Promise<any[]> {
    const addedJobs = [];
    for (const job of jobs) {
      const addedJob = await this.addJob(queueName, job.name, job.data, job.opts);
      addedJobs.push(addedJob);
    }
    return addedJobs;
  }

  async getQueueStats(queueName: string): Promise<any> {
    return {
      name: queueName,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }

  async getAllQueuesStats(): Promise<any[]> {
    const queueNames = Array.from(this.jobs.keys());
    const stats = [];
    for (const name of queueNames) {
      stats.push(await this.getQueueStats(name));
    }
    return stats;
  }
}
