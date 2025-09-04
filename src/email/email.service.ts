import { Injectable, Logger } from '@nestjs/common';
import { GmailProvider } from './providers/gmail.provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly gmailProvider: GmailProvider) {}

  async getGmailAuthUrl(): Promise<{ authUrl: string }> {
    this.logger.log('Generating Gmail authorization URL');
    const authUrl = await this.gmailProvider.getAuthUrl();
    return { authUrl };
  }

  async authorizeGmail(code: string): Promise<any> {
    this.logger.log('Exchanging authorization code for Gmail tokens');
    return this.gmailProvider.getTokenFromCode(code);
  }

  async getGmailMessages(tokens: any, maxResults = 10): Promise<any[]> {
    this.logger.log(`Fetching ${maxResults} Gmail messages`);
    return this.gmailProvider.listMessages(tokens, maxResults);
  }

  async getGmailMessage(tokens: any, id: string): Promise<any> {
    this.logger.log(`Fetching Gmail message with ID: ${id}`);
    return this.gmailProvider.getMessage(tokens, id);
  }
}