// ============================================
// API路由: /api/questions/stats
// 题库统计信息（题型数量分布）
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/questions/stats - 获取题库统计
 * 返回：总题数 + 各题型数量分布
 */
export async function GET(_request: NextRequest) {
  try {
    // 聚合查询：按题型分组统计
    const rows = await query<{ type: string; count: string }>(
      `SELECT type, COUNT(*) as count FROM questions GROUP BY type ORDER BY type`
    );

    const typeCounts: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      const count = parseInt(row.count, 10);
      typeCounts[row.type] = count;
      total += count;
    }

    return NextResponse.json({
      success: true,
      data: { total, typeCounts },
    });
  } catch (error) {
    console.error('[API] 统计查询失败，降级本地:', error);
    // 降级：从本地JSON题库统计
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const jsonPath = path.join(process.cwd(), 'cleaned_questions_final.json');
      const raw = await fs.readFile(jsonPath, 'utf-8');
      const all: { type: string }[] = JSON.parse(raw);

      const typeCounts: Record<string, number> = {};
      for (const q of all) {
        typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
      }

      return NextResponse.json({
        success: true,
        data: { total: all.length, typeCounts },
        degraded: true,
      });
    } catch (fsError) {
      console.error('[API] 本地降级也失败:', fsError);
      return NextResponse.json(
        { success: false, error: '统计查询失败' },
        { status: 500 }
      );
    }
  }
}
