import { Injectable, Logger, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

@Injectable()
export class OutlookProvider {
  private readonly logger = new Logger(OutlookProvider.name);
  private msalClient: ConfidentialClientApplication;
  private readonly redirectUri: string;

  constructor(private readonly configService: ConfigService) {
    this.initializeMsalClient();
    this.redirectUri = this.configService.get<string>('OUTLOOK_REDIRECT_URI', 'http://localhost:3000/outlook/auth/callback');
  }

  private initializeMsalClient(): void {
    const clientId = this.configService.get<string>('OUTLOOK_CLIENT_ID');
    const clientSecret = this.configService.get<string>('OUTLOOK_CLIENT_SECRET');
    const tenantId = this.configService.get<string>('OUTLOOK_TENANT_ID', 'common');

    if (!clientId || !clientSecret) {
      const message = 'Outlook OAuth2 credentials not configured. Please set OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET in .env file';
      this.logger.error(message);
      throw new InternalServerErrorException(message);
    }

    const msalConfig = {
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientSecret,
      },
    };

    this.msalClient = new ConfidentialClientApplication(msalConfig);
    this.logger.log('Outlook MSAL client initialized successfully');
  }

  async getAuthUrl(): Promise<string> {
    try {
      const authCodeUrlParameters = {
        scopes: ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/User.Read'],
        redirectUri: this.redirectUri,
        prompt: 'consent',
      };

      const authUrl = await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
      return authUrl;
    } catch (error) {
      this.logger.error('Failed to generate auth URL', error);
      throw new InternalServerErrorException('Failed to generate authentication URL');
    }
  }

  async getTokenFromCode(code: string): Promise<any> {
    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    try {
      const tokenRequest = {
        code,
        scopes: ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/User.Read'],
        redirectUri: this.redirectUri,
      };

      const response = await this.msalClient.acquireTokenByCode(tokenRequest);
      this.logger.log('Successfully obtained tokens from authorization code');
      
      return {
        accessToken: response.accessToken,
        account: response.account,
        expiresOn: response.expiresOn,
      };
    } catch (error: any) {
      this.logger.error('Failed to exchange authorization code for tokens', error.message);
      throw new BadRequestException('Invalid or expired authorization code');
    }
  }

  async listMessages(tokens: any, maxResults = 10): Promise<any[]> {
    if (!tokens || !tokens.accessToken) {
      throw new BadRequestException('Access token is required');
    }

    try {
      const client = this.createGraphClient(tokens.accessToken);
      
      const response = await client
        .api('/me/messages')
        .top(maxResults)
        .select('id,subject,from,receivedDateTime,bodyPreview,hasAttachments')
        .orderby('receivedDateTime desc')
        .get();

      if (!response.value) {
        return [];
      }

      const messages = response.value.map((msg: any) => this.simplifyMessage(msg));
      return messages;
    } catch (error: any) {
      this.logger.error('Failed to list messages', error.message);
      
      if (error.statusCode === 401) {
        throw new BadRequestException('Invalid or expired tokens. Please re-authenticate.');
      }
      
      throw new InternalServerErrorException('Failed to fetch messages from Outlook');
    }
  }

  async getMessage(tokens: any, id: string): Promise<any> {
    if (!tokens || !tokens.accessToken) {
      throw new BadRequestException('Access token is required');
    }

    if (!id) {
      throw new BadRequestException('Message ID is required');
    }

    try {
      const client = this.createGraphClient(tokens.accessToken);
      
      const message = await client
        .api(`/me/messages/${id}`)
        .select('id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,bodyPreview,hasAttachments,attachments')
        .expand('attachments')
        .get();

      return this.simplifyMessage(message);
    } catch (error: any) {
      this.logger.error(`Failed to get message ${id}`, error.message);
      
      if (error.statusCode === 404) {
        throw new NotFoundException(`Message with ID ${id} not found`);
      }
      
      if (error.statusCode === 401) {
        throw new BadRequestException('Invalid or expired tokens. Please re-authenticate.');
      }
      
      throw new InternalServerErrorException('Failed to fetch message from Outlook');
    }
  }

  async getAttachment(tokens: any, messageId: string, attachmentId: string): Promise<any> {
    if (!tokens || !tokens.accessToken) {
      throw new BadRequestException('Access token is required');
    }

    try {
      const client = this.createGraphClient(tokens.accessToken);
      
      const attachment = await client
        .api(`/me/messages/${messageId}/attachments/${attachmentId}`)
        .get();

      const attachmentContent = await client
        .api(`/me/messages/${messageId}/attachments/${attachmentId}/$value`)
        .get();

      return {
        ...attachment,
        content: attachmentContent,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get attachment ${attachmentId}`, error.message);
      throw new InternalServerErrorException('Failed to fetch attachment from Outlook');
    }
  }

  async searchMessages(tokens: any, query: string, maxResults = 10): Promise<any[]> {
    if (!tokens || !tokens.accessToken) {
      throw new BadRequestException('Access token is required');
    }

    try {
      const client = this.createGraphClient(tokens.accessToken);
      
      const response = await client
        .api('/me/messages')
        .filter(query)
        .top(maxResults)
        .select('id,subject,from,receivedDateTime,bodyPreview,hasAttachments')
        .orderby('receivedDateTime desc')
        .get();

      if (!response.value) {
        return [];
      }

      const messages = response.value.map((msg: any) => this.simplifyMessage(msg));
      return messages;
    } catch (error: any) {
      this.logger.error('Failed to search messages', error.message);
      throw new InternalServerErrorException('Failed to search messages in Outlook');
    }
  }

  private createGraphClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  private simplifyMessage(message: any): any {
    return {
      id: message.id,
      threadId: message.conversationId,
      snippet: message.bodyPreview || '',
      from: message.from?.emailAddress?.address || '',
      to: message.toRecipients?.map((r: any) => r.emailAddress.address).join(', ') || '',
      subject: message.subject || '',
      date: message.receivedDateTime || message.sentDateTime,
      body: message.body?.content || message.bodyPreview || '',
      hasAttachments: message.hasAttachments || false,
      attachments: message.attachments?.map((att: any) => ({
        id: att.id,
        name: att.name,
        contentType: att.contentType,
        size: att.size,
        isInline: att.isInline,
      })) || [],
    };
  }

  async handleIcsAttachment(attachment: any): Promise<any> {
    if (attachment.contentType === 'text/calendar' || attachment.name?.endsWith('.ics')) {
      this.logger.log('Processing .ics file as calendar event');
      return {
        ...attachment,
        isCalendarEvent: true,
        contentType: 'text/calendar; method=REQUEST',
      };
    }
    return attachment;
  }
}