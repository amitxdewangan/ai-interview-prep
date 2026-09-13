import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { UserProfile } from '@repo/shared';

export interface IUser {
  email: string;
  password: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  toProfile(): UserProfile;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.toProfile = function (): UserProfile {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name,
    created_at: (this.createdAt || new Date()).toISOString(),
  };
};

export const UserModel: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

// In-Memory User Entity for test/fallback mode
export interface InMemoryUser {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  toProfile(): UserProfile;
}

const inMemoryUsers = new Map<string, InMemoryUser>();

export class UserStore {
  static async create(data: { email: string; password: string; name: string }): Promise<IUserDocument | InMemoryUser> {
    if (mongoose.connection.readyState === 1) {
      const created = await UserModel.create({
        email: data.email.toLowerCase().trim(),
        password: data.password,
        name: data.name.trim(),
      });
      return created;
    }

    // In-memory fallback
    const normalizedEmail = data.email.toLowerCase().trim();
    for (const existing of inMemoryUsers.values()) {
      if (existing.email === normalizedEmail) {
        const err: any = new Error('E11000 duplicate key error collection: users index: email_1');
        err.code = 11000;
        throw err;
      }
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const user: InMemoryUser = {
      id,
      email: normalizedEmail,
      password: data.password,
      name: data.name.trim(),
      createdAt: now,
      updatedAt: now,
      async comparePassword(candidate: string) {
        return bcrypt.compare(candidate, this.password);
      },
      toProfile() {
        return {
          id: this.id,
          email: this.email,
          name: this.name,
          created_at: this.createdAt.toISOString(),
        };
      },
    };

    inMemoryUsers.set(id, user);
    return user;
  }

  static async findByEmail(email: string): Promise<IUserDocument | InMemoryUser | null> {
    const normalized = email.toLowerCase().trim();
    if (mongoose.connection.readyState === 1) {
      return UserModel.findOne({ email: normalized });
    }

    for (const user of inMemoryUsers.values()) {
      if (user.email === normalized) {
        return user;
      }
    }
    return null;
  }

  static async findById(id: string): Promise<IUserDocument | InMemoryUser | null> {
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }
      return UserModel.findById(id);
    }

    return inMemoryUsers.get(id) || null;
  }

  static clear(): void {
    inMemoryUsers.clear();
  }
}
