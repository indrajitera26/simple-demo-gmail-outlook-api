# Gmail and Outlook Email API

A production-ready NestJS backend API for fetching emails from Gmail and Outlook using OAuth2 authentication with session-based token storage. Built with NestJS best practices, automatic token refresh, and comprehensive ICS calendar file support.

## 🚀 Features

### Gmail Integration ✅
- OAuth2 authentication with automatic session management
- List messages with pagination (up to 500 messages)
- Get individual message details with full metadata
- Automatic ICS calendar file detection and parsing
- Attachment processing with calendar event extraction
- Comprehensive error handling with NestJS exceptions
- Token refresh handling with Google OAuth2

### Outlook Integration ✅  
- Microsoft Graph API OAuth2 authentication (Multi-tenant + Personal accounts)
- List messages with pagination and automatic token refresh
- Get individual message details with full attachment support
- Advanced search with Microsoft Graph query syntax
- ICS calendar file detection, parsing, and event extraction
- Attachment download with content type detection
- Proactive token expiration management
- Support for both organizational and personal Microsoft accounts

## Prerequisites

- Node.js (v16 or higher)
- Yarn or npm
- Gmail API credentials (OAuth2)
- Microsoft Azure App Registration (for Outlook)

## Quick Start

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: Web application
   - Add authorized redirect URI: `http://localhost:3000/gmail/auth/callback`
5. Copy the Client ID and Client Secret

### 3. Configure Outlook API (Multi-tenant + Personal)

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration":
   - **Name**: Your app name (e.g., "Email API")
   - **Supported account types**: "Accounts in any organizational directory and personal Microsoft accounts (e.g. Skype, Xbox)"
   - **Redirect URI**: Web platform - `http://localhost:3000/outlook/auth/callback`
4. After creation, note the **Application (client) ID**
5. Go to "Certificates & secrets":
   - Click "New client secret"
   - Add description and choose expiry (recommend 24 months)
   - **Copy the secret value immediately** (it won't be shown again)
6. Go to "API permissions":
   - Click "Add a permission" > "Microsoft Graph"
   - Select "Delegated permissions"
   - Add: `Mail.Read`, `User.Read`, `offline_access`
   - Click "Grant admin consent" (optional, users can consent individually)
7. **Important**: Set tenant to `common` in your `.env` file for multi-tenant support

### 4. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Gmail Configuration
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/gmail/auth/callback

# Outlook Configuration (Multi-tenant + Personal accounts)
OUTLOOK_CLIENT_ID=your-azure-app-client-id
OUTLOOK_CLIENT_SECRET=your-azure-app-client-secret
OUTLOOK_TENANT_ID=common
OUTLOOK_REDIRECT_URI=http://localhost:3000/outlook/auth/callback
OUTLOOK_USE_COMMON=true
```

### 5. Run the Application

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

### Simple 3-Step Process (Same for both Gmail and Outlook)

#### Gmail:
1. **Get Auth URL**: `GET /gmail/auth/url`
2. **Authorize**: Open the returned URL in browser and grant Google permissions
3. **Use API**: Tokens are automatically stored in session - start using `/gmail/messages`

#### Outlook:
1. **Get Auth URL**: `GET /outlook/auth/url`
2. **Authorize**: Open the returned URL in browser and grant Microsoft permissions
3. **Use API**: Tokens are automatically stored in session - start using `/outlook/messages`

## API Endpoints

### Gmail
- `GET /gmail/auth/url` - Get Gmail OAuth2 authorization URL
- `GET /gmail/auth/status` - Check Gmail authentication status
- `GET /gmail/messages?maxResults=10` - List Gmail messages
- `GET /gmail/messages/:id` - Get specific Gmail message

### Outlook
- `GET /outlook/auth/url` - Get Outlook OAuth2 authorization URL
- `GET /outlook/auth/status` - Check Outlook authentication status
- `GET /outlook/messages?maxResults=10` - List Outlook messages
- `GET /outlook/messages/:id` - Get specific Outlook message
- `GET /outlook/messages/search?query=from:sender@example.com` - Search messages
- `GET /outlook/messages/:messageId/attachments/:attachmentId` - Get attachment

## 📋 Response Format

### Standard Email Response
```json
{
  "id": "message-id",
  "threadId": "thread-id", 
  "snippet": "Email preview...",
  "from": "sender@example.com",
  "to": "recipient@example.com",
  "subject": "Email subject",
  "date": "Wed, 04 Sep 2024 10:30:00 +0000",
  "body": "Email content in plain text",
  "hasAttachments": true,
  "attachments": [
    {
      "id": "attachment-id",
      "name": "meeting-invite.ics",
      "contentType": "text/calendar",
      "size": 2048,
      "isInline": false,
      "isCalendarEvent": true,
      "icsContent": "BEGIN:VCALENDAR...",
      "parsedEvent": {
        "title": "Team Meeting",
        "startDate": "20240905T100000Z",
        "endDate": "20240905T110000Z",
        "location": "Conference Room A",
        "description": "Weekly team sync",
        "organizer": "organizer@company.com"
      }
    }
  ]
}
```

### 📅 ICS Calendar File Features
When emails contain `.ics` calendar files, the API automatically:
- Detects calendar attachments by content type and filename
- Extracts and decodes ICS content  
- Parses key event details (title, dates, location, organizer, description)
- Includes both raw ICS content and parsed event data
- Works for both Gmail and Outlook attachments

## Error Handling

- `401 Unauthorized` - Authentication required
- `404 Not Found` - Message not found
- `400 Bad Request` - Invalid request parameters
- `500 Internal Server Error` - Server errors

## 🔒 Security Features

- **Session-based token storage** - Secure server-side token management
- **Automatic token refresh** - Proactive token renewal before expiration
- **Multi-tenant authentication** - Support for organizational and personal accounts  
- **Input validation** - NestJS built-in validation with proper DTOs
- **Error handling** - Comprehensive exception handling with meaningful messages
- **Rate limiting** - Message fetching limits (max 500 per request)
- **Secure credentials** - Environment-based configuration management

## 🏗️ Architecture & Best Practices

- **NestJS Framework** - Enterprise-grade Node.js framework
- **Dependency Injection** - Clean, testable service architecture
- **Provider Pattern** - Separate Gmail and Outlook implementations
- **DTO Validation** - Strong TypeScript typing with Swagger documentation
- **Error Boundaries** - Proper exception handling at all layers
- **Session Management** - Stateful authentication with automatic cleanup
- **Modular Design** - Clean separation of concerns

## Project Structure

```
src/
├── email/
│   ├── providers/
│   │   ├── gmail.provider.ts    # Gmail API integration
│   │   └── outlook.provider.ts  # Microsoft Graph API integration
│   ├── email.controller.ts      # Gmail API endpoints
│   ├── outlook.controller.ts    # Outlook API endpoints
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