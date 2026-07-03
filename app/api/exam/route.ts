// ============================================
// API路由: /api/exam
// 考试记录管理
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, insert } from '@/lib/db';
import { validateExamConfig } from '@/lib/validators';
import { ExamRecord } from '@/lib/types';

/**
 * POST /api/exam - 保存考试记录
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.answer_details || !Array.isArray(body.answer_details)) {
      return NextResponse.json(
        { success: false, error: '缺少答题详情' },
        { status: 400 }
      );
    }

    const record = await insert<ExamRecord>('exam_records', {
      total_questions: body.total_questions || 0,
      total_score: body.total_score || 0,
      user_score: body.user_score || 0,
      accuracy: body.accuracy || 0,
      type_accuracy: JSON.stringify(body.type_accuracy || {}),
      duration: body.duration || 0,
      answer_details: JSON.stringify(body.answer_details),
    });

    return NextResponse.json({
      success: true,
      data: record,
      message: '考试记录已保存',
    });
  } catch (error) {
    console.error('[API] 保存考试记录失败:', error);
    return NextResponse.json(
      { success: false, error: '保存考试记录失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/exam - 获取考试历史列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') || '10', 10));
    const offset = (page - 1) * pageSize;

    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM exam_records'
    );
    const total = parseInt(countResult[0]?.count || '0', 10);

    const rows = await query<ExamRecord>(
      'SELECT * FROM exam_records ORDER BY exam_time DESC LIMIT $1 OFFSET $2',
      [pageSize, offset]
    );

    return NextResponse.json({
      success: true,
      data: {
        items: rows,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('[API] 查询考试记录失败:', error);
    return NextResponse.json(
      { success: false, error: '查询考试记录失败' },
      { status: 500 }
    );
  }
}
