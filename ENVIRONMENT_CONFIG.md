# Environment Configuration

This application uses environment variables to configure API endpoints and other settings.

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://alice-blue-api.vercel.app
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000

# Environment
NODE_ENV=development
```

## Environment Examples

### Development (Recommended)
```bash
NEXT_PUBLIC_API_BASE_URL=https://alice-blue-api.vercel.app
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
NODE_ENV=development
```

### Production
```bash
NEXT_PUBLIC_API_BASE_URL=https://alice-blue-api.vercel.app
NEXT_PUBLIC_WS_BASE_URL=wss://alice-blue-api.vercel.app
NODE_ENV=production
```

### Local Development (Full Local)
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
NODE_ENV=development
```

## Configuration Files

The application uses a centralized configuration system located in `src/config/appConfig.ts` that:

- Reads environment variables
- Provides fallback defaults
- Exports helper functions for URL construction
- Centralizes all API endpoint configuration

## Benefits

- **Environment-specific configuration**: Easy to switch between dev/staging/production
- **No hardcoded URLs**: All URLs are configurable
- **Centralized management**: Single source of truth for all API endpoints
- **Type safety**: TypeScript support for configuration
- **Helper functions**: Easy URL construction with `getApiUrl()` and `getWsUrl()`
