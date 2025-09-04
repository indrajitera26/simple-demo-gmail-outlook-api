import { Injectable, Logger, NotImplementedException } from '@nestjs/common';

@Injectable()
export class OutlookProvider {
  private readonly logger = new Logger(OutlookProvider.name);

  constructor() {
    this.logger.warn('OutlookProvider is not yet implemented. Use GmailProvider instead.');
  }

  async getAuthUrl(): Promise<string> {
    throw new NotImplementedException('Outlook integration not yet implemented');
  }

  async getTokenFromCode(code: string): Promise<any> {
    throw new NotImplementedException('Outlook integration not yet implemented');
  }

  async listMessages(tokens: any, maxResults = 10): Promise<any[]> {
    throw new NotImplementedException('Outlook integration not yet implemented');
  }

  async getMessage(tokens: any, id: string): Promise<any> {
    throw new NotImplementedException('Outlook integration not yet implemented');
  }
}