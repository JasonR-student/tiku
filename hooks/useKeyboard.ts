'use client';

// ============================================
// useKeyboard - 键盘快捷键Hook
// 支持数字键1-4选择、回车提交、方向键切换
// ============================================

import { useEffect, useCallback } from 'react';

interface KeyboardConfig {
  onKey1?: () => void;
  onKey2?: () => void;
  onKey3?: () => void;
  onKey4?: () => void;
  onEnter?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  enabled?: boolean;
}

export function useKeyboard(config: KeyboardConfig) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 如果焦点在输入框内，不处理快捷键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      switch (e.key) {
        case '1':
          e.preventDefault();
          config.onKey1?.();
          break;
        case '2':
          e.preventDefault();
          config.onKey2?.();
          break;
        case '3':
          e.preventDefault();
          config.onKey3?.();
          break;
        case '4':
          e.preventDefault();
          config.onKey4?.();
          break;
        case 'Enter':
          e.preventDefault();
          config.onEnter?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          config.onLeft?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          config.onRight?.();
          break;
      }
    },
    [config]
  );

  useEffect(() => {
    if (config.enabled === false) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, config.enabled]);
}
