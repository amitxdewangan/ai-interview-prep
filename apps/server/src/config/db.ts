import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB(uri?: string): Promise<typeof mongoose> {
  const targetUri = uri || env.MONGODB_URI;

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Database] MongoDB connection error: ${msg}`);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
