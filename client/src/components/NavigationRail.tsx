'use client';

import React from 'react';
import { Home, MessageSquare, Bell, Phone, Folder, Plus, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

interface NavigationRailProps {
  onOpenProfile: () => void;
  onOpenCreateChat: () => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  onOpenProfile,
  onOpenCreateChat,
}) => {
  const { user } = useAuthStore();

  return (
    <div className="w-16 h-full bg-[#08080a] border-r border-zinc-900 flex flex-col items-center py-4 justify-between shrink-0 select-none">
      {/* Top Brand Logo */}
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shadow-lg shadow-black/30 hover:scale-105 transition-all">
          <img src="/icon.png" className="w-6.5 h-6.5 object-contain" alt="Loop" />
        </div>

        {/* Navigation Icon Rail */}
        <div className="flex flex-col items-center gap-4 w-full px-2">
          {/* Home Icon (Selected) */}
          <button
            title="Home"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-cyan-950/20 text-cyan-400 border border-cyan-500/25 transition-all hover:scale-105"
          >
            <Home className="w-4.5 h-4.5" />
          </button>

          {/* Chat Icon */}
          <button
            title="Messages"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-all hover:scale-105"
          >
            <MessageSquare className="w-4.5 h-4.5" />
          </button>

          {/* Notifications Icon */}
          <button
            title="Notifications"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-all hover:scale-105"
          >
            <Bell className="w-4.5 h-4.5" />
          </button>

          {/* Calls Icon */}
          <button
            title="Calls"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-all hover:scale-105"
          >
            <Phone className="w-4.5 h-4.5" />
          </button>

          {/* Files Archive Icon */}
          <button
            title="Files Archive"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-all hover:scale-105"
          >
            <Folder className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Bottom Profile, Settings & Quick Actions */}
      <div className="flex flex-col items-center gap-4 w-full px-2">
        {/* Plus Button - Start New Chat */}
        <button
          onClick={onOpenCreateChat}
          title="Start New Chat"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/10 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenProfile}
          title="Settings"
          className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-all hover:scale-105"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>

        {/* Profile Avatar */}
        <div
          onClick={onOpenProfile}
          className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden cursor-pointer hover:border-purple-500/60 transition-colors shrink-0 shadow-md"
        >
          {user?.photo ? (
            <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-zinc-300 font-extrabold text-xs">{user?.name?.charAt(0)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationRail;
