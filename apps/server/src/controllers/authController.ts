import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRegisterSchema, UserLoginSchema } from '@repo/shared';
import { env } from '../config/env.js';
import { UserStore } from '../models/User.js';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const parseResult = UserRegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const { email, password, name } = parseResult.data;

    try {
      const existing = await UserStore.findByEmail(email);
      if (existing) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await UserStore.create({
        email,
        password: hashedPassword,
        name,
      });

      const userId = (user as any).id || (user as any)._id.toString();
      const token = jwt.sign({ id: userId, email: user.email }, env.JWT_SECRET, {
        expiresIn: '7d',
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        user: typeof user.toProfile === 'function' ? user.toProfile() : user,
        token,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Registration failed', details: msg });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    const parseResult = UserLoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const { email, password } = parseResult.data;

    try {
      const user = await UserStore.findByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const userId = (user as any).id || (user as any)._id.toString();
      const token = jwt.sign({ id: userId, email: user.email }, env.JWT_SECRET, {
        expiresIn: '7d',
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        user: typeof user.toProfile === 'function' ? user.toProfile() : user,
        token,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Login failed', details: msg });
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logged out successfully' });
  }

  static async me(req: Request, res: Response): Promise<void> {
    if (!req.userProfile) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.status(200).json({ user: req.userProfile });
  }
}
