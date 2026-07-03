// ============================================
// AI 接口客户端 - OpenAI 兼容协议
// 严格通过服务端调用，前端不可见API密钥
// ============================================

import { QuestionType, QuestionTypeLabels } from './types';

// AI接口配置（全部从环境变量读取）
const AI_API_URL = process.env.AI_API_URL || '';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL_NAME = process.env.AI_MODEL_NAME || 'deepseek-chat';
const AI_REQUEST_TIMEOUT = parseInt(process.env.AI_REQUEST_TIMEOUT || '30000', 10);

/**
 * 调用AI接口生成答案与解析
 * @param title 题干
 * @param options 选项数组
 * @param type 题型
 * @returns AI生成的答案与解析
 */
export async function generateAnswer(
  title: string,
  options: string[],
  type: QuestionType
): Promise<{ answer: string; analysis: string }> {
  const systemPrompt = getSystemPrompt(type);
  const userPrompt = buildUserPrompt(title, options, type);

  const result = await callAiApi(systemPrompt, userPrompt);
  return parseAiResponse(result, type);
}

/**
 * 复核答案（AI答案与题库答案不一致时触发）
 */
export async function reviewAnswer(
  title: string,
  options: string[],
  type: QuestionType,
  originalAnswer: string,
  aiAnswer: string
): Promise<{ finalAnswer: string; diffExplanation: string }> {
  const systemPrompt = `你是一名严谨的思政课程讲师，精通马克思主义理论、中国特色社会主义理论体系。
你的任务是比较两份答案，依据官方理论进行校验，给出最终正确结论。
请以JSON格式返回，格式为：{"finalAnswer":"最终正确选项","diffExplanation":"两份答案的差异点及正误原因详细说明"}`;

  const userPrompt = `请复核以下思政题目的答案：

【题型】${QuestionTypeLabels[type]}
【题干】${title}
${options.length > 0 ? `【选项】\n${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}` : ''}
【题库原始答案】${originalAnswer}
【AI首次生成答案】${aiAnswer}

请进行复核，给出最终正确答案和差异说明。`;

  const result = await callAiApi(systemPrompt, userPrompt);
  return parseReviewResponse(result);
}

/**
 * 调用AI API（核心请求函数）
 */
async function callAiApi(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!AI_API_URL || !AI_API_KEY) {
    throw new Error('AI接口未配置（缺少AI_API_URL或AI_API_KEY环境变量）');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT);

  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // 低温度，保证答案稳定性
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API 请求失败 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    // OpenAI 兼容格式：choices[0].message.content
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI API 返回数据格式异常');
    }
    return content;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI接口调用超时');
    }
    throw error;
  }
}

/**
 * 获取题型对应的系统提示词
 */
function getSystemPrompt(type: QuestionType): string {
  const basePrompt = `你是一名专业的思政课程助教，精通马克思主义基本原理、毛泽东思想和中国特色社会主义理论体系概论、中国近现代史纲要、思想道德与法治等思政课程。
请根据题目给出标准答案和详细解析。`;

  switch (type) {
    case 'single':
      return `${basePrompt}
请以JSON格式返回，格式为：{"answer":"正确选项字母(如A)","analysis":"详细解析，说明为什么选此项，其他选项为什么错"}`;
    case 'multiple':
      return `${basePrompt}
请以JSON格式返回，格式为：{"answer":"正确选项字母组合(如ABC)","analysis":"详细解析，说明每个正确选项的理由"}`;
    case 'judge':
      return `${basePrompt}
请以JSON格式返回，格式为：{"answer":"正确"或"错误","analysis":"详细解析，说明判断依据"}`;
    case 'essay':
      return `${basePrompt}
请以JSON格式返回，格式为：{"answer":"简答题参考答案要点","analysis":"详细解析，列出关键得分点"}`;
    default:
      return basePrompt;
  }
}

/**
 * 构建发送给AI的用户提示词
 */
function buildUserPrompt(title: string, options: string[], type: QuestionType): string {
  let prompt = `【题型】${QuestionTypeLabels[type]}\n【题干】${title}`;

  if (options.length > 0) {
    prompt += `\n【选项】\n${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}`;
  }

  prompt += `\n\n请给出标准答案和详细解析。`;
  return prompt;
}

/**
 * 从AI返回内容中提取并解析JSON（通用）
 * @param content AI返回的原始文本
 * @param defaults 默认字段值映射
 * @returns 合并了默认值的解析结果
 */
function parseJsonFromAiResponse<T extends Record<string, string>>(
  content: string,
  defaults: T
): T {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const result = { ...defaults };
      for (const key of Object.keys(defaults)) {
        if (parsed[key]) result[key as keyof T] = parsed[key];
      }
      return result;
    }
  } catch {
    // JSON解析失败，返回默认值
  }
  return defaults;
}

/**
 * 解析AI答案生成返回的结果
 */
function parseAiResponse(
  content: string,
  _type: QuestionType
): { answer: string; analysis: string } {
  return parseJsonFromAiResponse(content, {
    answer: '解析失败',
    analysis: content,
  });
}

/**
 * 解析AI复核返回的结果
 */
function parseReviewResponse(content: string): { finalAnswer: string; diffExplanation: string } {
  const result = parseJsonFromAiResponse(content, {
    finalAnswer: '复核解析失败',
    diffExplanation: content,
  });
  return { finalAnswer: result.finalAnswer, diffExplanation: result.diffExplanation };
}


