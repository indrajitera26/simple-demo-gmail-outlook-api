import { Injectable, Logger, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

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
      const message = 'Gmail OAuth2 credentials not configured. Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env file';
      this.logger.error(message);
      throw new InternalServerErrorException(message);
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    this.logger.log('Gmail OAuth2 client initialized successfully');
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
      this.logger.error('Failed to generate auth URL', error);
      throw new InternalServerErrorException('Failed to generate authentication URL');
    }
  }

  async getTokenFromCode(code: string): Promise<any> {
    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.logger.log('Successfully obtained tokens from authorization code');
      return tokens;
    } catch (error: any) {
      this.logger.error('Failed to exchange authorization code for tokens', error.message);
      throw new BadRequestException('Invalid or expired authorization code');
    }
  }

  async listMessages(tokens: any, maxResults = 10): Promise<any[]> {
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
          return this.simplifyMessage(fullMessage.data);
        })
      );

      return messages;
    } catch (error: any) {
      this.logger.error('Failed to list messages', error.message);
      
      if (error.code === 401) {
        throw new BadRequestException('Invalid or expired tokens. Please re-authenticate.');
      }
      
      throw new InternalServerErrorException('Failed to fetch messages from Gmail');
    }
  }

  async getMessage(tokens: any, id: string): Promise<any> {
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

      return this.simplifyMessage(response.data);
    } catch (error: any) {
      this.logger.error(`Failed to get message ${id}`, error.message);
      
      if (error.code === 404) {
        throw new NotFoundException(`Message with ID ${id} not found`);
      }
      
      if (error.code === 401) {
        throw new BadRequestException('Invalid or expired tokens. Please re-authenticate.');
      }
      
      throw new InternalServerErrorException('Failed to fetch message from Gmail');
    }
  }

  private createGmailClient(tokens: any): gmail_v1.Gmail {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(tokens);
    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  private simplifyMessage(message: gmail_v1.Schema$Message) {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) => 
      headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    return {
      id: message.id,
      threadId: message.threadId,
      snippet: message.snippet,
      from: getHeader('from'),
      to: getHeader('to'),
      subject: getHeader('subject'),
      date: getHeader('date'),
      body: this.extractBody(message.payload),
    };
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