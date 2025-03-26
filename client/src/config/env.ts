/**
 * This file handles environment variable validation and typing for the frontend.
 * It ensures all required environment variables are present and properly typed.
 * 
 * Note: In React, environment variables must be prefixed with REACT_APP_
 * to be accessible in the frontend code.
 */

// Define the shape of our environment
interface Env {
  // Server URLs
  BACKEND_URL: string;
  
  // Environment
  NODE_ENV: 'development' | 'production' | 'test';
  
  // Feature flags and configuration
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
}

// Required environment variables (must be prefixed with REACT_APP_)
const requiredEnvVars = [
  'REACT_APP_BACKEND_URL'
] as const;

// Validate environment variables
function validateEnv() {
  const missingVars = requiredEnvVars.filter(
    varName => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missingVars.join('\n')}\n\n` +
      'Make sure these are set in your .env file or environment.\n' +
      'Note: React requires environment variables to be prefixed with REACT_APP_'
    );
  }
}

// Environment configuration with proper typing
export const env: Env = {
  // Server URLs
  BACKEND_URL: process.env.REACT_APP_BACKEND_URL as string,
  
  // Environment (this is automatically set by React)
  NODE_ENV: (process.env.NODE_ENV || 'development') as Env['NODE_ENV'],
  
  // Optional configuration
  LOG_LEVEL: (process.env.REACT_APP_LOG_LEVEL || 'info') as Env['LOG_LEVEL']
};

// Validate on import
validateEnv();

// Export individual environment variables with proper typing
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test'; 