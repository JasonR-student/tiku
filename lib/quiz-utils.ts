// ============================================
// 答题公共工具函数
// study 和 exam 页面共享使用
// ============================================

import { QuestionType } from './types';

/** Fisher-Yates 随机打乱数组 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 规范化字符串（去空白、小写） */
export function normalize(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

/** 拆分合并选项（"反腐败 B.艰苦奋斗" → ["反腐败","艰苦奋斗"]） */
export function splitMergedOptions(raw: string[]): string[] {
  if (!raw.length) return [];
  const hasMerged = raw.some(o => /[B-H][.、．]/.test(o));
  if (!hasMerged) return raw;
  const result: string[] = [];
  for (const opt of raw) {
    const parts = opt.split(/\s+(?=[B-H][.、．])/);
    for (const p of parts) {
      const cleaned = p.replace(/^[A-H][.、．]\s*/, '').trim();
      if (cleaned) result.push(cleaned);
    }
  }
  return result.length >= 2 ? result : raw;
}

/** 判断用户作答是否正确 */
export function isAnswerCorrect(
  userAnswer: string,
  correctAnswer: string,
  qType: QuestionType,
  options: string[]
): boolean {
  if (qType === 'essay' || qType === 'material') return true;
  if (qType === 'judge') {
    const u = userAnswer.replace(/[✓√对是正确]/g, '对').replace(/[✗×错否误]/g, '错');
    const c = correctAnswer.replace(/[✓√对是正确]/g, '对').replace(/[✗×错否误]/g, '错');
    return u.includes('对') ? c.includes('对') : c.includes('错');
  }
  // 如果答案是单字母(A-H)，按索引匹配选项文本
  if (/^[A-H]$/i.test(correctAnswer) && options.length > 0) {
    const idx = correctAnswer.toUpperCase().charCodeAt(0) - 65;
    if (idx < options.length) {
      return normalize(userAnswer) === normalize(options[idx]);
    }
  }
  // 文本直接比对
  return normalize(userAnswer) === normalize(correctAnswer);
}

/** 将字母答案转换为显示用的选项文本 */
export function getDisplayAnswer(answer: string, options: string[]): string {
  if (/^[A-H]$/i.test(answer) && options.length > 0) {
    const idx = answer.toUpperCase().charCodeAt(0) - 65;
    if (idx < options.length) return options[idx];
  }
  return answer;
}

/** 题型→CSS类名映射 */
export const TYPE_BADGE_CLASS: Record<QuestionType, string> = {
  single: 'cyber-badge cyber-badge-single',
  multiple: 'cyber-badge cyber-badge-multiple',
  judge: 'cyber-badge cyber-badge-judge',
  essay: 'cyber-badge cyber-badge-essay',
  material: 'cyber-badge cyber-badge-multiple',
};

/** 题型→中文简称映射 */
export const TYPE_LABEL: Record<QuestionType, string> = {
  single: '单选',
  multiple: '多选',
  judge: '判断',
  essay: '简答',
  material: '材料',
};
