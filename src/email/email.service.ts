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

  async getGmailAuthUrl(): Promise<{ authUrl: string }> {
    const authUrl = await this.gmailProvider.getAuthUrl();
    return { authUrl };
  }

  async authorizeGmail(code: string): Promise<any> {
    return this.gmailProvider.getTokenFromCode(code);
  }

  async getGmailMessages(tokens: any, maxResults = 10): Promise<any[]> {
    return this.gmailProvider.listMessages(tokens, maxResults);
  }

  async getGmailMessage(tokens: any, id: string): Promise<any> {
    return this.gmailProvider.getMessage(tokens, id);
  }

  async getOutlookAuthUrl(): Promise<{ authUrl: string }> {
    const authUrl = await this.outlookProvider.getAuthUrl();
    return { authUrl };
  }

  async authorizeOutlook(code: string): Promise<any> {
    return this.outlookProvider.getTokenFromCode(code);
  }

  async getOutlookMessages(tokens: any, maxResults = 10): Promise<{ messages: any[], updatedTokens?: any }> {
    return this.outlookProvider.listMessages(tokens, maxResults);
  }

  async getOutlookMessage(tokens: any, id: string): Promise<any> {
    return this.outlookProvider.getMessage(tokens, id);
  }

  async getOutlookAttachment(tokens: any, messageId: string, attachmentId: string): Promise<any> {
    return this.outlookProvider.getAttachment(tokens, messageId, attachmentId);
  }

  async searchOutlookMessages(tokens: any, query: string, maxResults = 10): Promise<any[]> {
    return this.outlookProvider.searchMessages(tokens, query, maxResults);
  }
}