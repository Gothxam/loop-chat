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
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore, Message } from '@/store/useChatStore';
import { getSocket } from '@/lib/socket';
import { queryClient } from '@/lib/queryClient';

import EmojiPicker, { Theme } from 'emoji-picker-react';

const emojis = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🙏'];

export const ChatArea: React.FC = () => {
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
      <div className="hidden md:flex flex-1 h-full flex-col items-center justify-center bg-zinc-950 text-zinc-500">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 mb-6 shadow-xl">
          <span className="text-zinc-100 font-extrabold text-4xl tracking-wider select-none">L</span>
        </div>
        <h3 className="text-lg font-bold text-zinc-300 mb-1">Your Loop Messaging Hub</h3>
        <p className="text-sm text-zinc-550 max-w-sm text-center">
          Select a conversation from the sidebar or start a new direct/group chat to coordinate in real-time.
        </p>
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
      <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/20">
        <div className="flex items-center gap-3">
          {/* Back Button for mobile view */}
          <button
            onClick={() => setActiveChatId(null)}
            className="md:hidden p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-100 transition-all mr-1 shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {chatTitle}
              {activeChat?.type === 'private' && (
                <span className={`w-2 h-2 rounded-full ${isChatOnline ? 'bg-emerald-500' : 'bg-zinc-650'}`} />
              )}
            </h3>
            <p className="text-[10px] text-zinc-400 capitalize">{statusText}</p>
          </div>
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="w-8 h-8 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
            <span className="text-xs text-zinc-500">Loading messages...</span>
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => {
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
                className={`flex gap-3 max-w-[70%] group relative ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                    {sender.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sender.photo} alt={sender.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-zinc-300">{sender.name.charAt(0)}</span>
                    )}
                  </div>
                )}

                {/* Message Box */}
                <div className="space-y-1">
                  {/* Sender Name */}
                  {!isMe && activeChat?.type === 'group' && (
                    <span className="text-[9px] font-bold text-zinc-300 block px-1">{sender.name}</span>
                  )}

                  {/* Reply Reference */}
                  {msg.replyTo && (
                    <div className={`p-2 rounded-xl text-xs border bg-zinc-950/80 mb-1 border-zinc-850/60 ${isMe ? 'text-right' : 'text-left'}`}>
                      <p className="font-bold text-[9px] text-zinc-400">Replying to {msg.replyTo.senderId?.name || 'User'}</p>
                      <p className="text-zinc-400 truncate text-[10px]">{msg.replyTo.message}</p>
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={`p-3 rounded-2xl border text-xs leading-relaxed transition-all shadow-sm relative ${
                      isMe
                        ? 'bg-zinc-100 border-zinc-200 text-zinc-950 rounded-tr-none font-medium'
                        : 'bg-zinc-900 border-zinc-850 text-zinc-100 rounded-tl-none'
                    }`}
                  >
                    {/* Inline File attachment */}
                    {msg.fileUrl && (
                      <div className="mb-2">
                        {msg.fileType === 'image' && (
                          // eslint-disable-next-line @next/next/no-img-element
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
                              <span className="text-[8px] text-zinc-500">Download Document</span>
                            </div>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Text Body */}
                    {(!msg.fileUrl || msg.fileType !== 'document') && (
                      <p className="whitespace-pre-line">{msg.message}</p>
                    )}

                    {/* Footer receipt indicators & timestamp */}
                    <div className={`flex items-center justify-end gap-1 mt-1.5 text-[8px] ${isMe ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <span>
                          {msg.receipts?.some((r) => r.status === 'seen') ? (
                            <CheckCheck className="w-3 h-3 text-blue-600 font-bold" />
                          ) : (
                            <Check className="w-3 h-3 text-zinc-400" />
                          )}
                        </span>
                      )}
                    </div>
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
              </div>
            );
          })
        ) : (
          <div className="text-center text-zinc-500 py-10 text-xs">No messages yet. Send a message to start!</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator Display */}
      {typers.length > 0 && (
        <div className="px-6 py-1.5 text-[10px] text-zinc-400 italic flex items-center gap-1">
          <span>{typingDisplay} is typing</span>
          <div className="flex gap-0.5 items-center">
            <span className="w-1 h-1 bg-zinc-400 rounded-full typing-dot" />
            <span className="w-1 h-1 bg-zinc-400 rounded-full typing-dot" />
            <span className="w-1 h-1 bg-zinc-400 rounded-full typing-dot" />
          </div>
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
      <div className="p-4 border-t border-zinc-900 bg-zinc-950/10">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="flex gap-1.5 text-zinc-400 relative">
            <button
              type="button"
              onClick={handleFileClick}
              disabled={uploading}
              className="p-2 hover:bg-zinc-800/80 hover:text-zinc-100 rounded-xl transition-all"
            >
              {uploading ? (
                <div className="w-4 h-4 border border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 hover:bg-zinc-800/80 hover:text-zinc-100 rounded-xl transition-all ${
                showEmojiPicker ? 'text-zinc-100 bg-zinc-800' : ''
              }`}
            >
              <Smile className="w-4 h-4" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-3 z-50 shadow-2xl rounded-2xl overflow-hidden border border-zinc-850">
                <EmojiPicker
                  theme={Theme.DARK}
                  onEmojiClick={(emojiData) => insertEmoji(emojiData.emoji)}
                  width={320}
                  height={380}
                />
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              placeholder="Write a message... (Shift+Enter for newline)"
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              className="w-full bg-zinc-950 border border-zinc-850 text-xs text-zinc-100 pl-4 pr-10 py-3 rounded-2xl outline-none focus:border-zinc-700 transition-all placeholder-zinc-550 resize-none max-h-24 scrollbar-none"
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
