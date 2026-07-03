'use client';

// ============================================
// 考试倒计时组件
// ============================================

import { useState, useEffect, useCallback } from 'react';

interface ExamTimerProps {
  durationMinutes: number;        // 考试时长（分钟）
  onTimeUp: () => void;          // 时间耗尽回调
  isRunning: boolean;
  onTick?: (remainingSeconds: number) => void;
}

export default function ExamTimer({ durationMinutes, onTimeUp, isRunning, onTick }: ExamTimerProps) {
  const totalSeconds = durationMinutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!isRunning || isExpired) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        onTick?.(next);

        if (next <= 0) {
          clearInterval(interval);
          setIsExpired(true);
          onTimeUp();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isExpired, onTimeUp, onTick]);

  // 重置
  useEffect(() => {
    setRemaining(totalSeconds);
    setIsExpired(false);
  }, [totalSeconds]);

  const formatTime = useCallback((seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  const isWarning = remaining <= 300; // 5分钟警告

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold transition-colors ${
        isWarning
          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse-soft'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
      }`}
    >
      <span>⏱️</span>
      <span>{formatTime(remaining)}</span>
    </div>
  );
}
