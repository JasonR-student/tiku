// ============================================
// API路由: /api/exam/[id]
// 单条考试记录详情
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, remove } from '@/lib/db';
import { ExamRecord } from '@/lib/types';

/**
 * GET /api/exam/[id] - 获取考试记录详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const record = await queryOne<ExamRecord>(
      'SELECT * FROM exam_records WHERE id = $1',
      [id]
    );

    if (!record) {
      return NextResponse.json(
        { success: false, error: '考试记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('[API] 获取考试记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取考试记录失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/exam/[id] - 删除考试记录
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await remove('exam_records', id);
    return NextResponse.json({ success: true, message: '考试记录已删除' });
  } catch (error) {
    console.error('[API] 删除考试记录失败:', error);
    return NextResponse.json(
      { success: false, error: '删除考试记录失败' },
      { status: 500 }
    );
  }
}
