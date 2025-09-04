# Gmail Email API

A simple NestJS backend API for fetching emails from Gmail using OAuth2 authentication with session-based token storage.

## Features

### Gmail Integration
- OAuth2 authentication with session storage
- List messages with pagination (up to 500 messages)
- Get individual message details
- Simplified email format for easy consumption
- Comprehensive error handling
- Swagger API documentation

### Outlook Integration
- Placeholder implementation (not yet implemented)

## Prerequisites

- Node.js (v16 or higher)
- Yarn or npm
- Gmail API credentials (OAuth2)

## Quick Start

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Add authorized redirect URI: `http://localhost:3000/gmail/auth/callback`
5. Copy the Client ID and Client Secret

### 3. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your Gmail credentials:

```env
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/gmail/auth/callback
```

### 4. Run the Application

```bash
# Development
yarn start:dev

# Production
yarn build
yarn start:prod
```

The API will be available at `http://localhost:3000`

## API Documentation

Interactive Swagger documentation: `http://localhost:3000/api`

## Authentication Flow

### Simple 3-Step Process

1. **Get Auth URL**: `GET /gmail/auth/url`
2. **Authorize**: Open the returned URL in browser and grant permissions
3. **Use API**: Tokens are automatically stored in session - start using `/gmail/messages`

## API Endpoints

### Authentication
- `GET /gmail/auth/url` - Get Gmail OAuth2 authorization URL
- `GET /gmail/auth/status` - Check current authentication status

### Messages
- `GET /gmail/messages?maxResults=10` - List messages (default: 10, max: 500)
- `GET /gmail/messages/:id` - Get specific message details

## Response Format

All messages return in simplified format:

```json
{
  "id": "message-id",
  "threadId": "thread-id", 
  "snippet": "Email preview...",
  "from": "sender@example.com",
  "to": "recipient@example.com",
  "subject": "Email subject",
  "date": "Wed, 04 Sep 2024 10:30:00 +0000",
  "body": "Email content in plain text"
}
```

## Error Handling

- `401 Unauthorized` - Authentication required
- `404 Not Found` - Message not found
- `400 Bad Request` - Invalid request parameters
- `500 Internal Server Error` - Server errors

## Security Features

- Session-based token storage
- HTTPS-only cookies in production
- HttpOnly cookies to prevent XSS
- Input validation and sanitization
- Rate limiting for message fetching

## Project Structure

```
src/
├── email/
│   ├── providers/
│   │   ├── gmail.provider.ts    # Gmail API integration
│   │   └── outlook.provider.ts  # Placeholder for Outlook
│   ├── email.controller.ts      # API endpoints
│   ├── email.service.ts         # Business logic
│   └── email.module.ts          # Module configuration
├── common/
│   ├── dto/                     # Data Transfer Objects
│   └── interfaces/              # TypeScript interfaces
├── app.module.ts                # App configuration
└── main.ts                      # Application entry point
```

## Development

```bash
# Watch mode
yarn start:dev

# Run tests
yarn test

# Build for production
yarn build
```

## License

MIT