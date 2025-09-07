import { 
  Controller, 
  Get, 
  Param, 
  Query, 
  Session, 
  UnauthorizedException,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiExcludeEndpoint, 
  ApiResponse,
  ApiQuery,
  ApiParam
} from '@nestjs/swagger';
import { EmailService } from './email.service';
import { EmailResponseDto } from '../common/dto/email.dto';

@ApiTags('Outlook')
@Controller('outlook')
export class OutlookController {
  constructor(private readonly emailService: EmailService) {}

  @Get('auth/url')
  @ApiOperation({ summary: 'Get Outlook OAuth2 authorization URL' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the Outlook authorization URL',
    schema: {
      properties: {
        authUrl: { type: 'string', description: 'Microsoft OAuth2 authorization URL' }
      }
    }
  })
  async getAuthUrl(): Promise<{ authUrl: string }> {
    return this.emailService.getOutlookAuthUrl();
  }

  @Get('auth/callback')
  @ApiExcludeEndpoint()
  async handleCallback(
    @Query('code') code: string, 
    @Session() session: Record<string, any>
  ): Promise<{ message: string; hasTokens: boolean }> {
    const tokens = await this.emailService.authorizeOutlook(code);
    session.outlookTokens = tokens;
    
    return {
      message: 'Authentication successful! Tokens stored in session.',
      hasTokens: true,
    };
  }

  @Get('auth/status')
  @ApiOperation({ summary: 'Check Outlook authentication status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns current authentication status',
    schema: {
      properties: {
        authenticated: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  async getAuthStatus(@Session() session: Record<string, any>): Promise<{ authenticated: boolean; message: string }> {
    return {
      authenticated: !!session.outlookTokens,
      message: session.outlookTokens ? 'Authenticated with Outlook' : 'Not authenticated',
    };
  }

  @Get('messages')
  @ApiOperation({ summary: 'List Outlook messages' })
  @ApiQuery({ 
    name: 'maxResults', 
    required: false, 
    description: 'Maximum number of messages to return (default: 10, max: 500)',
    type: Number
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns list of Outlook messages',
    type: [EmailResponseDto]
  })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async getMessages(
    @Query('maxResults', new DefaultValuePipe(10), new ParseIntPipe({ optional: true })) 
    maxResults: number = 10,
    @Session() session: Record<string, any>
  ): Promise<EmailResponseDto[]> {
    this.validateAuthentication(session);
    
    const limitedResults = Math.min(maxResults, 500);
    
    return this.emailService.getOutlookMessages(session.outlookTokens, limitedResults);
  }

  @Get('messages/search')
  @ApiOperation({ summary: 'Search Outlook messages' })
  @ApiQuery({ 
    name: 'query', 
    required: true, 
    description: 'Search query (e.g., "from:sender@example.com")',
    type: String
  })
  @ApiQuery({ 
    name: 'maxResults', 
    required: false, 
    description: 'Maximum number of messages to return (default: 10)',
    type: Number
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns search results',
    type: [EmailResponseDto]
  })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async searchMessages(
    @Query('query') query: string,
    @Query('maxResults', new DefaultValuePipe(10), new ParseIntPipe({ optional: true })) 
    maxResults: number = 10,
    @Session() session: Record<string, any>
  ): Promise<EmailResponseDto[]> {
    this.validateAuthentication(session);
    
    return this.emailService.searchOutlookMessages(session.outlookTokens, query, maxResults);
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Get a specific Outlook message by ID' })
  @ApiParam({ 
    name: 'id', 
    description: 'Outlook message ID',
    type: String 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the Outlook message details',
    type: EmailResponseDto
  })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getMessage(
    @Param('id') id: string,
    @Session() session: Record<string, any>
  ): Promise<EmailResponseDto> {
    this.validateAuthentication(session);
    
    return this.emailService.getOutlookMessage(session.outlookTokens, id);
  }

  @Get('messages/:messageId/attachments/:attachmentId')
  @ApiOperation({ summary: 'Get Outlook message attachment' })
  @ApiParam({ 
    name: 'messageId', 
    description: 'Message ID',
    type: String 
  })
  @ApiParam({ 
    name: 'attachmentId', 
    description: 'Attachment ID',
    type: String 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns attachment data including content'
  })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async getAttachment(
    @Param('messageId') messageId: string,
    @Param('attachmentId') attachmentId: string,
    @Session() session: Record<string, any>
  ): Promise<any> {
    this.validateAuthentication(session);
    
    return this.emailService.getOutlookAttachment(session.outlookTokens, messageId, attachmentId);
  }

  private validateAuthentication(session: Record<string, any>): void {
    if (!session.outlookTokens) {
      throw new UnauthorizedException('Outlook authentication required. Please authenticate first by visiting /outlook/auth/url');
    }
  }
}