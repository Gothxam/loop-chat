import { create } from 'zustand';

export interface ChatParticipant {
  _id: string;
  name: string;
  email: string;
  username: string;
  photo?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
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
  userStatuses: { [userId: string]: 'online' | 'away' | 'busy' | 'offline' };
  typingUsers: { [chatId: string]: string[] }; // chatId -> list of userIds typing
  setActiveChatId: (chatId: string | null) => void;
  setOnlineUsers: (userIds: string[]) => void;
  setUserStatus: (userId: string, status: 'online' | 'away' | 'busy' | 'offline') => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  clearTypingForChat: (chatId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeChatId: null,
  onlineUsers: [],
  userStatuses: {},
  typingUsers: {},
  
  setActiveChatId: (chatId) => set({ activeChatId: chatId }),
  
  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),

  setUserStatus: (userId, status) =>
    set((state) => ({
      userStatuses: {
        ...state.userStatuses,
        [userId]: status,
      },
      // Keep onlineUsers synced: if online/away/busy, they are technically online (not offline)
      onlineUsers: status !== 'offline'
        ? state.onlineUsers.includes(userId)
          ? state.onlineUsers
          : [...state.onlineUsers, userId]
        : state.onlineUsers.filter((id) => id !== userId),
    })),
  
  addOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.includes(userId)
        ? state.onlineUsers
        : [...state.onlineUsers, userId],
      userStatuses: {
        ...state.userStatuses,
        [userId]: state.userStatuses[userId] || 'online',
      },
    })),
    
  removeOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((id) => id !== userId),
      userStatuses: {
        ...state.userStatuses,
        [userId]: 'offline',
      },
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
