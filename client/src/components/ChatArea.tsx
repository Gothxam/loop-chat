'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  CornerUpLeft,
  Trash2,
  Edit3,
  X,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Check,
  CheckCheck,
  ChevronLeft,
  Users,
  Phone,
  Video,
  Info,
  Globe,
  Network,
  AtSign,
  Lock,
  MessageSquarePlus,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore, Message } from '@/store/useChatStore';
import { getSocket } from '@/lib/socket';
import { queryClient } from '@/lib/queryClient';

import EmojiPicker, { Theme } from 'emoji-picker-react';

const emojis = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🙏'];

interface ChatAreaProps {
  onOpenCreateChat: () => void;
  onOpenCreateGroup?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onOpenCreateChat, onOpenCreateGroup }) => {
  const { user, token } = useAuthStore();
  const { activeChatId, setActiveChatId, typingUsers } = useChatStore();
  
  const [inputText, setInputText] = useState('');
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Helper to insert emoji at the current cursor position
  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      setInputText(before + emoji + after);
      
      // Reset cursor position to right after the emoji
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
      }, 0);
    } else {
      setInputText((prev) => prev + emoji);
    }
  };

  // Fetch active chat details (includes participants)
  const { data: chatsData } = useQuery({
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

  const activeChat = (chatsData as any)?.chats?.find((c: any) => c._id === activeChatId);

  // Fetch chat messages
  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', activeChatId],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chats/${activeChatId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: !!activeChatId && !!token,
  });

  const messages: Message[] = messagesData?.messages || [];

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Emit seen receipts for all unread messages
    const socket = getSocket();
    if (socket && activeChatId && messages.length > 0 && user) {
      const unreadMessages = messages.filter(
        (m) =>
          m.senderId !== user._id &&
          typeof m.senderId === 'object' &&
          m.senderId._id !== user._id &&
          !m.receipts.some((r) => r.userId === user._id && r.status === 'seen')
      );

      unreadMessages.forEach((msg) => {
        socket.emit('message:seen', { messageId: msg._id, chatId: activeChatId });
      });
    }
  }, [messages, activeChatId, user]);

  // Handle local typing indicator logic
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    const socket = getSocket();
    if (!socket || !activeChatId) return;

    if (!isTypingLocal) {
      setIsTypingLocal(true);
      socket.emit('typing:start', { chatId: activeChatId });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingLocal(false);
      socket.emit('typing:stop', { chatId: activeChatId });
    }, 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const socket = getSocket();
    if (!socket || !activeChatId) return;

    // Send typing stop immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTypingLocal(false);
    socket.emit('typing:stop', { chatId: activeChatId });

    socket.emit('message:send', {
      chatId: activeChatId,
      message: inputText.trim(),
      replyTo: replyingTo?._id,
    });

    setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        // Send file details via socket
        const socket = getSocket();
        if (socket && activeChatId) {
          socket.emit('message:send', {
            chatId: activeChatId,
            fileUrl: data.fileUrl,
            fileType: data.fileType,
            message: data.originalName,
          });
        }
      }
    } catch (err) {
      console.error('Error uploading attachment:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleEditMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessage || !editText.trim()) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('message:edit', {
        messageId: editingMessage._id,
        newMessage: editText.trim(),
      });
    }
    setEditingMessage(null);
    setEditText('');
  };

  const handleDeleteMessage = (messageId: string) => {
    const socket = getSocket();
    if (socket && confirm('Delete this message for everyone?')) {
      socket.emit('message:delete_everyone', { messageId });
      setActiveMenuId(null);
    }
  };

  const handleReact = (messageId: string, emoji: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('message:react', { messageId, emoji });
    }
    setActiveMenuId(null);
  };

  if (!activeChatId) {
    return (
      <div className="hidden md:flex flex-1 h-full flex-col items-center justify-center bg-zinc-950 px-8 text-center select-none relative overflow-hidden">
        {/* Deep background ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-purple-600/5 via-blue-600/3 to-cyan-500/5 blur-3xl rounded-full pointer-events-none" />

        {/* Brand Infinity Logo */}
        <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/10 via-blue-600/5 to-cyan-500/10 blur-2xl rounded-full" />
          <img src="/icon.png" className="relative w-24 h-24 object-contain animate-pulse" alt="Loop Logo" />
        </div>

        {/* Welcome Titles */}
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Welcome to Loop Chat</h1>
        <p className="text-xs text-zinc-400 max-w-lg mb-8 leading-relaxed">
          Send and receive messages, media files, and voice notes securely. Keep your personal and group conversations flowing in real-time.
        </p>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-4 mb-12 relative z-10">
          <button
            onClick={onOpenCreateChat}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/15 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Start New Chat
          </button>
          <button
            onClick={onOpenCreateGroup}
            className="flex items-center gap-2 px-5 py-2.5 border border-zinc-800 hover:bg-zinc-900/40 text-zinc-300 font-semibold text-xs rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Users className="w-4 h-4" />
            Create New Group
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full relative z-10">
          {/* Card 1 */}
          <div className="panel-card p-5 rounded-2xl text-left hover:border-cyan-500/20 transition-all group">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-105 transition-transform">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-bold text-zinc-200">Direct Messages</h3>
              <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Private</span>
            </div>
            <p className="text-[10px] text-zinc-450 leading-relaxed">
              Chat privately with friends and family in real-time with instant typing sync.
            </p>
          </div>

          {/* Card 2 */}
          <div className="panel-card p-5 rounded-2xl text-left hover:border-purple-500/20 transition-all group">
            <div className="w-8 h-8 rounded-lg bg-purple-950/20 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-bold text-zinc-200">Group Chats</h3>
              <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">Coordinated</span>
            </div>
            <p className="text-[10px] text-zinc-450 leading-relaxed">
              Create groups to coordinate plans, share updates, and stay in touch with everyone.
            </p>
          </div>

          {/* Card 3 */}
          <div className="panel-card p-5 rounded-2xl text-left hover:border-blue-500/20 transition-all group">
            <div className="w-8 h-8 rounded-lg bg-blue-950/20 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-105 transition-transform">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-bold text-zinc-200">Secure Sharing</h3>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Encrypted</span>
            </div>
            <p className="text-[10px] text-zinc-450 leading-relaxed">
              Send photos, videos, files, and documents safely with end-to-end security.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active chat titles
  let chatTitle = 'Chat';
  let isChatOnline = false;
  let statusText = '';
  
  if (activeChat) {
    if (activeChat.type === 'private') {
      const otherParticipant = activeChat.participants.find((p: any) => p._id !== user?._id);
      chatTitle = otherParticipant?.name || 'User';
      // Real-time status check
      isChatOnline = otherParticipant ? useChatStore.getState().onlineUsers.includes(otherParticipant._id) || otherParticipant.status === 'online' : false;
      statusText = isChatOnline ? 'online' : 'offline';
    } else {
      chatTitle = activeChat.name || 'Group Chat';
      statusText = `${activeChat.participants.length} members`;
    }
  }

  // Filter typing status
  const typers = typingUsers[activeChatId] || [];
  const typingDisplay = typers
    .map((id) => activeChat?.participants.find((p: any) => p._id === id)?.name || 'Someone')
    .join(', ');

  return (
    <div className={`flex-1 h-full flex flex-col bg-zinc-950 ${activeChatId ? 'flex' : 'hidden md:flex'}`}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-6 py-3 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          {/* Back Button for mobile view */}
          <button
            onClick={() => setActiveChatId(null)}
            className="md:hidden p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-100 transition-all mr-1 shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* User Profile Avatar */}
          <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
            {activeChat?.type === 'private' ? (
              (() => {
                const otherParticipant = activeChat.participants.find((p: any) => p._id !== user?._id);
                return otherParticipant?.photo ? (
                  <img src={otherParticipant.photo} alt={chatTitle} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-zinc-300 font-extrabold text-xs">{chatTitle.charAt(0)}</span>
                );
              })()
            ) : (
              <Users className="w-4.5 h-4.5 text-zinc-400" />
            )}
          </div>

          <div>
            <h3 className="text-xs font-bold text-white tracking-tight">
              {chatTitle}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {activeChat?.type === 'private' ? (
                <>
                  <span className={`w-1.5 h-1.5 rounded-full ${isChatOnline ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-650'}`} />
                  <span className={`text-[8px] font-bold tracking-widest uppercase ${isChatOnline ? 'text-cyan-400' : 'text-zinc-500'}`}>
                    {isChatOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </>
              ) : (
                <span className="text-[9px] text-zinc-400 font-medium">{statusText}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Buttons */}
        <div className="flex items-center gap-1.5 text-zinc-450">
          <button className="p-2 hover:bg-zinc-900 rounded-lg hover:text-zinc-100 transition-all cursor-pointer">
            <Phone className="w-4.5 h-4.5" />
          </button>
          <button className="p-2 hover:bg-zinc-900 rounded-lg hover:text-zinc-100 transition-all cursor-pointer">
            <Video className="w-4.5 h-4.5" />
          </button>
          <button className="p-2 hover:bg-zinc-900 rounded-lg hover:text-zinc-100 transition-all cursor-pointer">
            <Info className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        {loadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="w-8 h-8 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
            <span className="text-xs text-zinc-500">Loading messages...</span>
          </div>
        ) : messages.length > 0 ? (
          <div className="mt-auto space-y-4 flex flex-col">
            {messages.map((msg) => {
              const sender = typeof msg.senderId === 'object' ? msg.senderId : { _id: msg.senderId, name: 'User', photo: '' };
              const isMe = sender._id === user?._id;
              const hasReactions = msg.reactions && msg.reactions.length > 0;

            return (
              <div
                key={msg._id}
                onMouseEnter={() => setHoveredMessageId(msg._id)}
                onMouseLeave={() => {
                  setHoveredMessageId(null);
                  setActiveMenuId(null);
                }}
                className={`flex items-end gap-2.5 max-w-[85%] group relative ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 mb-1 shadow-sm">
                    {sender.photo ? (
                      <img src={sender.photo} alt={sender.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-zinc-300">{sender.name.charAt(0)}</span>
                    )}
                  </div>
                )}

                {/* Message Box */}
                <div className="space-y-1 max-w-[70%]">
                  {/* Sender Name */}
                  {!isMe && activeChat?.type === 'group' && (
                    <span className="text-[9px] font-bold text-zinc-400 block px-1">{sender.name}</span>
                  )}

                  {/* Reply Reference */}
                  {msg.replyTo && (
                    <div className={`p-2 rounded-xl text-xs border bg-zinc-950/80 mb-1 border-zinc-850/60 ${isMe ? 'text-right' : 'text-left'}`}>
                      <p className="font-bold text-[9px] text-zinc-450">Replying to {msg.replyTo.senderId?.name || 'User'}</p>
                      <p className="text-zinc-400 truncate text-[10px]">{msg.replyTo.message}</p>
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed transition-all shadow-sm relative ${
                      isMe
                        ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-teal-950 rounded-tr-none font-semibold shadow-md shadow-cyan-500/5'
                        : 'bg-[#161619]/60 border border-zinc-800/80 text-zinc-100 rounded-tl-none backdrop-blur-sm'
                    }`}
                  >
                    {/* Inline File attachment */}
                    {msg.fileUrl && (
                      <div className="mb-2">
                        {msg.fileType === 'image' && (
                          <img
                            src={msg.fileUrl}
                            alt="Attachment"
                            className="max-w-full max-h-48 rounded-xl object-contain cursor-pointer hover:opacity-90 transition-all border border-white/5"
                            onClick={() => window.open(msg.fileUrl, '_blank')}
                          />
                        )}
                        {msg.fileType === 'video' && (
                          <video src={msg.fileUrl} controls className="max-w-full max-h-48 rounded-xl border border-white/5" />
                        )}
                        {msg.fileType === 'voice' && (
                          <audio src={msg.fileUrl} controls className="w-48 max-w-full" />
                        )}
                        {msg.fileType === 'document' && (
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 p-2.5 bg-zinc-950/80 border border-zinc-850 hover:border-zinc-700 rounded-xl transition-all font-semibold"
                          >
                            <FileText className="w-5 h-5 text-zinc-400" />
                            <div className="min-w-0">
                              <p className="truncate text-[10px] max-w-[150px] text-zinc-100">{msg.message}</p>
                              <span className="text-[8px] text-zinc-550">Download Document</span>
                            </div>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Text Body */}
                    {(!msg.fileUrl || msg.fileType !== 'document') && (
                      <p className="whitespace-pre-line">{msg.message}</p>
                    )}
                  </div>

                  {/* Reaction Badges */}
                  {hasReactions && (
                    <div className={`flex gap-1.5 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {msg.reactions.map((r, i) => (
                        <span
                          key={i}
                          className="bg-zinc-900 border border-zinc-800/80 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm"
                        >
                          {r.emoji}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* External Timestamp */}
                <div className="flex items-center gap-1 text-[8px] text-zinc-550 select-none mb-1 shrink-0 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && (
                    <span>
                      {msg.receipts?.some((r) => r.status === 'seen') ? (
                        <CheckCheck className="w-3 h-3 text-cyan-400 font-bold" />
                      ) : (
                        <Check className="w-3 h-3 text-zinc-650" />
                      )}
                    </span>
                  )}
                </div>

                {/* Message Action Bar (Hover Menu) */}
                {hoveredMessageId === msg._id && msg.message !== 'This message was deleted' && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 z-20 bg-zinc-900 border border-zinc-850 flex items-center p-1 rounded-xl shadow-lg gap-1 ${
                      isMe ? 'right-full mr-2' : 'left-full ml-2'
                    }`}
                  >
                    {/* Emoji Reaction List */}
                    <div className="flex items-center border-r border-zinc-800 pr-1 gap-0.5">
                      {emojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReact(msg._id, emoji)}
                          className="hover:scale-125 transition-transform p-0.5"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
 
                    {/* Quick actions */}
                    <button
                      onClick={() => setReplyingTo(msg)}
                      title="Reply"
                      className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-all"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>
 
                    {isMe && (
                      <>
                        <button
                          onClick={() => {
                            setEditingMessage(msg);
                            setEditText(msg.message || '');
                          }}
                          title="Edit"
                          className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(msg._id)}
                          title="Delete for Everyone"
                          className="p-1 hover:bg-red-950/20 rounded-lg text-zinc-400 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-zinc-500 py-10 mt-auto text-xs">No messages yet. Send a message to start!</div>
      )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator Display */}
      {typers.length > 0 && (
        <div className="absolute bottom-24 right-6 z-20 flex items-center gap-2 bg-[#121215]/90 border border-zinc-800/80 px-3 py-1.5 rounded-full shadow-lg animate-slide-up backdrop-blur-md">
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping shrink-0" />
          <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest leading-none">
            {typingDisplay.toUpperCase()} IS TYPING...
          </span>
        </div>
      )}

      {/* Edit Message overlay panel */}
      {editingMessage && (
        <form onSubmit={handleEditMessage} className="px-6 py-3 border-t border-zinc-900 bg-zinc-950/80 flex items-center justify-between gap-3 animate-slide-up">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider mb-1">Edit Message</p>
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 text-xs text-zinc-100 px-3 py-2 rounded-xl outline-none"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-3.5 py-1.5 text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold rounded-lg transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingMessage(null)}
              className="px-3.5 py-1.5 text-[10px] bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-100 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Replying Preview Box */}
      {replyingTo && (
        <div className="px-6 py-2 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-zinc-400">Replying to {(replyingTo.senderId as any)?.name || 'User'}</p>
            <p className="text-zinc-400 text-[10px] truncate">{replyingTo.message}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-zinc-400 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom Panel (Chat Input Panel) */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950/25 relative z-10">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex flex-col gap-2">
          {/* Pill Input Container */}
          <div className="w-full bg-[#111114] border border-zinc-850 rounded-2xl p-2 flex items-center gap-3 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={handleFileClick}
              disabled={uploading}
              className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer shrink-0"
              title="Attach File"
            >
              {uploading ? (
                <div className="w-4.5 h-4.5 border border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
              ) : (
                <Paperclip className="w-4.5 h-4.5" />
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Emoji Button */}
            <div className="relative shrink-0 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer ${
                  showEmojiPicker ? 'text-zinc-100 bg-zinc-900' : ''
                }`}
                title="Emojis"
              >
                <Smile className="w-4.5 h-4.5" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 z-50">
                  <EmojiPicker
                    theme={Theme.DARK}
                    onEmojiClick={(emojiData) => insertEmoji(emojiData.emoji)}
                    width={300}
                    height={360}
                  />
                </div>
              )}
            </div>

            {/* Textarea Input */}
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                placeholder="Type a message..."
                rows={1}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                className="w-full bg-transparent text-xs text-zinc-100 outline-none placeholder-zinc-550 resize-none max-h-20 py-1.5 scrollbar-none"
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-9 h-9 flex items-center justify-center bg-gradient-to-tr from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-md shadow-purple-600/10 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Info Keyboard Shortcuts */}
          <div className="flex items-center gap-4 px-2 text-[9px] text-zinc-550 select-none">
            <button
              type="button"
              onClick={handleFileClick}
              className="hover:text-zinc-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>📎 ATTACH FILE (⌘+U)</span>
            </button>
            <span className="text-zinc-700">•</span>
            <button
              type="button"
              className="hover:text-zinc-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>🎙️ VOICE MESSAGE (⌘+H)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
