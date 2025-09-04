# Gmail API Setup Guide

## Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click on it and press "ENABLE"

## Step 2: Create OAuth2 Credentials

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

## Step 3: Project Setup

1. Clone or download the project
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your credentials:
   ```env
   GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=your-client-secret
   GMAIL_REDIRECT_URI=http://localhost:3000/gmail/auth/callback
   ```

## Step 4: Install and Run

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Start the application:
   ```bash
   yarn start:dev
   ```

3. The API will be running at `http://localhost:3000`

## Step 5: Authenticate with Gmail (Simple Flow)

### Method 1: Browser Authentication (Recommended)

1. Open your browser and visit:
   ```
   http://localhost:3000/gmail/auth/url
   ```

2. Copy the `authUrl` from the JSON response

3. Open the auth URL in your browser

4. Sign in with your Google account and grant permissions

5. You'll be automatically redirected back and see a success message

6. **That's it!** Your tokens are now stored in the session

### Method 2: Manual Testing

If you want to test manually:

1. Get the authorization URL:
   ```bash
   curl http://localhost:3000/gmail/auth/url
   ```

2. Open the returned URL in browser and authorize

3. After redirect, you'll see the success message

## Step 6: Test the API

Now you can use the Gmail endpoints in the same browser session:

```bash
# Check authentication status
curl http://localhost:3000/gmail/auth/status

# Get messages
curl http://localhost:3000/gmail/messages

# Get specific message
curl http://localhost:3000/gmail/messages/MESSAGE_ID

# Get more messages
curl "http://localhost:3000/gmail/messages?maxResults=20"
```

## API Documentation

Visit `http://localhost:3000/api` for interactive Swagger documentation where you can test all endpoints.

## Session Management

- Tokens are automatically stored in your browser session
- Session expires after 24 hours
- No need to manually handle tokens or refresh tokens
- Each user gets their own session

## Troubleshooting

### "Gmail authentication required" Error
- You haven't authenticated yet or session expired
- Solution: Visit `/gmail/auth/url` and complete the auth flow

### "OAuth2 client not initialized" Error
- Your .env file is missing client ID or secret
- Solution: Check your `.env` file and restart the app

### Redirect URI Mismatch Error
- The redirect URI in Google Console doesn't match your app
- Solution: Make sure it's exactly `http://localhost:3000/gmail/auth/callback`

### Development vs Production

For development:
- Use `http://localhost:3000/gmail/auth/callback`
- Cookies work over HTTP

For production:
- Use HTTPS redirect URI
- Set `NODE_ENV=production`
- Cookies will be secure and HTTP-only

## Security Notes

- Session data is stored server-side
- Cookies are HTTP-only to prevent XSS
- HTTPS-only cookies in production
- Tokens never exposed to client-side JavaScript