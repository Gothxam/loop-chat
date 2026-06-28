'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 gap-4 select-none">
        {/* Animated Glow Logo Container */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Outer rotating color halo matching brand colors (Purple to Cyan) */}
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 via-blue-600 to-cyan-500 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="absolute inset-0 w-24 h-24 border-2 border-dashed border-cyan-500/20 rounded-full animate-spin [animation-duration:8s]" />
          <div className="absolute inset-2 w-20 h-20 border border-dotted border-purple-500/10 rounded-full animate-spin [animation-duration:12s] [animation-direction:reverse]" />
          
          {/* Pulsating logo image */}
          <img src="/icon.png" className="relative w-14 h-14 object-contain animate-bounce [animation-duration:3s]" alt="Loop" />
        </div>
        <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mt-4 animate-pulse">Initializing Loop...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Workspace content wrapper */}
      <div className="flex-1 flex h-full relative z-10">
        <Sidebar />
        <ChatArea />
      </div>
    </div>
  );
}
