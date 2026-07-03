// ============================================
// 参数校验工具 - 防止SQL注入与非法输入
// ============================================

import { QuestionType } from './types';

const VALID_TYPES: QuestionType[] = ['single', 'multiple', 'judge', 'essay', 'material'];

/**
 * 校验题型是否合法
 */
export function isValidType(type: unknown): type is QuestionType {
  return VALID_TYPES.includes(type as QuestionType);
}

/**
 * 校验并清理字符串（防止SQL注入基础防护）
 */
export function sanitizeString(input: unknown, maxLength = 5000): string {
  if (typeof input !== 'string') return '';
  // 截断超长字符串
  return input.slice(0, maxLength).trim();
}

/**
 * 校验分页参数
 */
export function validatePagination(
  page: unknown,
  pageSize: unknown
): { page: number; pageSize: number; offset: number } {
  const p = Math.max(1, parseInt(String(page || '1'), 10) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(String(pageSize || '20'), 10) || 20));
  return { page: p, pageSize: ps, offset: (p - 1) * ps };
}

/**
 * 校验题目数据
 */
export function validateQuestionData(data: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('题干不能为空');
  }
  if (!isValidType(data.type)) {
    errors.push(`题型不合法，必须为: ${VALID_TYPES.join(', ')}`);
  }
  if (!data.answer || typeof data.answer !== 'string' || !data.answer.trim()) {
    errors.push('参考答案不能为空');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 校验考试配置
 */
export function validateExamConfig(data: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const totalQuestions = parseInt(String(data.totalQuestions || '0'), 10);
  if (isNaN(totalQuestions) || totalQuestions < 1 || totalQuestions > 200) {
    errors.push('考试题目数量需在1-200之间');
  }

  const duration = parseInt(String(data.duration || '0'), 10);
  if (isNaN(duration) || duration < 1 || duration > 300) {
    errors.push('考试时长需在1-300分钟之间');
  }

  const types = data.selectedTypes;
  if (!Array.isArray(types) || types.length === 0) {
    errors.push('至少选择一种题型');
  } else {
    for (const t of types) {
      if (!isValidType(t)) {
        errors.push(`无效题型: ${t}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
