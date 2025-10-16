# Environment Configuration Guide

## How to Set Up Environment Variables

### Option 1: Create .env.local file (Recommended)
Create a file named `.env.local` in your project root with:

```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000

# Environment
NODE_ENV=development
```

### Option 2: Use .env file
Create a file named `.env` in your project root with the same content as above.

### Option 3: Set environment variables in your system
You can also set these as system environment variables.

## Configuration Options

### Local Development (Current Setup)
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
NODE_ENV=development
```

### Production (After deploying your API)
```bash
NEXT_PUBLIC_API_BASE_URL=https://your-deployed-api.com
NEXT_PUBLIC_WS_BASE_URL=wss://your-deployed-api.com
NODE_ENV=production
```

### Mixed Setup (API on server, WebSocket local)
```bash
NEXT_PUBLIC_API_BASE_URL=https://your-deployed-api.com
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
NODE_ENV=development
```

## How It Works

The application will:
1. Check for environment variables first
2. Fall back to default values if not found
3. Use the configured URLs for API calls and WebSocket connections

## Current Default Configuration

If no environment file is found, the app uses:
- **API Base URL:** `http://localhost:8000`
- **WebSocket Base URL:** `ws://localhost:8000`
- **Environment:** `development`

## File Priority

Next.js loads environment variables in this order:
1. `.env.local` (highest priority)
2. `.env.development` or `.env.production`
3. `.env` (lowest priority)

## Important Notes

- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Variables without this prefix are only available on the server
- Always restart your development server after changing environment variables
