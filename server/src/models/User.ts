import { Schema, model } from 'mongoose';

export interface IUser {
  username: string;
  name: string;
  email: string;
  passwordHash: string;
  photo?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  lastActivity: Date;
  windowFocused: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    photo: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['online', 'away', 'busy', 'offline'],
      default: 'offline',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    windowFocused: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Remove passwordHash from JSON responses
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete (ret as any).passwordHash;
    return ret;
  },
});

export const User = model<IUser>('User', UserSchema);
