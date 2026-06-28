import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { MessageReceipt } from '../models/MessageReceipt.js';
import webpush from 'web-push';
import { PushSubscription } from '../models/PushSubscription.js';

const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BCj0xzJ0CYFoki6Uy5LujHSM4_ZYRjnDhr9Q2E0cZqgGww1Ip6OrdY07uJ_0BZm-wke2Z52TRGNU1yV4UfH4Ysk';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'rdhJ_By8_IO6j9aupmU2J7Jj7jXSHMUhHbtmfidmYz4';

webpush.setVapidDetails(
  'mailto:support@loopchat.com',
  publicVapidKey,
  privateVapidKey
);

const triggerPushNotifications = async (recipientId: string, senderName: string, messageText: string, chatId: string) => {
  try {
    const subscriptions = await PushSubscription.find({ userId: recipientId });
    if (!subscriptions || subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title: senderName,
      body: messageText,
      chatId,
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, payload);
        } catch (err: any) {
          // If subscription is expired or invalid (410 Gone / 404 Not Found), prune it
          if (err.statusCode === 410 || err.statusCode === 404) {
            await PushSubscription.findByIdAndDelete(sub._id);
          }
        }
      })
    );
  } catch (err) {
    console.error('Error triggering web push:', err);
  }
};

interface DecodedToken {
  id: string;
}

// Map to track active user socket connections: userId -> Set of socketId
const activeConnections = new Map<string, Set<string>>();
const inactiveSockets = new Set<string>();

const hasVisibleConnection = (userId: string): boolean => {
  const sockets = activeConnections.get(userId);
  if (!sockets || sockets.size === 0) return false;
  for (const socketId of sockets) {
    if (!inactiveSockets.has(socketId)) {
      return true;
    }
  }
  return false;
};

export const initializeSocket = (httpServer: HttpServer, clientUrl: string | string[]) => {
  const io = new Server(httpServer, {
    cors: {
      origin: clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT Authentication Middleware for Socket.IO
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const secret = process.env.JWT_SECRET || 'supersecretjwtkeyforchat2026';
      const decoded = jwt.verify(token, secret) as DecodedToken;

      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user information to socket
      (socket as any).userId = user._id.toString();
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`User connected: ${userId} (Socket: ${socket.id})`);

    // Add socket to user's connection list
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set());
    }
    activeConnections.get(userId)!.add(socket.id);

    // Join user's individual room for targeted notifications
    socket.join(userId);

    // Track active/inactive visibility state from user client
    socket.on('user:active_state', (data: { active: boolean }) => {
      console.log(`Socket visibility changed: ${socket.id} (User: ${userId}) -> ${data.active ? 'Visible' : 'Hidden'}`);
      if (data.active) {
        inactiveSockets.delete(socket.id);
      } else {
        inactiveSockets.add(socket.id);
      }
    });

    // Set user status to online and broadcast
    try {
      await User.findByIdAndUpdate(userId, { status: 'online' });
      socket.broadcast.emit('user:status', {
        userId,
        status: 'online',
      });
    } catch (err) {
      console.error('Error updating user presence on connect:', err);
    }

    // Event: Send Message
    socket.on('message:send', async (data: {
      chatId: string;
      message?: string;
      fileUrl?: string;
      fileType?: 'image' | 'video' | 'document' | 'voice';
      replyTo?: string;
    }) => {
      try {
        const { chatId, message, fileUrl, fileType, replyTo } = data;

        // Verify participant
        const chat = await Chat.findOne({ _id: chatId, participants: userId });
        if (!chat) {
          socket.emit('error', { message: 'Not a chat participant' });
          return;
        }

        // Save Message
        const newMessage = await Message.create({
          chatId,
          senderId: userId,
          message,
          fileUrl,
          fileType,
          replyTo,
        });

        const populatedMessage = await Message.findById(newMessage._id)
          .populate('senderId', 'name email username photo')
          .populate({
            path: 'replyTo',
            populate: { path: 'senderId', select: 'name' },
          });

        if (!populatedMessage) return;

        // For each participant, create delivery receipts and emit the event
        const participantIds = chat.participants.map(id => id.toString());

        await Promise.all(
          participantIds.map(async (pId) => {
            if (pId !== userId) {
              const isOnline = activeConnections.has(pId);
              // Create receipt
              await MessageReceipt.create({
                messageId: populatedMessage._id,
                userId: pId,
                status: isOnline ? 'delivered' : 'delivered', // For simplicity, we write delivered
              });
            }
          })
        );

        // Fetch receipts to send along with message
        const receipts = await MessageReceipt.find({ messageId: populatedMessage._id })
          .populate('userId', 'name photo');

        const messageData = {
          ...populatedMessage.toObject(),
          receipts,
        };

        // Broadcast to all participants
        participantIds.forEach((pId) => {
          io.to(pId).emit('message:receive', messageData);
        });

        // Trigger push notifications for all recipients (regardless of app visibility state)
        participantIds.forEach((pId) => {
          if (pId !== userId) {
            const senderName = (populatedMessage.senderId as any)?.name || 'New Message';
            const displayMsg = populatedMessage.fileUrl ? '📎 Sent an attachment' : (message || '');
            triggerPushNotifications(pId, senderName, displayMsg, chatId.toString());
          }
        });
      } catch (err) {
        console.error('Error handling message:send:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Event: Edit Message
    socket.on('message:edit', async (data: { messageId: string; newMessage: string }) => {
      try {
        const { messageId, newMessage } = data;
        const msg = await Message.findById(messageId);

        if (!msg) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        if (msg.senderId.toString() !== userId) {
          socket.emit('error', { message: 'Unauthorized to edit this message' });
          return;
        }

        msg.message = newMessage;
        await msg.save();

        // Fetch chat participants to notify
        const chat = await Chat.findById(msg.chatId);
        if (chat) {
          const participantIds = chat.participants.map(id => id.toString());
          participantIds.forEach((pId) => {
            io.to(pId).emit('message:edited', {
              messageId,
              newMessage,
              chatId: msg.chatId,
            });
          });
        }
      } catch (err) {
        console.error('Error editing message:', err);
      }
    });

    // Event: Delete Message (For Everyone)
    socket.on('message:delete_everyone', async (data: { messageId: string }) => {
      try {
        const { messageId } = data;
        const msg = await Message.findById(messageId);

        if (!msg) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        if (msg.senderId.toString() !== userId) {
          socket.emit('error', { message: 'Unauthorized to delete this message' });
          return;
        }

        // We edit content to represent deletion so reply references do not break
        msg.message = 'This message was deleted';
        msg.fileUrl = undefined;
        msg.fileType = undefined;
        await msg.save();

        // Notify participants
        const chat = await Chat.findById(msg.chatId);
        if (chat) {
          const participantIds = chat.participants.map(id => id.toString());
          participantIds.forEach((pId) => {
            io.to(pId).emit('message:deleted', {
              messageId,
              chatId: msg.chatId,
            });
          });
        }
      } catch (err) {
        console.error('Error deleting message:', err);
      }
    });

    // Event: Add Message Reaction
    socket.on('message:react', async (data: { messageId: string; emoji: string }) => {
      try {
        const { messageId, emoji } = data;
        const msg = await Message.findById(messageId);

        if (!msg) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check if user already reacted with this emoji
        const existingReactionIndex = msg.reactions.findIndex(
          (r) => r.userId.toString() === userId && r.emoji === emoji
        );

        if (existingReactionIndex > -1) {
          // Remove reaction
          msg.reactions.splice(existingReactionIndex, 1);
        } else {
          // Remove any previous reaction from the same user if we only want 1 reaction/user,
          // or just append. Let's allow multiple emojis, but remove same user's existing identical emoji.
          msg.reactions.push({ userId, emoji });
        }

        await msg.save();

        const chat = await Chat.findById(msg.chatId);
        if (chat) {
          const participantIds = chat.participants.map(id => id.toString());
          participantIds.forEach((pId) => {
            io.to(pId).emit('message:reacted', {
              messageId,
              reactions: msg.reactions,
              chatId: msg.chatId,
            });
          });
        }
      } catch (err) {
        console.error('Error reacting to message:', err);
      }
    });

    // Event: Typing Status
    socket.on('typing:start', async (data: { chatId: string }) => {
      const { chatId } = data;
      const chat = await Chat.findById(chatId);
      if (chat) {
        chat.participants.forEach((pId) => {
          if (pId.toString() !== userId) {
            io.to(pId.toString()).emit('typing:start', { chatId, userId });
          }
        });
      }
    });

    socket.on('typing:stop', async (data: { chatId: string }) => {
      const { chatId } = data;
      const chat = await Chat.findById(chatId);
      if (chat) {
        chat.participants.forEach((pId) => {
          if (pId.toString() !== userId) {
            io.to(pId.toString()).emit('typing:stop', { chatId, userId });
          }
        });
      }
    });

    // Event: Seen Receipts
    socket.on('message:seen', async (data: { messageId: string; chatId: string }) => {
      try {
        const { messageId, chatId } = data;

        // Upsert seen receipt
        await MessageReceipt.findOneAndUpdate(
          { messageId, userId },
          { status: 'seen' },
          { upsert: true }
        );

        // Fetch chat to get participants
        const chat = await Chat.findById(chatId);
        if (chat) {
          const participantIds = chat.participants.map(id => id.toString());
          participantIds.forEach((pId) => {
            io.to(pId).emit('message:seen', {
              messageId,
              userId,
              chatId,
            });
          });
        }
      } catch (err) {
        console.error('Error handling message:seen:', err);
      }
    });

    // Handle Disconnect
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      inactiveSockets.delete(socket.id);
      const userSockets = activeConnections.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeConnections.delete(userId);
          // Truly offline
          try {
            const now = new Date();
            await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: now });
            socket.broadcast.emit('user:status', {
              userId,
              status: 'offline',
              lastSeen: now,
            });
          } catch (err) {
            console.error('Error updating user presence on disconnect:', err);
          }
        }
      }
    });
  });
};
