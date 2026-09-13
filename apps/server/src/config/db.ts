import mongoose from 'mongoose';
import { env } from './env.js';

let isConnectedState = false;

export async function connectDB(uri?: string): Promise<typeof mongoose | null> {
  const targetUri = uri || env.MONGODB_URI;

  if (mongoose.connection.readyState === 1) {
    isConnectedState = true;
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 2000,
    });
    isConnectedState = true;
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    isConnectedState = false;
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[Database] MongoDB connection warning: ${msg}. Fallback mode active.`);
    return null;
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnectedState = false;
  }
}

export function isConnected(): boolean {
  return mongoose.connection.readyState === 1 || isConnectedState;
}
