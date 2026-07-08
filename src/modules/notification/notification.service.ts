import { Injectable } from '@nestjs/common';
import { EmailService } from '../../infrastructure/email/email.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { LoggerService } from '../../core/logger/logger.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly emailService: EmailService,
    private readonly queueService: QueueService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Send test email
   */
  async sendTestEmail(to: string) {
    await this.emailService.sendEmail({
      to,
      subject: 'Test Email from Job Board API',
      template: 'test-email',
      context: {
        message: 'This is a test email to verify email configuration.',
      },
    });

    this.logger.log(`Test email sent to ${to}`, 'NotificationService');

    return { message: 'Test email sent successfully' };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const jobNotificationsStats = await this.queueService.getQueueStats('job-notifications');
    const applicationNotificationsStats = await this.queueService.getQueueStats(
      'application-notifications',
    );

    return {
      queues: {
        'job-notifications': jobNotificationsStats,
        'application-notifications': applicationNotificationsStats,
      },
    };
  }

  /**
   * Get failed jobs from queue
   */
  async getFailedJobs(queueName: string) {
    // Note: This would need to be implemented in QueueService
    // For now, return empty array
    return {
      queueName,
      failedJobs: [],
      message: 'Failed jobs retrieval not yet implemented',
    };
  }

  /**
   * Retry failed job
   */
  async retryFailedJob(queueName: string, jobId: string) {
    // Note: This would need to be implemented in QueueService
    this.logger.log(`Retry requested for job ${jobId} in queue ${queueName}`, 'NotificationService');
    return { message: 'Job retry feature not yet implemented' };
  }

  /**
   * Clear queue
   */
  async clearQueue(queueName: string) {
    await this.queueService.cleanQueue(queueName, 'completed');
    await this.queueService.cleanQueue(queueName, 'failed');
    this.logger.log(`Queue ${queueName} cleaned`, 'NotificationService');
    return { message: `Queue ${queueName} cleaned successfully` };
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(to: string, firstName: string) {
    await this.emailService.sendEmail({
      to,
      subject: 'Welcome to Job Board!',
      template: 'welcome',
      context: {
        firstName,
      },
    });

    this.logger.log(`Welcome email sent to ${to}`, 'NotificationService');
  }

  /**
   * Send custom notification
   */
  async sendCustomNotification(data: {
    to: string;
    subject: string;
    message: string;
  }) {
    await this.emailService.sendEmail({
      to: data.to,
      subject: data.subject,
      template: 'custom-notification',
      context: {
        message: data.message,
      },
    });

    this.logger.log(`Custom notification sent to ${data.to}`, 'NotificationService');

    return { message: 'Notification sent successfully' };
  }
}
