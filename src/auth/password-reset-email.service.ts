import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class PasswordResetEmailService {
  private readonly logger = new Logger(PasswordResetEmailService.name);
  private readonly transporter?: Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const password = this.configService.get<string>('SMTP_PASSWORD');

    if (host && port && user && password) {
      this.transporter = createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass: password },
      });
    }
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP is not configured');
    }

    const resetPageUrl = this.configService.get<string>('PASSWORD_RESET_URL');
    const from = this.configService.get<string>('SMTP_FROM');

    if (!resetPageUrl || !from) {
      throw new Error('Password reset email configuration is incomplete');
    }

    const resetUrl = new URL(resetPageUrl);
    resetUrl.searchParams.set('token', token);

    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Reset your Growbit password',
      text: [
        'Someone requested a password reset for your Growbit account.',
        '',
        `Reset your password: ${resetUrl.toString()}`,
        '',
        'This link expires in 15 minutes.',
        'If you did not request this, you can ignore this email.',
      ].join('\n'),
    });

    this.logger.log('Password reset email accepted by SMTP provider');
  }

  async sendPasswordChanged(email: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Password changed email was not sent because SMTP is not configured');
      return;
    }

    const from = this.configService.get<string>('SMTP_FROM');
    if (!from) {
      return;
    }

    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Your Growbit password was changed',
      text: [
        'Your Growbit password was changed successfully.',
        '',
        'If you did not make this change, contact support immediately.',
      ].join('\n'),
    });
  }
}
