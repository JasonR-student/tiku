// ============================================
// API路由: /api/questions
// 题库管理 - 查询、导入题目
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query, insert } from '@/lib/db';
import { parseTextBank, parseJsonBank, convertToDbFormat } from '@/lib/parser';
import { validatePagination, sanitizeString, isValidType } from '@/lib/validators';
import { Question, QuestionType } from '@/lib/types';

/**
 * GET /api/questions - 查询题目列表
 * 查询参数: type(题型), page(页码), pageSize(每页数量), search(搜索关键词)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';
  const search = sanitizeString(searchParams.get('search') || '', 200);
  const { page, pageSize, offset } = validatePagination(
    searchParams.get('page'),
    searchParams.get('pageSize')
  );

  // 辅助：从本地JSON降级读取
  const fallbackToJson = async (filterType: string, filterSearch: string, pg: number, ps: number, off: number) => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const jsonPath = path.join(process.cwd(), 'cleaned_questions_final.json');
    const raw = await fs.readFile(jsonPath, 'utf-8');
    const allQuestions: Question[] = JSON.parse(raw);
    
    let filtered = allQuestions;
    if (filterType && isValidType(filterType)) {
      filtered = filtered.filter(q => q.type === filterType);
    }
    if (filterSearch) {
      filtered = filtered.filter(q => 
        q.title.includes(filterSearch) || (q.analysis || '').includes(filterSearch)
      );
    }

    const filteredTotal = filtered.length;
    const items = filtered.slice(off, off + ps);

    return NextResponse.json({
      success: true,
      data: { items, total: filteredTotal, page: pg, pageSize: ps, totalPages: Math.ceil(filteredTotal / ps) },
      degraded: true,
    });
  };

  try {
    // 构建查询条件
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (type && isValidType(type)) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }

    if (search) {
      conditions.push(`(title ILIKE $${paramIndex} OR analysis ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 查询总数
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM questions ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.count || '0', 10);

    // DB连接成功但表为空 → 降级到本地JSON
    if (total === 0) {
      return fallbackToJson(type, search, page, pageSize, offset);
    }

    // 查询分页数据
    const rows = await query<Question>(
      `SELECT * FROM questions ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, pageSize, offset]
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
    console.error('[API] 查询题目失败，降级到本地JSON:', error);
    try {
      return fallbackToJson(type, search, page, pageSize, offset);
    } catch (fsError) {
      console.error('[API] 本地降级也失败:', fsError);
      return NextResponse.json(
        { success: false, error: '题库加载失败，请检查数据库配置或本地题库文件' },
        { status: 500 }
      );
    }
  }
}

/**
 * POST /api/questions - 导入题目（支持JSON和纯文本）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format, data } = body;

    if (!data) {
      return NextResponse.json(
        { success: false, error: '导入数据不能为空' },
        { status: 400 }
      );
    }

    let items;

    // 根据格式选择解析器
    if (format === 'json') {
      items = parseJsonBank(data);
    } else if (format === 'text') {
      items = parseTextBank(String(data));
    } else {
      return NextResponse.json(
        { success: false, error: '不支持的导入格式，请使用 json 或 text' },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: '未识别到任何有效题目' },
        { status: 400 }
      );
    }

    // 过滤掉错误题目
    const validItems = items.filter((i) => i.status !== 'error');
    if (validItems.length === 0) {
      return NextResponse.json(
        { success: false, error: '所有题目均存在致命错误，无法导入' },
        { status: 400 }
      );
    }

    // 转换为数据库格式并批量插入
    const dbItems = convertToDbFormat(validItems);
    const inserted: unknown[] = [];
    const skipped: string[] = [];

    for (const item of dbItems) {
      try {
        // 检查重复（通过题干比对）
        const existing = await query<{ id: string }>(
          'SELECT id FROM questions WHERE title = $1 LIMIT 1',
          [item.title]
        );

        if (existing.length > 0) {
          skipped.push(item.title.slice(0, 30) + '...');
          continue;
        }

        const result = await insert<{ id: string }>('questions', {
          type: item.type,
          title: item.title,
          options: JSON.stringify(item.options),
          answer: item.answer,
          analysis: item.analysis,
        });
        if (result) inserted.push(result);
      } catch (e) {
        console.error('[API] 插入题目失败:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        inserted: inserted.length,
        skipped: skipped.length,
        skippedTitles: skipped,
        total: items.length,
      },
      message: `成功导入 ${inserted.length} 道题目${skipped.length > 0 ? `，跳过 ${skipped.length} 道重复题目` : ''}`,
    });
  } catch (error) {
    console.error('[API] 导入题目失败:', error);
    return NextResponse.json(
      { success: false, error: '导入题目失败，请检查数据格式' },
      { status: 500 }
    );
  }
}
