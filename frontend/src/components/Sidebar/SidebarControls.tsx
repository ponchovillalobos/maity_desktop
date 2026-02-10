'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Mic, Square } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getVersion } from '@tauri-apps/api/app';
import Info from '@/components/shared/Info';

interface SidebarControlsProps {
  isRecording: boolean;
  isCollapsed: boolean;
  onRecordingToggle: () => void;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  isRecording,
  isCollapsed,
  onRecordingToggle,
}) => {
  const router = useRouter();
  const [version, setVersion] = useState('');

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion('0.2.3'));
  }, []);

  if (isCollapsed) return null;

  return (
    <div className="flex-shrink-0 p-2 border-t border-gray-100 dark:border-gray-700">
      <button
        onClick={onRecordingToggle}
        disabled={isRecording}
        aria-label={isRecording ? 'Grabación en progreso' : 'Iniciar grabación'}
        className={`w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white ${isRecording ? 'bg-primary/60 cursor-not-allowed' : 'bg-primary hover:bg-primary/80'} rounded-lg transition-colors shadow-sm`}
      >
        {isRecording ? (
          <>
            <Square className="w-4 h-4 mr-2" />
            <span>Grabación en progreso...</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-2" />
            <span>Iniciar Grabación</span>
          </>
        )}
      </button>

      <button
        onClick={() => router.push('/settings')}
        aria-label="Abrir configuración"
        className="w-full flex items-center justify-center px-3 py-1.5 mt-1 mb-1 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors shadow-sm"
      >
        <Settings className="w-4 h-4 mr-2" />
        <span>Configuración</span>
      </button>
      <Info isCollapsed={isCollapsed} />
      <div className="w-full flex items-center justify-center px-3 py-1 text-xs text-muted-foreground">
        {version ? `v${version}` : ''}
      </div>
    </div>
  );
};
