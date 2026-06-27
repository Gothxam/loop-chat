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
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 gap-4">
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
        <span className="text-xs text-zinc-500 font-semibold tracking-wider uppercase">Loading Chat...</span>
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
