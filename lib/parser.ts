// ============================================
// 题库文本解析器 - 智能识别纯文本题库
// 支持识别常见题型标记、选项、答案字段
// ============================================

import { QuestionType, ImportPreviewItem } from './types';

/** 题型识别规则 */
interface TypePattern {
  type: QuestionType;
  patterns: RegExp[];
}

const TYPE_PATTERNS: TypePattern[] = [
  {
    type: 'single',
    patterns: [
      /单选题/i, /单项选择题/i, /一[、.]\s*单[项选]/i,
      /^单[项选]/i,
    ],
  },
  {
    type: 'multiple',
    patterns: [
      /多选题/i, /多项选择/i, /二[、.]\s*多[项选]/i,
      /^多[项选]/i,
    ],
  },
  {
    type: 'judge',
    patterns: [
      /判断题/i, /三[、.]\s*判[断]/i,
      /^判[断]/i,
    ],
  },
  {
    type: 'essay',
    patterns: [
      /简答题/i, /四[、.]\s*简[答]/i, /论述题/i,
      /^简[答]/i, /^论[述]/i,
    ],
  },
];

/**
 * 解析纯文本题库内容
 * @param text 原始题库文本
 * @returns 解析后的题目预览列表
 */
export function parseTextBank(text: string): ImportPreviewItem[] {
  const items: ImportPreviewItem[] = [];
  let currentType: QuestionType = 'single'; // 默认当作单选题

  // 按行分割，过滤空行
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let i = 0;
  let tempId = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. 检测题型分节标题（如「一、单选题」）
    const detectedType = detectType(line);
    if (detectedType) {
      currentType = detectedType;
      i++;
      continue;
    }

    // 2. 检测题干开始（通常以数字+标点开头，如 "1." "1、" "1）"）
    const titleMatch = line.match(/^(\d+)[\.、．）\)]\s*(.+)/);
    if (!titleMatch) {
      i++;
      continue;
    }

    const title = titleMatch[2].trim();
    const options: string[] = [];
    let answer = '';
    let analysis = '';
    let itemType = currentType;
    let status: 'valid' | 'warning' | 'error' = 'valid';
    let message = '';

    i++; // 移到题干下一行

    // 3. 收集选项（A. B. C. D. 开头）
    while (i < lines.length) {
      const optLine = lines[i];
      const optMatch = optLine.match(/^([A-H])[\.、．]\s*(.+)/);
      if (optMatch) {
        options.push(optMatch[2].trim());
        i++;
        continue;
      }
      break;
    }

    // 4. 识别答案和解析
    while (i < lines.length) {
      const metaLine = lines[i];

      // 检测是否是下一道题的题干
      if (/^\d+[\.、．）\)]\s*/.test(metaLine) && !metaLine.startsWith('答案') && !metaLine.startsWith('解析')) {
        break;
      }

      // 检测题型分节标题
      if (detectType(metaLine)) {
        break;
      }

      // 提取答案
      const answerMatch = metaLine.match(/(?:答案|参考答案)[：:]\s*(.+)/);
      if (answerMatch) {
        answer = answerMatch[1].trim();
        i++;
        continue;
      }

      // 提取解析
      const analysisMatch = metaLine.match(/(?:解析|答案解析)[：:]\s*(.+)/);
      if (analysisMatch) {
        analysis = analysisMatch[1].trim();
        i++;
        continue;
      }

      // 无法识别的行，跳过
      i++;
      break;
    }

    // 5. 后处理：根据选项数量推断题型
    if (currentType === 'single' && options.length === 0) {
      // 没有选项，可能是简答题
      itemType = 'essay';
    } else if (currentType === 'single' && answer.length > 1 && /^[A-H]+$/.test(answer)) {
      // 答案是多个字母，推断为多选题
      itemType = 'multiple';
      message = '已自动推断为多选题（答案含多个选项）';
    }

    // 判断题答案标准化
    if (itemType === 'judge' && options.length === 2) {
      if (answer.includes('对') || answer.includes('正确') || answer === 'A') {
        answer = '正确';
      } else if (answer.includes('错') || answer.includes('错误') || answer === 'B') {
        answer = '错误';
      }
    }

    // 校验
    if (!title) {
      status = 'error';
      message = '题干为空';
    } else if (!answer) {
      status = 'warning';
      message = '未找到参考答案';
    }

    items.push({
      tempId: String(++tempId),
      type: itemType,
      title,
      options,
      answer,
      analysis,
      status,
      message: message || undefined,
    });
  }

  return items;
}

/**
 * 检测题型分节标题
 */
function detectType(line: string): QuestionType | null {
  for (const { type, patterns } of TYPE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        return type;
      }
    }
  }
  return null;
}

/**
 * 解析JSON格式的题库
 */
export function parseJsonBank(jsonData: unknown): ImportPreviewItem[] {
  if (!Array.isArray(jsonData)) {
    throw new Error('JSON题库格式错误：期望一个题目数组');
  }

  const items: ImportPreviewItem[] = [];
  let tempId = 0;

  for (const item of jsonData) {
    if (typeof item !== 'object' || !item) continue;

    const type = validateType((item as Record<string, unknown>).type);
    const title = String((item as Record<string, unknown>).title || '').trim();
    const options = Array.isArray((item as Record<string, unknown>).options)
      ? ((item as Record<string, unknown>).options as string[]).map(String)
      : [];
    const answer = String((item as Record<string, unknown>).answer || '').trim();
    const analysis = String((item as Record<string, unknown>).analysis || '').trim();

    let status: 'valid' | 'warning' | 'error' = 'valid';
    let message = '';

    if (!title) {
      status = 'error';
      message = '题干为空';
    } else if (!answer) {
      status = 'warning';
      message = '参考答案为空';
    } else if (type !== 'essay' && options.length === 0) {
      status = 'warning';
      message = '客观题选项为空';
    }

    items.push({
      tempId: String(++tempId),
      type,
      title,
      options,
      answer,
      analysis,
      status,
      message: message || undefined,
    });
  }

  return items;
}

/**
 * 验证题型字段
 */
function validateType(type: unknown): QuestionType {
  const validTypes: QuestionType[] = ['single', 'multiple', 'judge', 'essay'];
  const typeStr = String(type || '').toLowerCase();

  // 支持中文题型名
  const typeMap: Record<string, QuestionType> = {
    '单选题': 'single', '单选': 'single', 'single': 'single',
    '多选题': 'multiple', '多选': 'multiple', 'multiple': 'multiple',
    '判断题': 'judge', '判断': 'judge', 'judge': 'judge',
    '简答题': 'essay', '简答': 'essay', '论述题': 'essay', 'essay': 'essay',
  };

  return typeMap[typeStr] || 'single';
}

/**
 * 将导入预览项转换为数据库插入格式
 */
export function convertToDbFormat(items: ImportPreviewItem[]): Array<{
  type: QuestionType;
  title: string;
  options: string[];
  answer: string;
  analysis: string;
}> {
  return items.map((item) => ({
    type: item.type,
    title: item.title,
    options: item.options,
    answer: item.answer,
    analysis: item.analysis,
  }));
}
