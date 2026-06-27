'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Users, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { queryClient } from '@/lib/queryClient';

interface User {
  _id: string;
  name: string;
  email: string;
  username: string;
  photo?: string;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuthStore();
  const { setActiveChatId } = useChatStore();
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setGroupName('');
      setSearch('');
      setUsers([]);
      setSelectedIds([]);
      setError(null);
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

  const toggleSelectUser = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (selectedIds.length === 0) {
      setError('Please select at least one participant');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'group',
          name: groupName,
          participantIds: selectedIds,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['chats'] });
        setActiveChatId(data.chat._id);
        onClose();
      } else {
        setError(data.message || 'Failed to create group');
      }
    } catch (err) {
      console.error('Error creating group:', err);
      setError('Network error. Please try again.');
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
            <Users className="w-5 h-5 text-zinc-400" /> Create Group Chat
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-950/20 border border-red-500/25 text-red-200 p-3 rounded-xl text-xs">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Group Name */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              placeholder="e.g. Gaming Crew, Family Group"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 text-zinc-100 px-4 py-2.5 rounded-xl outline-none focus:border-zinc-700 transition-all placeholder-zinc-550"
              autoFocus
            />
          </div>
 
          {/* Search Participants */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Add Participants
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-550">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search by name, email, or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 text-zinc-100 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-zinc-700 transition-all placeholder-zinc-550"
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
              </div>
            ) : users.length > 0 ? (
              users.map((user) => {
                const isSelected = selectedIds.includes(user._id);
                return (
                  <button
                    type="button"
                    key={user._id}
                    onClick={() => toggleSelectUser(user._id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-zinc-800 border-zinc-700'
                        : 'bg-zinc-950/20 border-zinc-850/40 hover:bg-zinc-900/65'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center overflow-hidden shrink-0">
                        {user.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-zinc-300 font-semibold">{user.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white">{user.name}</p>
                        <p className="text-[10px] text-zinc-450">@{user.username}</p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                          : 'border-zinc-800 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            ) : search.trim().length >= 2 ? (
              <p className="text-center text-slate-500 py-4 text-xs">No users found</p>
            ) : (
              <p className="text-center text-slate-500 py-4 text-xs">Type to search and add members</p>
            )}
          </div>

          {/* Selected Count */}
          {selectedIds.length > 0 && (
            <div className="text-xs text-zinc-400">
              Selected: <span className="font-semibold text-zinc-200">{selectedIds.length}</span> participants
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={creating || !groupName.trim() || selectedIds.length === 0}
            className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.005] active:scale-[0.995]"
          >
            {creating ? (
              <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
            ) : (
              'Create Group'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
