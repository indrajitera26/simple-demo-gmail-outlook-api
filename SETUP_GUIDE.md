# Complete Setup Guide: Gmail & Outlook Email API

This guide covers the complete setup for both Gmail and Outlook integrations with multi-tenant support and ICS calendar file processing.

## Part A: Gmail API Setup

### Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click on it and press "ENABLE"

### Step 2: Create Gmail OAuth2 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" for testing
   - Fill in required fields (app name, email, etc.)
   - Add your email to test users
4. For Application type, select "Web application"
5. Add authorized redirect URI:
   ```
   http://localhost:3000/gmail/auth/callback
   ```
6. Click "Create"
7. Copy the Client ID and Client Secret

## Part B: Outlook API Setup (Multi-tenant + Personal)

### Step 3: Azure Portal App Registration

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **"New registration"**
4. Configure the registration:
   - **Name**: Your app name (e.g., "Email API") 
   - **Supported account types**: **"Accounts in any organizational directory and personal Microsoft accounts (e.g. Skype, Xbox)"**
     - ⚠️ **Important**: This enables both organizational and personal Microsoft accounts
   - **Redirect URI**: Select "Web" platform and enter:
     ```
     http://localhost:3000/outlook/auth/callback
     ```
5. Click **"Register"**

### Step 4: Configure App Permissions and Secrets

1. After registration, note the **Application (client) ID** from the Overview page

2. **Create Client Secret**:
   - Go to **"Certificates & secrets"**
   - Click **"New client secret"**
   - Add description (e.g., "API Secret") and choose expiry (recommend 24 months)
   - **Copy the secret value immediately** (you won't see it again!)

3. **Configure API Permissions**:
   - Go to **"API permissions"**
   - Click **"Add a permission"** > **"Microsoft Graph"**
   - Select **"Delegated permissions"**
   - Add these permissions:
     - `Mail.Read` - Read user mail
     - `User.Read` - Read user profile  
     - `offline_access` - Maintain access to data (for token refresh)
   - **Optional**: Click **"Grant admin consent"** (users can also consent individually)

4. **Authentication Configuration**:
   - Go to **"Authentication"**
   - Under **"Advanced settings"** > **"Allow public client flows"**: **No**
   - **"Supported account types"** should show: "Accounts in any organizational directory and personal Microsoft accounts"

### Step 5: Project Setup

1. Clone or download the project
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with both Gmail and Outlook credentials:
   ```env
   PORT=3000

   # Gmail Configuration
   GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=your-client-secret
   GMAIL_REDIRECT_URI=http://localhost:3000/gmail/auth/callback

   # Outlook Configuration (Multi-tenant + Personal)
   OUTLOOK_CLIENT_ID=your-azure-app-client-id
   OUTLOOK_CLIENT_SECRET=your-azure-client-secret-value
   OUTLOOK_TENANT_ID=common
   OUTLOOK_REDIRECT_URI=http://localhost:3000/outlook/auth/callback
   OUTLOOK_USE_COMMON=true
   ```

   **Important Notes**:
   - Set `OUTLOOK_TENANT_ID=common` for multi-tenant support
   - Set `OUTLOOK_USE_COMMON=true` to support personal Microsoft accounts

### Step 6: Install and Run

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Start the application:
   ```bash
   yarn start:dev
   ```

3. The API will be running at `http://localhost:3000`
4. Interactive API docs: `http://localhost:3000/api`

## Part C: Authentication & Testing

### Step 7: Gmail Authentication Flow

#### Method 1: Browser Authentication (Recommended)

1. Open your browser and visit:
   ```
   http://localhost:3000/gmail/auth/url
   ```

2. Copy the `authUrl` from the JSON response

3. Open the auth URL in your browser

4. Sign in with your Google account and grant permissions

5. You'll be automatically redirected back and see a success message

6. **That's it!** Your Gmail tokens are now stored in the session

#### Method 2: API Testing

```bash
# Get Gmail authorization URL
curl http://localhost:3000/gmail/auth/url

# Open the returned URL in browser and authorize
# After redirect, tokens are stored in session
```

### Step 8: Outlook Authentication Flow

#### For Personal Microsoft Accounts (@outlook.com, @hotmail.com, @live.com)

1. Open your browser and visit:
   ```
   http://localhost:3000/outlook/auth/url
   ```

2. Copy the `authUrl` from the JSON response

3. Open the auth URL in your browser

4. Sign in with your **personal Microsoft account**

5. Grant permissions when prompted

6. You'll be redirected back with a success message

#### For Organizational Accounts (Azure AD)

1. Same process as above, but sign in with your work/school account

2. If your organization requires admin consent, you may need IT approval

#### API Testing

```bash
# Get Outlook authorization URL
curl http://localhost:3000/outlook/auth/url

# Open the returned URL in browser and authorize
# After redirect, tokens are stored in session
```

### Step 9: Test Both APIs

#### Gmail Endpoints

```bash
# Check Gmail authentication status
curl http://localhost:3000/gmail/auth/status

# Get Gmail messages (with ICS parsing)
curl http://localhost:3000/gmail/messages

# Get specific Gmail message
curl http://localhost:3000/gmail/messages/MESSAGE_ID

# Get more Gmail messages
curl "http://localhost:3000/gmail/messages?maxResults=20"
```

#### Outlook Endpoints

```bash
# Check Outlook authentication status  
curl http://localhost:3000/outlook/auth/status

# Get Outlook messages (with automatic token refresh)
curl http://localhost:3000/outlook/messages

# Get specific Outlook message with attachments
curl http://localhost:3000/outlook/messages/MESSAGE_ID

# Search Outlook messages
curl "http://localhost:3000/outlook/messages/search?query=from:sender@example.com"

# Get attachment (if message has attachments)
curl http://localhost:3000/outlook/messages/MESSAGE_ID/attachments/ATTACHMENT_ID

# Get more Outlook messages
curl "http://localhost:3000/outlook/messages?maxResults=50"
```

#### 📅 ICS Calendar Files Testing

Both Gmail and Outlook automatically detect and parse `.ics` files:

```bash
# Look for emails with attachments
curl http://localhost:3000/gmail/messages | jq '.[] | select(.hasAttachments == true)'
curl http://localhost:3000/outlook/messages | jq '.[] | select(.hasAttachments == true)'

# Check if any attachments are calendar events
curl http://localhost:3000/gmail/messages/MESSAGE_ID | jq '.attachments[] | select(.isCalendarEvent == true)'
```

Example response with ICS file:
```json
{
  "attachments": [
    {
      "id": "attachment-id",
      "name": "meeting.ics",
      "contentType": "text/calendar",
      "isCalendarEvent": true,
      "icsContent": "BEGIN:VCALENDAR\nVERSION:2.0\n...",
      "parsedEvent": {
        "title": "Team Meeting",
        "startDate": "20240905T100000Z",
        "endDate": "20240905T110000Z",
        "location": "Conference Room A",
        "organizer": "organizer@company.com"
      }
    }
  ]
}
```

## API Documentation

Visit `http://localhost:3000/api` for interactive Swagger documentation where you can test all endpoints.

## Session Management

- Tokens are automatically stored in your browser session
- Session expires after 24 hours
- No need to manually handle tokens or refresh tokens
- Each user gets their own session

## Part D: Troubleshooting & Common Issues

### Gmail Issues

#### "Gmail authentication required" Error
- **Cause**: You haven't authenticated yet or session expired
- **Solution**: Visit `/gmail/auth/url` and complete the auth flow

#### "OAuth client was not found" Error  
- **Cause**: Gmail credentials are incorrect or missing
- **Solution**: Double-check your `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` in `.env`

#### Redirect URI Mismatch Error
- **Cause**: The redirect URI in Google Console doesn't match your app
- **Solution**: Make sure it's exactly `http://localhost:3000/gmail/auth/callback`

### Outlook Issues

#### "Invalid or expired tokens. Please re-authenticate" Error
- **Cause**: Token has expired or is invalid
- **Solution**: The API automatically refreshes tokens, but if this persists, re-authenticate via `/outlook/auth/url`

#### "You can't sign in here with a personal account" Error
- **Cause**: Azure app registration doesn't support personal accounts
- **Solution**: 
  1. Go to Azure Portal > App registrations > Your app
  2. Go to "Authentication"
  3. Change "Supported account types" to "Accounts in any organizational directory and personal Microsoft accounts"
  4. Make sure `OUTLOOK_TENANT_ID=common` in your `.env` file

#### "AADSTS700016: Application not found" Error
- **Cause**: Incorrect `OUTLOOK_CLIENT_ID` or app was deleted
- **Solution**: Verify your Azure app registration and client ID

#### Token Refresh Issues
- **Cause**: Missing `offline_access` permission
- **Solution**: Add `offline_access` to your Azure app permissions

### Multi-tenant Configuration Issues

#### Personal Accounts Not Working
- **Solution Checklist**:
  1. ✅ Azure app supports "personal Microsoft accounts" 
  2. ✅ `OUTLOOK_TENANT_ID=common` in `.env`
  3. ✅ `OUTLOOK_USE_COMMON=true` in `.env`
  4. ✅ `offline_access` permission is granted
  5. ✅ Redirect URI matches exactly

#### Organizational Accounts Need Admin Consent
- **Cause**: Your organization requires admin approval
- **Solution**: Ask IT admin to grant consent, or use personal account for testing

### ICS File Processing Issues

#### ICS Files Not Detected
- **Check**: Email actually contains `.ics` attachments
- **Check**: Attachment has correct content type (`text/calendar`)
- **Debug**: Look at the raw attachment data in the response

#### Parsed Event Data Missing
- **Cause**: ICS file format is non-standard
- **Check**: The `icsContent` field should contain the raw ICS data
- **Note**: Parser handles basic ICS format; complex events may not parse fully

## Part E: Production Deployment

### Environment Configuration

For production deployment:

```env
NODE_ENV=production

# Use HTTPS redirect URIs
GMAIL_REDIRECT_URI=https://yourdomain.com/gmail/auth/callback
OUTLOOK_REDIRECT_URI=https://yourdomain.com/outlook/auth/callback

# Update OAuth2 configurations in Google Console and Azure Portal
```

### Security Considerations

- ✅ **Session data is stored server-side**
- ✅ **Cookies are HTTP-only** to prevent XSS
- ✅ **HTTPS-only cookies** in production
- ✅ **Tokens never exposed** to client-side JavaScript
- ✅ **Automatic token refresh** prevents expired token issues
- ✅ **Input validation** with NestJS DTOs
- ✅ **Rate limiting** built into endpoints (max 500 messages per request)

### Performance Features

- ✅ **Proactive token refresh** - Tokens refreshed before expiration
- ✅ **Parallel processing** - Attachments processed concurrently  
- ✅ **Efficient parsing** - ICS files only processed when detected
- ✅ **Session caching** - Avoid repeated API calls for same data
- ✅ **Error boundaries** - Failures in one email don't affect others

## Part F: Advanced Configuration

### Custom Scopes

#### Gmail
Default: `https://www.googleapis.com/auth/gmail.readonly`

To modify, edit `src/email/providers/gmail.provider.ts`:
```typescript
const scopes = [
  'https://www.googleapis.com/auth/gmail.readonly',
  // Add more scopes if needed
];
```

#### Outlook  
Default: `Mail.Read`, `User.Read`, `offline_access`

To modify, update your Azure app permissions and the provider configuration.

### Custom Session Configuration

Edit `src/main.ts` to customize session settings:
```typescript
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      httpOnly: true, // Prevent XSS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);
```