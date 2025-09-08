import { 
  Injectable, 
  Logger, 
  InternalServerErrorException, 
  BadRequestException, 
  NotFoundException 
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface TokenSet {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

@Injectable()
export class GmailProvider {
  private readonly logger = new Logger(GmailProvider.name);
  private oauth2Client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.initializeOAuth2Client();
  }

  private initializeOAuth2Client(): void {
    const clientId = this.configService.get<string>('GMAIL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GMAIL_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GMAIL_REDIRECT_URI', 'http://localhost:3000/gmail/auth/callback');

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException('Gmail OAuth2 credentials not configured');
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  async getAuthUrl(): Promise<string> {
    try {
      const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
      return this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate authentication URL');
    }
  }

  async getTokenFromCode(code: string): Promise<TokenSet> {
    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens as TokenSet;
    } catch (error: any) {
      throw new BadRequestException('Invalid or expired authorization code');
    }
  }

  async listMessages(tokens: TokenSet, maxResults = 10): Promise<any[]> {
    if (!tokens) {
      throw new BadRequestException('Tokens are required');
    }

    try {
      const gmail = this.createGmailClient(tokens);
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
      });

      if (!response.data.messages) {
        return [];
      }

      const messages = await Promise.all(
        response.data.messages.map(async (msg) => {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
          });
          return await this.processMessage(fullMessage.data, tokens);
        })
      );

      return messages;
    } catch (error: any) {
      if (error.code === 401) {
        throw new BadRequestException('Invalid or expired tokens. Please re-authenticate.');
      }
      
      throw new InternalServerErrorException('Failed to fetch messages from Gmail');
    }
  }

  async getMessage(tokens: TokenSet, id: string): Promise<any> {
    if (!tokens) {
      throw new BadRequestException('Tokens are required');
    }

    if (!id) {
      throw new BadRequestException('Message ID is required');
    }

    try {
      const gmail = this.createGmailClient(tokens);
      
      const response = await gmail.users.messages.get({
        userId: 'me',
        id,
      });

      return await this.processMessage(response.data, tokens);
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundException(`Message with ID ${id} not found`);
      }
      
      if (error.code === 401) {
        throw new BadRequestException('Invalid or expired tokens. Please re-authenticate.');
      }
      
      throw new InternalServerErrorException('Failed to fetch message from Gmail');
    }
  }

  private createGmailClient(tokens: TokenSet): gmail_v1.Gmail {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(tokens);
    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  private async processMessage(message: gmail_v1.Schema$Message, tokens: TokenSet): Promise<any> {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) => 
      headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const attachments = await this.extractAttachments(message, tokens);

    return {
      id: message.id,
      threadId: message.threadId,
      snippet: message.snippet,
      from: getHeader('from'),
      to: getHeader('to'),
      subject: getHeader('subject'),
      date: getHeader('date'),
      body: this.extractBody(message.payload),
      hasAttachments: attachments.length > 0,
      attachments: attachments,
    };
  }

  private async extractAttachments(message: gmail_v1.Schema$Message, tokens: TokenSet): Promise<any[]> {
    const attachments: any[] = [];
    
    if (message.payload?.parts) {
      for (const part of message.payload.parts) {
        if (part.filename && part.body?.attachmentId) {
          const attachment = {
            id: part.body.attachmentId,
            name: part.filename,
            contentType: part.mimeType || 'application/octet-stream',
            size: part.body.size || 0,
            isInline: false,
          };
          
          const processedAttachment = await this.processAttachment(attachment, tokens, message.id!);
          attachments.push(processedAttachment);
        }
      }
    }
    
    return attachments;
  }

  private async processAttachment(attachment: any, tokens: TokenSet, messageId: string): Promise<any> {
    if (this.isIcsAttachment(attachment)) {
      const icsContent = await this.getGmailAttachmentContent(tokens, messageId, attachment.id);
      
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

  private async getGmailAttachmentContent(tokens: TokenSet, messageId: string, attachmentId: string): Promise<string> {
    try {
      const gmail = this.createGmailClient(tokens);
      
      const response = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId,
      });

      if (response.data.data) {
        return Buffer.from(response.data.data, 'base64').toString('utf-8');
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

  private extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
    if (!payload) return '';

    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
    }

    return '';
  }
}