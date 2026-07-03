'use client';

// ============================================
// 全局状态 + 设备ID管理
// ============================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProgress, DEFAULT_PROGRESS } from '@/lib/types';
import { loadProgress, saveProgress, checkAndResetDaily } from '@/lib/storage';

function generateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem('neural_device_id');
  if (stored) return stored;
  const id = 'dev_' + crypto.randomUUID();
  localStorage.setItem('neural_device_id', id);
  return id;
}

interface AppContextType {
  progress: UserProgress;
  updateProgress: (partial: Partial<UserProgress>) => void;
  deviceId: string;
}

const AppContext = createContext<AppContextType>({
  progress: DEFAULT_PROGRESS,
  updateProgress: () => {},
  deviceId: '',
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    setDeviceId(generateDeviceId());
    const saved = checkAndResetDaily();
    setProgress(saved);
  }, []);

  const updateProgress = useCallback((partial: Partial<UserProgress>) => {
    setProgress((prev) => {
      const next = { ...prev, ...partial };
      saveProgress(next);
      return next;
    });
  }, []);

  return (
    <AppContext.Provider value={{ progress, updateProgress, deviceId }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
