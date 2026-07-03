// ============================================
// API路由: /api/questions/[id]
// 单题CRUD操作
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, update, remove } from '@/lib/db';
import { Question, AiCache } from '@/lib/types';

/**
 * GET /api/questions/[id] - 获取单题详情（含AI缓存）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const questionId = params.id;

  // 辅助：从本地JSON降级获取单题
  const fallbackGetQuestion = async (): Promise<{ question: Question | null; aiCache: AiCache | null }> => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const bankPath = path.join(process.cwd(), 'cleaned_questions_final.json');
    const raw = await fs.readFile(bankPath, 'utf-8');
    const all: Question[] = JSON.parse(raw);
    const question = all.find(q => q.id === questionId) || null;

    let aiCache: AiCache | null = null;
    try {
      const cachePath = path.join(process.cwd(), 'ai_answers_cache.json');
      const cacheRaw = await fs.readFile(cachePath, 'utf-8');
      const cache: Record<string, Record<string, unknown>> = JSON.parse(cacheRaw);
      const cached = Object.values(cache).find((v) => question && v.title && question.title.includes(String(v.title).slice(0, 30)));
      if (cached) {
        aiCache = {
          id: '', question_id: questionId,
          ai_answer: String(cached.ai_answer || ''), final_answer: String(cached.final_answer || ''),
          ai_analysis: String(cached.ai_analysis || ''), diff_explanation: String(cached.diff_explanation || ''),
          call_count: Number(cached.call_count || 0), review_status: String(cached.review_status || 'pending') as 'pending' | 'reviewed' | 'consistent',
          created_at: '', updated_at: '',
        };
      }
    } catch { /* AI缓存降级失败可忽略 */ }
    return { question, aiCache };
  };

  try {
    const question = await queryOne<Question>(
      'SELECT * FROM questions WHERE id = $1',
      [questionId]
    );

    // DB查询成功但没有数据 → 降级到本地JSON
    if (!question) {
      const { question: fallbackQ, aiCache: fallbackCache } = await fallbackGetQuestion();
      if (!fallbackQ) {
        return NextResponse.json({ success: false, error: '题目不存在' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: { ...fallbackQ, aiCache: fallbackCache, options: fallbackQ.options },
        degraded: true,
      });
    }

    const aiCache = await queryOne<AiCache>(
      'SELECT * FROM ai_cache WHERE question_id = $1',
      [questionId]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...question,
        options: typeof question.options === 'string'
          ? JSON.parse(question.options as string)
          : question.options,
        aiCache: aiCache || null,
      },
    });
  } catch (error) {
    console.error('[API] 获取题目失败，降级本地:', error);
    try {
      const { question: fallbackQ, aiCache: fallbackCache } = await fallbackGetQuestion();

      if (!fallbackQ) {
        return NextResponse.json({ success: false, error: '题目不存在' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: { ...fallbackQ, aiCache: fallbackCache, options: fallbackQ.options },
        degraded: true,
      });
    } catch (fsError) {
      return NextResponse.json({ success: false, error: '获取题目失败' }, { status: 500 });
    }
  }
}

/**
 * PUT /api/questions/[id] - 更新题目
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const questionId = params.id;
  try {
    const body = await request.json();

    const existing = await queryOne<Question>(
      'SELECT * FROM questions WHERE id = $1',
      [questionId]
    );
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '题目不存在' },
        { status: 404 }
      );
    }

    const updated = await update<Question>('questions', questionId, {
      type: body.type || existing.type,
      title: body.title || existing.title,
      options: JSON.stringify(body.options || existing.options),
      answer: body.answer || existing.answer,
      analysis: body.analysis || existing.analysis,
      difficulty: body.difficulty || existing.difficulty || 'medium',
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[API] 更新题目失败:', error);
    return NextResponse.json(
      { success: false, error: '更新题目失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/questions/[id] - 删除题目
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const questionId = params.id;
  try {

    const existing = await queryOne<Question>(
      'SELECT * FROM questions WHERE id = $1',
      [questionId]
    );
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '题目不存在' },
        { status: 404 }
      );
    }

    await remove('questions', questionId);
    // AI缓存会通过外键CASCADE自动删除

    return NextResponse.json({
      success: true,
      message: '题目已删除',
    });
  } catch (error) {
    console.error('[API] 删除题目失败:', error);
    return NextResponse.json(
      { success: false, error: '删除题目失败' },
      { status: 500 }
    );
  }
}
