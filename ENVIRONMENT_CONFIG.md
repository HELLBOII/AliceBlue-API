# Environment Configuration

This application uses environment variables to configure API endpoints and other settings.

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=http://localhost:8000

# Environment
NODE_ENV=development
```

## Environment Examples

### Development
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=http://localhost:8000
NODE_ENV=development
```

### Production
```bash
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
NEXT_PUBLIC_WS_BASE_URL=https://your-api-domain.com
NODE_ENV=production
```

### Staging
```bash
NEXT_PUBLIC_API_BASE_URL=https://staging-api.your-domain.com
NEXT_PUBLIC_WS_BASE_URL=https://staging-api.your-domain.com
NODE_ENV=production
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
