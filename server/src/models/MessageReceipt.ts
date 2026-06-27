import { Schema, model, Types } from 'mongoose';

export interface IMessageReceipt {
  messageId: Types.ObjectId;
  userId: Types.ObjectId;
  status: 'delivered' | 'seen';
  updatedAt: Date;
}

const MessageReceiptSchema = new Schema<IMessageReceipt>(
  {
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['delivered', 'seen'],
      required: true,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

// Compound index to quickly find/update a receipt for a user-message combo
MessageReceiptSchema.index({ messageId: 1, userId: 1 }, { unique: true });

export const MessageReceipt = model<IMessageReceipt>('MessageReceipt', MessageReceiptSchema);
