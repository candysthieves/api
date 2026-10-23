import nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../app.config.js';
import type { EmailTemplateType } from './types/email-template.type.js';

@Injectable()
export class EmailAdapter {
  private readonly smtpUser: string;
  private readonly smtpPassword: string;

  constructor(private readonly config: AppConfig) {
    this.smtpUser = this.config.smtpUser;
    this.smtpPassword = this.config.smtpPassword;
  }

  async sendEmail(email: string, message: EmailTemplateType) {
    if (!this.config.emailSendingEnabled) {
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: this.smtpUser, pass: this.smtpPassword },
    });

    await transporter.sendMail({
      from: `Lumos <${this.smtpUser}>`,
      to: email,
      subject: message.subject,
      html: message.html,
    });
  }
}
