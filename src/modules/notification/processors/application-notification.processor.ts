import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../../../infrastructure/email/email.service';

export class ApplicationNotificationProcessor {
  private readonly logger = new Logger(ApplicationNotificationProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job: ${job.name} with ID: ${job.id}`);

    try {
      switch (job.name) {
        case 'new-application':
          await this.handleNewApplication(job.data);
          break;
        case 'status-updated':
          await this.handleStatusUpdated(job.data);
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
   * Notify employer of new application
   */
  private async handleNewApplication(data: {
    applicationId: string;
    jobId: string;
    jobTitle: string;
    applicantName: string;
    employerEmail: string;
  }) {
    this.logger.log(`Sending new application notification to ${data.employerEmail}`);

    try {
      await this.emailService.sendEmail({
        to: data.employerEmail,
        subject: `New Application for ${data.jobTitle}`,
        template: 'new-application',
        context: {
          jobTitle: data.jobTitle,
          applicantName: data.applicantName,
          applicationId: data.applicationId,
        },
      });

      this.logger.log(`New application email sent successfully to ${data.employerEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send new application email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notify job seeker of application status change
   */
  private async handleStatusUpdated(data: {
    applicationId: string;
    jobTitle: string;
    status: string;
    applicantEmail: string;
  }) {
    this.logger.log(`Sending status update notification to ${data.applicantEmail}`);

    try {
      await this.emailService.sendEmail({
        to: data.applicantEmail,
        subject: `Application Status Updated: ${data.jobTitle}`,
        template: 'application-status-updated',
        context: {
          jobTitle: data.jobTitle,
          status: data.status,
          applicationId: data.applicationId,
        },
      });

      this.logger.log(`Status update email sent successfully to ${data.applicantEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send status update email: ${error.message}`);
      throw error;
    }
  }
}
