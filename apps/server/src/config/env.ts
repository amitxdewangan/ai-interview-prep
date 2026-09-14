import fs from 'node:fs';
import path from 'node:path';

export interface ServerEnv {
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  CLIENT_URL: string;
  NODE_ENV: string;
  ALLOW_LOCAL_URLS: boolean;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
}

/**
 * Automatically loads .env file using Node's native process.loadEnvFile().
 * Checks current directory, parent directories, apps/server/.env, and monorepo root .env.
 */
function loadEnvFile(): void {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(process.cwd(), 'apps/server/.env'),
    path.resolve(process.cwd(), '../../.env'),
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      try {
        if (typeof process.loadEnvFile === 'function') {
          process.loadEnvFile(envPath);
          break;
        }
      } catch {
        // Continue if parse error or next path
      }
    }
  }
}

// Load environment variables on module initialization
loadEnvFile();

export function getEnv(): ServerEnv {
  return {
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
    MONGODB_URI: process.env.MONGODB_URI || '',
    JWT_SECRET: process.env.JWT_SECRET || '',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
    NODE_ENV: process.env.NODE_ENV || 'development',
    ALLOW_LOCAL_URLS: process.env.ALLOW_LOCAL_URLS === 'true',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL,
  };
}

export const env = getEnv();
