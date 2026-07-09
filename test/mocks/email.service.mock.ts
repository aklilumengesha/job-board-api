import { Injectable } from '@nestjs/common';

/**
 * Mock Email Service for Testing
 * Logs email operations without actually sending emails
 */
@Injectable()
export class EmailServiceMock {
  private sentEmails: any[] = [];

  async sendWelcomeEmail(to: string, userName: string): Promise<void> {
    this.sentEmails.push({
      type: 'welcome',
      to,
      userName,
      timestamp: new Date(),
    });
  }

  async sendVerificationEmail(to: string, userName: string, verificationUrl: string): Promise<void> {
    this.sentEmails.push({
      type: 'verification',
      to,
      userName,
      verificationUrl,
      timestamp: new Date(),
    });
  }

  async sendPasswordResetEmail(to: string, userName: string, resetUrl: string): Promise<void> {
    this.sentEmails.push({
      type: 'password-reset',
      to,
      userName,
      resetUrl,
      timestamp: new Date(),
    });
  }

  async sendApplicationReceivedEmail(
    to: string,
    jobSeekerName: string,
    jobTitle: string,
    companyName: string,
  ): Promise<void> {
    this.sentEmails.push({
      type: 'application-received',
      to,
      jobSeekerName,
      jobTitle,
      companyName,
      timestamp: new Date(),
    });
  }

  async sendApplicationStatusUpdateEmail(
    to: string,
    jobSeekerName: string,
    jobTitle: string,
    companyName: string,
    status: string,
  ): Promise<void> {
    this.sentEmails.push({
      type: 'application-status',
      to,
      jobSeekerName,
      jobTitle,
      companyName,
      status,
      timestamp: new Date(),
    });
  }

  async sendNewJobNotificationEmail(
    to: string,
    employerName: string,
    jobTitle: string,
  ): Promise<void> {
    this.sentEmails.push({
      type: 'new-job',
      to,
      employerName,
      jobTitle,
      timestamp: new Date(),
    });
  }

  async sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
    this.sentEmails.push({
      type: 'generic',
      to,
      subject,
      htmlContent,
      timestamp: new Date(),
    });
  }

  getSentEmails(): any[] {
    return this.sentEmails;
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }
}
