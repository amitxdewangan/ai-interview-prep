export interface ServerEnv {
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  CLIENT_URL: string;
  NODE_ENV: string;
  ALLOW_LOCAL_URLS: boolean;
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
}

export function getEnv(): ServerEnv {
  return {
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
    MONGODB_URI: process.env.MONGODB_URI || '',
    JWT_SECRET: process.env.JWT_SECRET || '',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
    NODE_ENV: process.env.NODE_ENV || 'development',
    ALLOW_LOCAL_URLS: process.env.ALLOW_LOCAL_URLS === 'true',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  };
}

export const env = getEnv();
