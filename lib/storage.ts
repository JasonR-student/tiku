// ============================================
// 本地存储工具 - localStorage 封装
// 数据库不可用时自动降级为本地存储
// ============================================

import { UserProgress, DEFAULT_PROGRESS } from './types';

const STORAGE_KEYS = {
  PROGRESS: 'sizheng_quiz_progress',
  EXAM_HISTORY: 'sizheng_quiz_exam_history',
  AI_CALL_STATS: 'sizheng_quiz_ai_stats',
} as const;

/**
 * 安全读取localStorage（处理SSR场景）
 */
function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

/**
 * 读取用户进度
 */
export function loadProgress(): UserProgress {
  const ls = getLocalStorage();
  if (!ls) return { ...DEFAULT_PROGRESS };

  try {
    const raw = ls.getItem(STORAGE_KEYS.PROGRESS);
    if (!raw) return { ...DEFAULT_PROGRESS };

    const saved = JSON.parse(raw) as Partial<UserProgress>;
    // 合并默认值，防止新增字段丢失
    return { ...DEFAULT_PROGRESS, ...saved };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

/**
 * 保存用户进度
 */
export function saveProgress(progress: UserProgress): void {
  const ls = getLocalStorage();
  if (!ls) return;

  try {
    ls.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  } catch (e) {
    console.error('[Storage] 保存进度失败:', e);
  }
}

/**
 * 更新进度的部分字段
 */
export function updateProgress(partial: Partial<UserProgress>): UserProgress {
  const current = loadProgress();
  const updated = { ...current, ...partial };
  saveProgress(updated);
  return updated;
}

/**
 * 读取考试历史记录
 */
export function loadExamHistory(): unknown[] {
  const ls = getLocalStorage();
  if (!ls) return [];

  try {
    const raw = ls.getItem(STORAGE_KEYS.EXAM_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 保存考试记录到本地
 */
export function saveExamRecord(record: unknown): void {
  const ls = getLocalStorage();
  if (!ls) return;

  try {
    const history = loadExamHistory();
    history.unshift(record);
    // 最多保留50条记录
    if (history.length > 50) history.length = 50;
    ls.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('[Storage] 保存考试记录失败:', e);
  }
}

/**
 * 读取AI调用统计
 */
export function loadAiStats(): { total: number; today: number; todayDate: string } {
  const ls = getLocalStorage();
  if (!ls) return { total: 0, today: 0, todayDate: '' };

  try {
    const raw = ls.getItem(STORAGE_KEYS.AI_CALL_STATS);
    return raw ? JSON.parse(raw) : { total: 0, today: 0, todayDate: '' };
  } catch {
    return { total: 0, today: 0, todayDate: '' };
  }
}

/**
 * 记录一次AI调用
 */
export function recordAiCall(): void {
  const ls = getLocalStorage();
  if (!ls) return;

  const stats = loadAiStats();
  const today = new Date().toISOString().split('T')[0];

  if (stats.todayDate !== today) {
    stats.todayDate = today;
    stats.today = 1;
  } else {
    stats.today++;
  }
  stats.total++;

  try {
    ls.setItem(STORAGE_KEYS.AI_CALL_STATS, JSON.stringify(stats));
  } catch (e) {
    console.error('[Storage] 保存AI统计失败:', e);
  }
}

/**
 * 检查今日日期是否需要重置每日计数
 */
export function checkAndResetDaily(): UserProgress {
  const progress = loadProgress();
  const today = new Date().toISOString().split('T')[0];

  if (progress.todayDate !== today) {
    progress.todayDate = today;
    progress.todayCompleted = 0;
    saveProgress(progress);
  }

  return progress;
}
