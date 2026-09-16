import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';

export interface AuthUserPayload {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      userProfile?: any;
    }
  }
}

export function extractToken(req: Request): string | null {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
    if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
      res.status(401).json({ error: 'Unauthorized: Invalid user ID format' });
      return;
    }

    const user = await UserModel.findById(decoded.id);

    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User not found' });
      return;
    }

    req.user = { id: decoded.id, email: decoded.email };
    req.userProfile = user.toProfile();
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
    if (mongoose.Types.ObjectId.isValid(decoded.id)) {
      const user = await UserModel.findById(decoded.id);
      if (user) {
        req.user = { id: decoded.id, email: decoded.email };
        req.userProfile = user.toProfile();
      }
    }
  } catch {
    // Ignore invalid tokens in optional auth
  }

  next();
}
