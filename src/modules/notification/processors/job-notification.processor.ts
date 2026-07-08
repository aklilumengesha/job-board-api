import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../../../infrastructure/email/email.service';

export class JobNotificationProcessor {
  private readonly logger = new Logger(JobNotificationProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job: ${job.name} with ID: ${job.id}`);

    try {
      switch (job.name) {
        case 'new-job-posted':
          await this.handleNewJobPosted(job.data);
          break;
        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(`Error processing job ${job.id}: ${error.message}`);
      throw error; // BullMQ will retry based on configuration
    }
  }

  /**
   * Handle new job posted notification
   * In a real app, this would notify job seekers who match the criteria
   */
  private async handleNewJobPosted(data: {
    jobId: string;
    jobTitle: string;
    companyName: string;
  }) {
    this.logger.log(`New job posted: ${data.jobTitle} at ${data.companyName}`);

    // In a production app, you would:
    // 1. Find job seekers with matching skills/preferences
    // 2. Send personalized emails to each
    // 3. Respect user notification preferences
    
    // For now, just log it
    this.logger.log(`Job notification processed for job: ${data.jobId}`);
  }
}
