import { Response, NextFunction } from 'express';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { MessageReceipt } from '../models/MessageReceipt.js';
import { AuthRequest } from '../middleware/auth.js';

export const getUserChats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Find all chats where the user is a participant
    const chats = await Chat.find({ participants: userId })
      .populate('participants', 'name email username photo status lastSeen')
      .sort({ updatedAt: -1 });

    // Populate latest message and unread counts for each chat
    const chatsWithMetadata = await Promise.all(
      chats.map(async (chat) => {
        // Fetch the latest message
        const lastMessage = await Message.findOne({ chatId: chat._id })
          .populate('senderId', 'name email photo')
          .sort({ createdAt: -1 });

        // Calculate unread count for this user
        // Unread messages: messages in this chat, not sent by this user, where there is no 'seen' receipt by this user
        let unreadCount = 0;
        if (lastMessage) {
          const incomingMessages = await Message.find({
            chatId: chat._id,
            senderId: { $ne: userId },
          });

          const msgIds = incomingMessages.map(m => m._id);
          const seenReceipts = await MessageReceipt.find({
            messageId: { $in: msgIds },
            userId,
            status: 'seen',
          });

          const seenMsgIds = new Set(seenReceipts.map(r => r.messageId.toString()));
          unreadCount = incomingMessages.filter(m => !seenMsgIds.has(m._id.toString())).length;
        }

        return {
          ...chat.toObject(),
          lastMessage,
          unreadCount,
        };
      })
    );

    // Sort by last message date, or if no messages, by chat update date
    chatsWithMetadata.sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.updatedAt).getTime();
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    res.status(200).json({ chats: chatsWithMetadata });
  } catch (error) {
    next(error);
  }
};

export const createChat = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { type, participantIds, name } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!type || !['private', 'group'].includes(type)) {
      res.status(400).json({ message: 'Invalid chat type' });
      return;
    }

    if (type === 'private') {
      if (!participantIds || participantIds.length !== 1) {
        res.status(400).json({ message: 'Private chat requires exactly one other participant' });
        return;
      }

      const targetUserId = participantIds[0];

      // Check if a private chat already exists between these two users
      const existingChat = await Chat.findOne({
        type: 'private',
        participants: { $all: [userId, targetUserId], $size: 2 },
      }).populate('participants', 'name email username photo status lastSeen');

      if (existingChat) {
        res.status(200).json({ chat: existingChat, isExisting: true });
        return;
      }

      const newChat = await Chat.create({
        type: 'private',
        participants: [userId, targetUserId],
      });

      const populatedChat = await Chat.findById(newChat._id).populate(
        'participants',
        'name email username photo status lastSeen'
      );

      res.status(201).json({ chat: populatedChat, isExisting: false });
    } else {
      // Group chat
      if (!name || name.trim() === '') {
        res.status(400).json({ message: 'Group name is required' });
        return;
      }

      if (!participantIds || participantIds.length === 0) {
        res.status(400).json({ message: 'Group chat requires at least one other participant' });
        return;
      }

      const participants = Array.from(new Set([userId, ...participantIds]));

      const newChat = await Chat.create({
        type: 'group',
        name,
        participants,
      });

      const populatedChat = await Chat.findById(newChat._id).populate(
        'participants',
        'name email username photo status lastSeen'
      );

      res.status(201).json({ chat: populatedChat });
    }
  } catch (error) {
    next(error);
  }
};

export const getChatMessages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chatId = req.params.chatId;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Verify user is participant in the chat
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) {
      res.status(403).json({ message: 'You are not a participant in this chat' });
      return;
    }

    // Optional query params for pagination
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string;

    const query: any = { chatId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name email username photo')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .limit(limit);

    // Get receipts for these messages
    const msgIds = messages.map(m => m._id);
    const receipts = await MessageReceipt.find({ messageId: { $in: msgIds } })
      .populate('userId', 'name photo');

    const messagesWithReceipts = messages.map((msg) => {
      const msgReceipts = receipts.filter(r => r.messageId.toString() === msg._id.toString());
      return {
        ...msg.toObject(),
        receipts: msgReceipts,
      };
    });

    // Return messages in chronological order for the client
    res.status(200).json({ messages: messagesWithReceipts.reverse() });
  } catch (error) {
    next(error);
  }
};

export const markChatAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chatId = req.params.chatId;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Verify user is in chat
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) {
      res.status(403).json({ message: 'You are not a participant in this chat' });
      return;
    }

    // Find all messages in the chat not sent by this user
    const messages = await Message.find({ chatId, senderId: { $ne: userId } });

    // Mark as seen for this user
    await Promise.all(
      messages.map(async (msg) => {
        await MessageReceipt.findOneAndUpdate(
          { messageId: msg._id, userId },
          { status: 'seen' },
          { upsert: true }
        );
      })
    );

    res.status(200).json({ message: 'Chat messages marked as read' });
  } catch (error) {
    next(error);
  }
};
