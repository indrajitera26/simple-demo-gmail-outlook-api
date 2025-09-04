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

@ApiTags('Gmail')
@Controller('gmail')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('auth/url')
  @ApiOperation({ summary: 'Get Gmail OAuth2 authorization URL' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the Gmail authorization URL',
    schema: {
      properties: {
        authUrl: { type: 'string', description: 'Google OAuth2 authorization URL' }
      }
    }
  })
  async getAuthUrl(): Promise<{ authUrl: string }> {
    return this.emailService.getGmailAuthUrl();
  }

  @Get('auth/callback')
  @ApiExcludeEndpoint()
  async handleCallback(
    @Query('code') code: string, 
    @Session() session: Record<string, any>
  ): Promise<{ message: string; hasTokens: boolean }> {
    const tokens = await this.emailService.authorizeGmail(code);
    session.gmailTokens = tokens;
    
    return {
      message: 'Authentication successful! Tokens stored in session.',
      hasTokens: true,
    };
  }

  @Get('auth/status')
  @ApiOperation({ summary: 'Check Gmail authentication status' })
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
      authenticated: !!session.gmailTokens,
      message: session.gmailTokens ? 'Authenticated with Gmail' : 'Not authenticated',
    };
  }

  @Get('messages')
  @ApiOperation({ summary: 'List Gmail messages' })
  @ApiQuery({ 
    name: 'maxResults', 
    required: false, 
    description: 'Maximum number of messages to return (default: 10, max: 500)',
    type: Number
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns list of Gmail messages',
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
    
    return this.emailService.getGmailMessages(session.gmailTokens, limitedResults);
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Get a specific Gmail message by ID' })
  @ApiParam({ 
    name: 'id', 
    description: 'Gmail message ID',
    type: String 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the Gmail message details',
    type: EmailResponseDto
  })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getMessage(
    @Param('id') id: string,
    @Session() session: Record<string, any>
  ): Promise<EmailResponseDto> {
    this.validateAuthentication(session);
    
    return this.emailService.getGmailMessage(session.gmailTokens, id);
  }

  private validateAuthentication(session: Record<string, any>): void {
    if (!session.gmailTokens) {
      throw new UnauthorizedException('Gmail authentication required. Please authenticate first by visiting /gmail/auth/url');
    }
  }
}