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
    <div className="w-full h-9 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-4 select-none [-webkit-app-region:drag] shrink-0 z-50">
      <div className="flex items-center gap-2">
        <img src="/icon.png" className="w-4.5 h-4.5 object-contain" alt="Loop" />
        <span className="text-xs font-semibold text-zinc-300">Loop Chat</span>
      </div>
      
      {/* Draggable space spacer, keeping the top right clear for native Windows controls overlay */}
      <div className="w-36 h-full [-webkit-app-region:no-drag]" />
    </div>
  );
};

export default TitleBar;
