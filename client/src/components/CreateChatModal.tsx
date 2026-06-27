'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquare, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { queryClient } from '@/lib/queryClient';

interface User {
  _id: string;
  name: string;
  email: string;
  username: string;
  photo?: string;
  status: 'online' | 'offline';
}

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateChatModal: React.FC<CreateChatModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuthStore();
  const { setActiveChatId } = useChatStore();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setUsers([]);
      return;
    }

    const fetchUsers = async () => {
      if (search.trim().length < 2) {
        setUsers([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users/search?q=${search}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        if (res.ok) {
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, isOpen, token]);

  const handleStartChat = async (userId: string) => {
    setCreating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'private',
          participantIds: [userId],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Refresh chats list query
        queryClient.invalidateQueries({ queryKey: ['chats'] });
        setActiveChatId(data.chat._id);
        onClose();
      }
    } catch (err) {
      console.error('Error creating chat:', err);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800/80">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-zinc-400" /> Start a Chat
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6">
          <div className="relative mb-6">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-550">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              placeholder="Search by name, email, or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 text-zinc-100 pl-11 pr-4 py-3 rounded-xl outline-none focus:border-zinc-700 transition-all placeholder-zinc-550"
              autoFocus
            />
          </div>

          {/* Results List */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
              </div>
            ) : users.length > 0 ? (
              users.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleStartChat(user._id)}
                  disabled={creating}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-850/40 hover:bg-zinc-900 hover:border-zinc-750 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center overflow-hidden shrink-0">
                      {user.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-zinc-300 font-semibold">{user.name.charAt(0)}</span>
                      )}
                      {/* Presence Indicator */}
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                          user.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-600'
                        }`}
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-white group-hover:text-zinc-200 transition-colors">
                        {user.name}
                      </p>
                      <p className="text-xs text-zinc-450">@{user.username} • {user.email}</p>
                    </div>
                  </div>
                  <UserPlus className="w-5 h-5 text-zinc-500 group-hover:text-zinc-350 transition-colors" />
                </button>
              ))
            ) : search.trim().length >= 2 ? (
              <p className="text-center text-slate-400 py-6 text-sm">No users found</p>
            ) : (
              <p className="text-center text-slate-500 py-6 text-sm">Type at least 2 characters to search</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
