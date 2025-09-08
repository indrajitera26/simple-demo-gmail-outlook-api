import { 
  Injectable, 
  Logger, 
  InternalServerErrorException, 
  BadRequestException, 
  NotFoundException 
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

interface TokenSet {
  accessToken: string;
  account: any;
  expiresOn: Date;
}

interface ProcessedMessage {
  messages: any[];
  updatedTokens?: TokenSet;
}

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
      throw new InternalServerErrorException('Outlook OAuth2 credentials not configured');
    }

    const useCommonAuth = this.configService.get<string>('OUTLOOK_USE_COMMON', 'true') === 'true';
    const authority = useCommonAuth 
      ? 'https://login.microsoftonline.com/common'
      : `https://login.microsoftonline.com/${tenantId}`;

    this.msalClient = new ConfidentialClientApplication({
      auth: { clientId, authority, clientSecret },
    });
  }

  async getAuthUrl(): Promise<string> {
    try {
      const authCodeUrlParameters = {
        scopes: [
          'https://graph.microsoft.com/Mail.Read',
          'https://graph.microsoft.com/User.Read',
          'offline_access'
        ],
        redirectUri: this.redirectUri,
        prompt: 'login',
        domainHint: 'organizations',
      };

      return await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate authentication URL');
    }
  }

  async getTokenFromCode(code: string): Promise<TokenSet> {
    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    try {
      const tokenRequest = {
        code,
        scopes: [
          'https://graph.microsoft.com/Mail.Read',
          'https://graph.microsoft.com/User.Read',
          'offline_access'
        ],
        redirectUri: this.redirectUri,
      };

      const response = await this.msalClient.acquireTokenByCode(tokenRequest);
      
      return {
        accessToken: response.accessToken,
        account: response.account,
        expiresOn: response.expiresOn,
      };
    } catch (error: any) {
      throw new BadRequestException('Invalid or expired authorization code');
    }
  }

  async refreshTokens(tokens: TokenSet): Promise<TokenSet> {
    if (!tokens?.account) {
      throw new BadRequestException('Account information is required for token refresh');
    }

    try {
      const silentRequest = {
        scopes: [
          'https://graph.microsoft.com/Mail.Read',
          'https://graph.microsoft.com/User.Read',
          'offline_access'
        ],
        account: tokens.account,
        forceRefresh: true,
      };

      const response = await this.msalClient.acquireTokenSilent(silentRequest);
      
      if (response.accessToken === tokens.accessToken) {
        throw new Error('Token refresh returned same token');
      }
      
      return {
        accessToken: response.accessToken,
        account: response.account,
        expiresOn: response.expiresOn,
      };
    } catch (error: any) {
      throw new BadRequestException('Failed to refresh tokens. Please re-authenticate.');
    }
  }

  async listMessages(tokens: TokenSet, maxResults = 10): Promise<ProcessedMessage> {
    if (!tokens?.accessToken) {
      throw new BadRequestException('Access token is required');
    }

    if (this.isTokenExpired(tokens)) {
      const updatedTokens = await this.refreshTokens(tokens);
      return this.fetchMessages(updatedTokens, maxResults, updatedTokens);
    }

    return this.fetchMessages(tokens, maxResults);
  }

  async getMessage(tokens: TokenSet, id: string): Promise<any> {
    if (!tokens?.accessToken) {
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

      return await this.processMessage(message, tokens);
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new NotFoundException(`Message with ID ${id} not found`);
      }
      
      if (error.statusCode === 401) {
        throw new BadRequestException('Invalid or expired tokens. Please re-authenticate.');
      }
      
      throw new InternalServerErrorException('Failed to fetch message from Outlook');
    }
  }

  async getAttachment(tokens: TokenSet, messageId: string, attachmentId: string): Promise<any> {
    if (!tokens?.accessToken) {
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

      return { ...attachment, content: attachmentContent };
    } catch (error: any) {
      throw new InternalServerErrorException('Failed to fetch attachment from Outlook');
    }
  }

  async searchMessages(tokens: TokenSet, query: string, maxResults = 10): Promise<any[]> {
    if (!tokens?.accessToken) {
      throw new BadRequestException('Access token is required');
    }

    try {
      // Create Graph client
      const client = this.createGraphClient(tokens.accessToken);
      
      const response = await client
        .api('/me/messages')
        .filter(query)
        .top(maxResults)
        .select('id,subject,from,receivedDateTime,bodyPreview,hasAttachments,attachments')
        .expand('attachments($select=id,name,contentType,size,isInline)')
        .orderby('receivedDateTime desc')
        .get();

      if (!response.value) {
        return [];
      }

      return Promise.all(response.value.map((msg: any) => this.processMessage(msg, tokens)));
    } catch (error: any) {
      throw new InternalServerErrorException('Failed to search messages in Outlook');
    }
  }

  private async fetchMessages(tokens: TokenSet, maxResults: number, updatedTokens?: TokenSet): Promise<ProcessedMessage> {
    try {
      const client = this.createGraphClient(tokens.accessToken);
      
      const response = await client
        .api('/me/messages')
        .top(maxResults)
        .select('id,subject,from,receivedDateTime,bodyPreview,hasAttachments,attachments')
        .expand('attachments($select=id,name,contentType,size,isInline)')
        .orderby('receivedDateTime desc')
        .get();

      if (!response.value) {
        return { messages: [], updatedTokens };
      }

      const messages = await Promise.all(
        response.value.map((msg: any) => this.processMessage(msg, tokens))
      );

      return { messages, updatedTokens };
    } catch (error: any) {
      if (error.statusCode === 401 && !updatedTokens) {
        const refreshedTokens = await this.refreshTokens(tokens);
        return this.fetchMessages(refreshedTokens, maxResults, refreshedTokens);
      }
      
      throw new InternalServerErrorException('Failed to fetch messages from Outlook');
    }
  }

  private createGraphClient(accessToken: string): Client {
    return Client.init({
      defaultVersion: 'v1.0',
      debugLogging: false,
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  private isTokenExpired(tokens: TokenSet): boolean {
    const now = new Date();
    const expiresOn = new Date(tokens.expiresOn);
    return expiresOn <= now;
  }

  private async processMessage(message: any, tokens: TokenSet): Promise<any> {
    const attachments = [];
    
    if (message.attachments) {
      for (const att of message.attachments) {
        const processedAttachment = await this.processAttachment({
          id: att.id,
          name: att.name,
          contentType: att.contentType,
          size: att.size,
          isInline: att.isInline,
        }, tokens, message.id);
        attachments.push(processedAttachment);
      }
    }

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
      attachments: attachments,
    };
  }

  private async processAttachment(attachment: any, tokens: TokenSet, messageId: string): Promise<any> {
    if (this.isIcsAttachment(attachment)) {
      const icsContent = await this.getAttachmentContent(tokens, messageId, attachment.id);
      
      return {
        ...attachment,
        isCalendarEvent: true,
        contentType: 'text/calendar',
        icsContent: icsContent,
        parsedEvent: icsContent ? this.parseIcsContent(icsContent) : null,
      };
    }
    return attachment;
  }

  private isIcsAttachment(attachment: any): boolean {
    return (
      attachment.contentType === 'text/calendar' ||
      attachment.contentType === 'application/ics' ||
      attachment.name?.toLowerCase().endsWith('.ics') ||
      attachment.name?.toLowerCase().includes('calendar')
    );
  }

  private async getAttachmentContent(tokens: TokenSet, messageId: string, attachmentId: string): Promise<string> {
    try {
      const client = this.createGraphClient(tokens.accessToken);
      
      const response = await client
        .api(`/me/messages/${messageId}/attachments/${attachmentId}`)
        .get();
        
      if (response.contentBytes) {
        return Buffer.from(response.contentBytes, 'base64').toString('utf-8');
      }
      
      return '';
    } catch (error) {
      return '';
    }
  }

  private parseIcsContent(icsContent: string): any {
    try {
      const lines = icsContent.split(/\r?\n/);
      const event: any = {};
      
      for (const line of lines) {
        if (line.startsWith('SUMMARY:')) {
          event.title = line.replace('SUMMARY:', '').trim();
        } else if (line.startsWith('DTSTART:')) {
          event.startDate = line.replace('DTSTART:', '').trim();
        } else if (line.startsWith('DTEND:')) {
          event.endDate = line.replace('DTEND:', '').trim();
        } else if (line.startsWith('LOCATION:')) {
          event.location = line.replace('LOCATION:', '').trim();
        } else if (line.startsWith('DESCRIPTION:')) {
          event.description = line.replace('DESCRIPTION:', '').trim();
        } else if (line.startsWith('ORGANIZER:')) {
          event.organizer = line.replace('ORGANIZER:', '').replace('mailto:', '').trim();
        }
      }
      
      return event;
    } catch (error) {
      return null;
    }
  }
}