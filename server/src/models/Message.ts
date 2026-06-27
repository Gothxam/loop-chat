import { Schema, model, Types } from 'mongoose';

export interface IReaction {
  userId: Types.ObjectId;
  emoji: string;
}

export interface IMessage {
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  message?: string;
  fileUrl?: string;
  fileType?: 'image' | 'video' | 'document' | 'voice';
  reactions: IReaction[];
  replyTo?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReactionSchema = new Schema<IReaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    message: {
      type: String,
      trim: true,
    },
    fileUrl: {
      type: String,
      trim: true,
    },
    fileType: {
      type: String,
      enum: ['image', 'video', 'document', 'voice'],
    },
    reactions: [ReactionSchema],
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for sorting chat messages by creation date
MessageSchema.index({ chatId: 1, createdAt: -1 });

export const Message = model<IMessage>('Message', MessageSchema);
