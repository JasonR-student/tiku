'use client';

// ============================================
// useLocalStorage - 通用localStorage Hook
// ============================================

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // 初始化读取
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(`[useLocalStorage] 读取 ${key} 失败:`, error);
    }
  }, [key]);

  // 写入
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((prev) => {
          const newValue = value instanceof Function ? value(prev) : value;
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(newValue));
          }
          return newValue;
        });
      } catch (error) {
        console.error(`[useLocalStorage] 写入 ${key} 失败:`, error);
      }
    },
    [key]
  );

  return [storedValue, setValue];
}
