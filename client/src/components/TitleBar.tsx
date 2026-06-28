'use client';

import React, { useEffect, useState } from 'react';

export const TitleBar: React.FC = () => {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Only mount in Electron environment
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      setIsElectron(true);
    }
  }, []);

  if (!isElectron) return null;

  return (
    <div className="w-full flex flex-col shrink-0 z-50 select-none">
      {/* Sleek top-border brand gradient accent line */}
      <div className="w-full h-[2px] bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500" />
      <div className="w-full h-8.5 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-4 [-webkit-app-region:drag]">
        <div className="flex items-center gap-2">
          <img src="/icon.png" className="w-4 h-4 object-contain" alt="Loop" />
          <span className="text-[11px] font-semibold text-zinc-300">Loop Chat</span>
        </div>
        
        {/* Draggable space spacer, keeping the top right clear for native Windows controls overlay */}
        <div className="w-36 h-full [-webkit-app-region:no-drag]" />
      </div>
    </div>
  );
};

export default TitleBar;
