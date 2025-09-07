import { Injectable, Logger } from '@nestjs/common';
import { GmailProvider } from './providers/gmail.provider';
import { OutlookProvider } from './providers/outlook.provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly gmailProvider: GmailProvider,
    private readonly outlookProvider: OutlookProvider,
  ) {}

  // Gmail methods
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

  // Outlook methods
  async getOutlookAuthUrl(): Promise<{ authUrl: string }> {
    this.logger.log('Generating Outlook authorization URL');
    const authUrl = await this.outlookProvider.getAuthUrl();
    return { authUrl };
  }

  async authorizeOutlook(code: string): Promise<any> {
    this.logger.log('Exchanging authorization code for Outlook tokens');
    return this.outlookProvider.getTokenFromCode(code);
  }

  async getOutlookMessages(tokens: any, maxResults = 10): Promise<any[]> {
    this.logger.log(`Fetching ${maxResults} Outlook messages`);
    return this.outlookProvider.listMessages(tokens, maxResults);
  }

  async getOutlookMessage(tokens: any, id: string): Promise<any> {
    this.logger.log(`Fetching Outlook message with ID: ${id}`);
    return this.outlookProvider.getMessage(tokens, id);
  }

  async getOutlookAttachment(tokens: any, messageId: string, attachmentId: string): Promise<any> {
    this.logger.log(`Fetching Outlook attachment: ${attachmentId} from message: ${messageId}`);
    return this.outlookProvider.getAttachment(tokens, messageId, attachmentId);
  }

  async searchOutlookMessages(tokens: any, query: string, maxResults = 10): Promise<any[]> {
    this.logger.log(`Searching Outlook messages with query: ${query}`);
    return this.outlookProvider.searchMessages(tokens, query, maxResults);
  }
}