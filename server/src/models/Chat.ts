import { Schema, model, Types } from 'mongoose';

export interface IChat {
  type: 'private' | 'group';
  name?: string;
  participants: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    type: {
      type: String,
      enum: ['private', 'group'],
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index to quickly fetch a user's chats
ChatSchema.index({ participants: 1 });

export const Chat = model<IChat>('Chat', ChatSchema);
