import { z } from 'zod';

export const UserRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  created_at: z.string(),
});

export type UserRegisterInput = z.infer<typeof UserRegisterSchema>;
export type UserLoginInput = z.infer<typeof UserLoginSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
