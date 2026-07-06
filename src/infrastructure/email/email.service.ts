import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as sgMail from '@sendgrid/mail';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly emailProvider: 'sendgrid' | 'nodemailer';
  private readonly templatesPath: string;

  constructor(private readonly configService: ConfigService) {
    this.templatesPath = path.join(__dirname, 'templates');
    this.emailProvider = this.configService.get('EMAIL_PROVIDER', 'nodemailer') as 'sendgrid' | 'nodemailer';

    this.initializeEmailProvider();
  }

  /**
   * Initialize email provider (SendGrid or Nodemailer)
   */
  private initializeEmailProvider() {
    if (this.emailProvider === 'sendgrid') {
      const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
      if (apiKey) {
        sgMail.setApiKey(apiKey);
        this.logger.log('✅ SendGrid email service initialized');
      } else {
        this.logger.warn('⚠️ SendGrid API key not found, falling back to Nodemailer');
        this.initializeNodemailer();
      }
    } else {
      this.initializeNodemailer();
    }
  }

  /**
   * Initialize Nodemailer transporter
   */
  private initializeNodemailer() {
    const smtpConfig = {
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    };

    this.transporter = nodemailer.createTransport(smtpConfig);
    this.logger.log('✅ Nodemailer email service initialized');
  }

  /**
   * Send email using configured provider
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      let html = options.html;
      let text = options.text;

      // Compile template if provided
      if (options.template) {
        const compiled = await this.compileTemplate(options.template, options.context || {});
        html = compiled.html;
        text = compiled.text;
      }

      if (this.emailProvider === 'sendgrid' && sgMail) {
        await this.sendWithSendGrid(options, html, text);
      } else {
        await this.sendWithNodemailer(options, html, text);
      }

      this.logger.log(`📧 Email sent successfully to: ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send email using SendGrid
   */
  private async sendWithSendGrid(options: EmailOptions, html?: string, text?: string) {
    const msg = {
      to: options.to,
      from: {
        email: this.configService.get<string>('EMAIL_FROM'),
        name: this.configService.get<string>('EMAIL_FROM_NAME', 'Job Board'),
      },
      subject: options.subject,
      text: text || '',
      html: html || '',
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content as string,
        type: 'application/octet-stream',
        disposition: 'attachment',
      })),
    };

    await sgMail.send(msg);
  }

  /**
   * Send email using Nodemailer
   */
  private async sendWithNodemailer(options: EmailOptions, html?: string, text?: string) {
    const mailOptions = {
      from: `"${this.configService.get<string>('EMAIL_FROM_NAME', 'Job Board')}" <${this.configService.get<string>('EMAIL_FROM')}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: text || '',
      html: html || '',
      attachments: options.attachments,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Compile email template with Handlebars
   */
  private async compileTemplate(
    templateName: string,
    context: Record<string, any>,
  ): Promise<{ html: string; text: string }> {
    const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Email template not found: ${templateName}`);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateSource);

    // Add common variables
    const templateContext = {
      ...context,
      appName: this.configService.get<string>('APP_NAME', 'Job Board'),
      appUrl: this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001'),
      currentYear: new Date().getFullYear(),
    };

    const html = template(templateContext);
    const text = this.stripHtml(html);

    return { html, text };
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, '')
      .replace(/<script[^>]*>.*<\/script>/gm, '')
      .replace(/<[^>]+>/gm, '')
      .replace(/\s\s+/g, ' ')
      .trim();
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Welcome to Job Board!',
      template: 'welcome',
      context: {
        userName,
      },
    });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(to: string, userName: string, verificationToken: string): Promise<boolean> {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${verificationToken}`;

    return this.sendEmail({
      to,
      subject: 'Verify Your Email Address',
      template: 'email-verification',
      context: {
        userName,
        verificationUrl,
      },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, userName: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to,
      subject: 'Reset Your Password',
      template: 'password-reset',
      context: {
        userName,
        resetUrl,
        expiryTime: '1 hour',
      },
    });
  }

  /**
   * Send application received email to employer
   */
  async sendApplicationReceivedEmail(
    to: string,
    employerName: string,
    jobTitle: string,
    applicantName: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `New Application for ${jobTitle}`,
      template: 'application-received',
      context: {
        employerName,
        jobTitle,
        applicantName,
      },
    });
  }

  /**
   * Send application status update to job seeker
   */
  async sendApplicationStatusEmail(
    to: string,
    applicantName: string,
    jobTitle: string,
    status: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Application Status Update: ${jobTitle}`,
      template: 'application-status',
      context: {
        applicantName,
        jobTitle,
        status,
      },
    });
  }

  /**
   * Send job expiring soon reminder to employer
   */
  async sendJobExpiringEmail(to: string, employerName: string, jobTitle: string, daysLeft: number): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Job Posting Expiring Soon: ${jobTitle}`,
      template: 'job-expiring',
      context: {
        employerName,
        jobTitle,
        daysLeft,
      },
    });
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.sendEmail({
        to: this.configService.get<string>('EMAIL_FROM'),
        subject: 'Email Configuration Test',
        html: '<h1>Email Service is Working!</h1><p>Your email configuration is set up correctly.</p>',
      });
      return true;
    } catch (error) {
      this.logger.error('Email configuration test failed', error);
      return false;
    }
  }
}
