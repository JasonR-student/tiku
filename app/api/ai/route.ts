// ============================================
// API路由: /api/ai
// AI答案生成与复核（严格缓存优先原则）
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, insert, update } from '@/lib/db';
import { generateAnswer, reviewAnswer } from '@/lib/ai';
import { QuestionType } from '@/lib/types';

/** 单题AI生成最大次数（默认2次：1次初始+1次重新生成） */
const AI_GENERATE_LIMIT = parseInt(process.env.AI_GENERATE_LIMIT || '2', 10);

/**
 * POST /api/ai - 为指定题目生成AI答案
 * Body: { questionId: string, regenerate?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, regenerate } = body;

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: '缺少题目ID' },
        { status: 400 }
      );
    }

    // ---- 第1步：查询题目信息 ----
    const question = await queryOne<{
      id: string; type: QuestionType; title: string;
      options: string | string[]; answer: string; analysis: string;
    }>(
      'SELECT id, type, title, options, answer, analysis FROM questions WHERE id = $1',
      [questionId]
    );

    if (!question) {
      return NextResponse.json(
        { success: false, error: '题目不存在' },
        { status: 404 }
      );
    }

    // 解析选项
    const options: string[] = typeof question.options === 'string'
      ? JSON.parse(question.options)
      : (question.options as unknown as string[]);

    // ---- 第2步：查询AI缓存 ----
    const cached = await queryOne<{
      id: string; ai_answer: string; final_answer: string;
      ai_analysis: string; diff_explanation: string;
      call_count: number; review_status: string;
    }>(
      'SELECT * FROM ai_cache WHERE question_id = $1',
      [questionId]
    );

    // 缓存命中且非重新生成 → 直接返回
    if (cached && cached.ai_answer && !regenerate) {
      return NextResponse.json({
        success: true,
        data: {
          aiAnswer: cached.ai_answer,
          finalAnswer: cached.final_answer,
          analysis: cached.ai_analysis,
          diffExplanation: cached.diff_explanation,
          reviewStatus: cached.review_status,
          fromCache: true,
        },
      });
    }

    // ---- 第3步：检查调用次数（重新生成时放宽限制） ----
    const callCount = cached?.call_count || 0;
    if (callCount >= AI_GENERATE_LIMIT && cached && !regenerate) {
      return NextResponse.json({
        success: true,
        data: {
          aiAnswer: cached.ai_answer || '',
          finalAnswer: cached.final_answer || '',
          analysis: cached.ai_analysis || '',
          diffExplanation: '已达到AI调用次数上限，无法重新生成',
          reviewStatus: cached.review_status,
          fromCache: true,
          limitReached: true,
        },
      });
    }

    // ---- 第4步：调用AI生成答案 ----
    let aiResult: { answer: string; analysis: string };
    try {
      aiResult = await generateAnswer(question.title, options, question.type);
    } catch (aiError) {
      console.error('[API] AI生成失败:', aiError);
      // 降级：返回原始答案
      return NextResponse.json({
        success: true,
        data: {
          aiAnswer: question.answer,
          finalAnswer: question.answer,
          analysis: question.analysis || '',
          diffExplanation: '',
          reviewStatus: 'pending',
          fromCache: false,
          degraded: true,
          message: 'AI解析加载失败，已显示原始答案',
        },
      });
    }

    // ---- 第5步：对比答案，判断是否需要复核 ----
    const originalAnswer = question.answer.trim();
    const aiAnswer = aiResult.answer.trim();
    let finalAnswer = aiAnswer;
    let diffExplanation = '';
    let reviewStatus: string = 'consistent';

    // 标准化比较函数（忽略大小写和空格）
    const normalizeAnswer = (a: string) => a.toUpperCase().replace(/\s+/g, '');
    const isMatch = normalizeAnswer(originalAnswer) === normalizeAnswer(aiAnswer);

    if (!isMatch) {
      // 答案不一致 → 触发复核
      reviewStatus = 'pending';
      try {
        const reviewResult = await reviewAnswer(
          question.title,
          options,
          question.type,
          originalAnswer,
          aiAnswer
        );
        finalAnswer = reviewResult.finalAnswer;
        diffExplanation = reviewResult.diffExplanation;
        reviewStatus = 'reviewed';
      } catch (reviewError) {
        console.error('[API] AI复核失败:', reviewError);
        // 复核失败时，以AI答案为准
        diffExplanation = 'AI复核失败，当前展示AI首次生成答案。题库原始答案：' + originalAnswer;
        reviewStatus = 'pending';
      }
    }

    // ---- 第6步：写入/更新缓存 ----
    if (cached) {
      await update('ai_cache', cached.id, {
        ai_answer: aiAnswer,
        final_answer: finalAnswer,
        ai_analysis: aiResult.analysis,
        diff_explanation: diffExplanation,
        call_count: callCount + 1,
        review_status: reviewStatus,
      });
    } else {
      await insert('ai_cache', {
        question_id: questionId,
        ai_answer: aiAnswer,
        final_answer: finalAnswer,
        ai_analysis: aiResult.analysis,
        diff_explanation: diffExplanation,
        call_count: 1,
        review_status: reviewStatus,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        aiAnswer,
        finalAnswer,
        analysis: aiResult.analysis,
        diffExplanation,
        reviewStatus,
        fromCache: false,
      },
    });
  } catch (error) {
    console.error('[API] AI接口异常:', error);
    return NextResponse.json(
      { success: false, error: 'AI服务异常，请稍后重试' },
      { status: 500 }
    );
  }
}
