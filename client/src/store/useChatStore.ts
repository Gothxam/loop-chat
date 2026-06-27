import { create } from 'zustand';

export interface ChatParticipant {
  _id: string;
  name: string;
  email: string;
  username: string;
  photo?: string;
  status: 'online' | 'offline';
  lastSeen: string;
}

export interface MessageReceipt {
  messageId: string;
  userId: string | { _id: string; name: string; photo?: string };
  status: 'delivered' | 'seen';
  updatedAt: string;
}

export interface Message {
  _id: string;
  chatId: string;
  senderId: string | { _id: string; name: string; photo?: string; username?: string };
  message?: string;
  fileUrl?: string;
  fileType?: 'image' | 'video' | 'document' | 'voice';
  reactions: Array<{ userId: string; emoji: string }>;
  replyTo?: { _id: string; message?: string; senderId: { _id: string; name: string } };
  receipts: MessageReceipt[];
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  _id: string;
  type: 'private' | 'group';
  name?: string;
  participants: ChatParticipant[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  activeChatId: string | null;
  onlineUsers: string[];
  typingUsers: { [chatId: string]: string[] }; // chatId -> list of userIds typing
  setActiveChatId: (chatId: string | null) => void;
  setOnlineUsers: (userIds: string[]) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  clearTypingForChat: (chatId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeChatId: null,
  onlineUsers: [],
  typingUsers: {},
  
  setActiveChatId: (chatId) => set({ activeChatId: chatId }),
  
  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),
  
  addOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.includes(userId)
        ? state.onlineUsers
        : [...state.onlineUsers, userId],
    })),
    
  removeOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((id) => id !== userId),
    })),
    
  setTyping: (chatId, userId, isTyping) =>
    set((state) => {
      const chatTyping = state.typingUsers[chatId] || [];
      const updated = isTyping
        ? chatTyping.includes(userId)
          ? chatTyping
          : [...chatTyping, userId]
        : chatTyping.filter((id) => id !== userId);
        
      return {
        typingUsers: {
          ...state.typingUsers,
          [chatId]: updated,
        },
      };
    }),
    
  clearTypingForChat: (chatId) =>
    set((state) => {
      const updated = { ...state.typingUsers };
      delete updated[chatId];
      return { typingUsers: updated };
    }),
}));
