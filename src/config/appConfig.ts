/**
 * Application configuration
 * Centralizes all API endpoints and URLs
 */

interface AppConfig {
  apiBaseUrl: string
  wsBaseUrl: string
  environment: string
}

const getConfig = (): AppConfig => {
  // Check for environment variables first
  const apiBaseUrl = 'https://alice-blue-api.vercel.app' 
  const wsBaseUrl = 'https://alice-blue-api.vercel.app'
  const environment = 'production'

  return {
    apiBaseUrl,
    wsBaseUrl,
    environment
  }
}

export const config = getConfig()

// Export individual config values for convenience
export const API_BASE_URL = config.apiBaseUrl
export const WS_BASE_URL = config.wsBaseUrl
export const ENVIRONMENT = config.environment

// Helper functions
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
}

export const getWsUrl = (endpoint: string): string => {
  return `${WS_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
}
