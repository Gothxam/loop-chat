'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { NavigationRail } from '@/components/NavigationRail';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { CreateChatModal } from '@/components/CreateChatModal';
import { CreateGroupModal } from '@/components/CreateGroupModal';
import { ProfileModal } from '@/components/ProfileModal';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { activeChatId } = useChatStore();
  const [mounted, setMounted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#070709] select-none gap-6 relative overflow-hidden">
        {/* Ambient radial blur glow behind logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-to-tr from-purple-600/5 via-blue-600/3 to-cyan-500/5 blur-3xl rounded-full pointer-events-none" />

        {/* Breath-pulsing logo image */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <img src="/icon.png" className="w-16 h-16 object-contain animate-[pulse_2s_infinite] transition-all" alt="Loop" />
        </div>

        {/* Minimalist Progress Loader */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-32 h-[3px] bg-zinc-900 rounded-full overflow-hidden">
            <div className="progress-bar-sweep rounded-full" />
          </div>
          <span className="text-[9px] text-zinc-500 font-bold tracking-[0.25em] uppercase mt-2">
            Loading Loop
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#070709] text-zinc-100">
      {/* Workspace content wrapper */}
      <div className="flex-1 flex h-full relative z-10">
        {/* Leftmost Navigation Rail */}
        <div className="hidden md:flex h-full shrink-0">
          <NavigationRail
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenCreateChat={() => setIsChatOpen(true)}
          />
        </div>

        {/* Messages list sidebar */}
        <Sidebar
          onOpenCreateChat={() => setIsChatOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />

        {/* Chat Feed Area */}
        <ChatArea
          onOpenCreateChat={() => setIsChatOpen(true)}
          onOpenCreateGroup={() => setIsGroupOpen(true)}
        />
      </div>

      {/* Modals Container */}
      <CreateChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <CreateGroupModal isOpen={isGroupOpen} onClose={() => setIsGroupOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}
