'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogOut, User, Users, Plus, MessageSquarePlus, Search, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { CreateChatModal } from './CreateChatModal';
import { CreateGroupModal } from './CreateGroupModal';
import { ProfileModal } from './ProfileModal';

export const Sidebar: React.FC = () => {
  const { user, token, clearAuth } = useAuthStore();
  const { activeChatId, setActiveChatId, onlineUsers } = useChatStore();
  const [filter, setFilter] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Fetch chats list using React Query
  const { data, isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch chats');
      return res.json();
    },
    enabled: !!token,
  });

  const chats = data?.chats || [];

  const handleLogout = () => {
    clearAuth();
  };

  const handleSelectChat = async (chatId: string) => {
    setActiveChatId(chatId);
    // Mark as read
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chats/${chatId}/read`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Filter chats by search
  const filteredChats = chats.filter((chat: any) => {
    if (chat.type === 'group') {
      return chat.name?.toLowerCase().includes(filter.toLowerCase());
    } else {
      const otherParticipant = chat.participants.find((p: any) => p._id !== user?._id);
      return otherParticipant?.name?.toLowerCase().includes(filter.toLowerCase());
    }
  });

  return (
    <div className={`w-full md:w-80 h-full bg-zinc-950 border-r border-zinc-900 flex flex-col shrink-0 ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            onClick={() => setIsProfileOpen(true)}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center overflow-hidden cursor-pointer hover:border-purple-500/60 transition-colors shrink-0"
          >
            {user?.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-zinc-300 font-semibold">{user?.name?.charAt(0)}</span>
            )}
          </div>
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold text-zinc-100 truncate">{user?.name}</h2>
            <p className="text-[10px] text-zinc-400 truncate">@{user?.username}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-zinc-400">
          <button
            onClick={() => setIsChatOpen(true)}
            title="New Direct Message"
            className="p-2 hover:bg-zinc-900 rounded-lg hover:text-zinc-100 transition-all"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsGroupOpen(true)}
            title="New Group Chat"
            className="p-2 hover:bg-zinc-900 rounded-lg hover:text-zinc-100 transition-all"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsProfileOpen(true)}
            title="Profile Settings"
            className="p-2 hover:bg-zinc-900 rounded-lg hover:text-zinc-100 transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 hover:bg-red-950/20 rounded-lg hover:text-red-450 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-550">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search conversations..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-850 text-xs text-zinc-100 pl-9 pr-3 py-2 rounded-xl outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder-zinc-550"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <div className="w-6 h-6 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
            <span className="text-[10px] text-zinc-500">Loading chats...</span>
          </div>
        ) : filteredChats.length > 0 ? (
          filteredChats.map((chat: any) => {
            const isActive = chat._id === activeChatId;
            let chatName = chat.name || 'Group Chat';
            let chatPhoto = '';
            let isOnline = false;

            if (chat.type === 'private') {
              const otherParticipant = chat.participants.find((p: any) => p._id !== user?._id);
              chatName = otherParticipant?.name || 'Deleted User';
              chatPhoto = otherParticipant?.photo || '';
              // Determine presence status in real-time
              isOnline = otherParticipant ? onlineUsers.includes(otherParticipant._id) || otherParticipant.status === 'online' : false;
            }

            // Text Preview formatting
            let lastMsgText = 'No messages yet';
            if (chat.lastMessage) {
              const sender = chat.lastMessage.senderId._id === user?._id ? 'You: ' : '';
              if (chat.lastMessage.fileUrl) {
                lastMsgText = `${sender}📎 [File]`;
              } else {
                lastMsgText = `${sender}${chat.lastMessage.message}`;
              }
            }

            return (
              <button
                key={chat._id}
                onClick={() => handleSelectChat(chat._id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left border transition-all ${
                  isActive
                    ? 'bg-zinc-900 border-zinc-800/80 border-l-2 border-l-purple-500 text-white pl-[10px]'
                    : 'bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-300'
                }`}
              >
                {/* Chat Avatar */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                    {chatPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={chatPhoto} alt={chatName} className="w-full h-full object-cover" />
                    ) : chat.type === 'group' ? (
                      <Users className="w-5 h-5 text-slate-400" />
                    ) : (
                      <span className="font-semibold text-slate-300">{chatName.charAt(0)}</span>
                    )}
                  </div>
                  {/* Status indicator for private chats */}
                  {chat.type === 'private' && (
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                        isOnline ? 'bg-emerald-500' : 'bg-zinc-600'
                      }`}
                    />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="text-xs font-bold text-white truncate">{chatName}</h4>
                    {chat.lastMessage && (
                      <span className="text-[9px] text-slate-500">
                        {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate pr-2">{lastMsgText}</p>
                </div>

                {/* Unread badge */}
                {chat.unreadCount > 0 && !isActive && (
                  <span className="flex items-center justify-center min-w-5 h-5 bg-gradient-to-tr from-purple-600 to-cyan-500 text-white font-extrabold text-[9px] rounded-full px-1.5 shadow-md">
                    {chat.unreadCount}
                  </span>
                )}
              </button>
            );
          })
        ) : (
          <div className="text-center text-slate-500 py-10 text-xs">
            {filter ? 'No conversations found' : 'No active chats. Start one below!'}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <CreateGroupModal isOpen={isGroupOpen} onClose={() => setIsGroupOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
};
