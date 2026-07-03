// ============================================
// 数据库客户端 - PostgreSQL 连接池
// 所有数据库操作通过此模块进行，前端不可直接调用
// ============================================

import { Pool, QueryResultRow } from 'pg';

// 全局连接池单例（Vercel Serverless 环境下复用）
let pool: Pool | null = null;

// ---- 白名单：允许操作的表名和列名 ----
const ALLOWED_TABLES = new Set(['users', 'questions', 'ai_cache', 'exam_records']);

const ALLOWED_COLUMNS: Record<string, Set<string>> = {
  users: new Set(['id', 'device_id', 'nickname', 'role', 'created_at', 'last_seen']),
  questions: new Set(['id', 'type', 'title', 'options', 'answer', 'analysis', 'difficulty', 'chapter', 'created_at', 'updated_at']),
  ai_cache: new Set(['id', 'question_id', 'ai_answer', 'final_answer', 'ai_analysis', 'diff_explanation', 'call_count', 'review_status', 'created_at', 'updated_at']),
  exam_records: new Set(['id', 'user_id', 'device_id', 'total_questions', 'total_score', 'user_score', 'accuracy', 'type_accuracy', 'duration', 'answer_details', 'exam_time']),
};

/** 校验表名是否合法 */
function validateTable(table: string): void {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`[DB] 非法的表名: ${table}`);
  }
}

/** 校验列名是否属于指定表 */
function validateColumns(table: string, columns: string[]): void {
  const allowed = ALLOWED_COLUMNS[table];
  if (!allowed) throw new Error(`[DB] 未知的表: ${table}`);
  for (const col of columns) {
    if (!allowed.has(col)) {
      throw new Error(`[DB] 表 ${table} 中非法的列名: ${col}`);
    }
  }
}

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL 环境变量未配置');
    }
    pool = new Pool({
      connectionString,
      // Vercel Serverless 优化：限制连接数
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

/**
 * 执行SQL查询
 * @param query SQL查询语句
 * @param params 参数数组
 * @returns 查询结果行数组
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const client = getPool();
    const result = await client.query<T>(sql, params);
    return result.rows;
  } catch (error) {
    console.error('[DB] 查询失败:', error);
    throw error;
  }
}

/**
 * 执行单条SQL查询，返回第一条结果
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 插入数据并返回插入的行
 */
export async function insert<T extends QueryResultRow = QueryResultRow>(
  table: string,
  data: Record<string, unknown>
): Promise<T | null> {
  validateTable(table);
  const keys = Object.keys(data);
  validateColumns(table, keys);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const columns = keys.join(', ');

  const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
  return queryOne<T>(sql, values);
}

/**
 * 更新数据并返回更新后的行
 */
export async function update<T extends QueryResultRow = QueryResultRow>(
  table: string,
  id: string,
  data: Record<string, unknown>
): Promise<T | null> {
  validateTable(table);
  const keys = Object.keys(data);
  validateColumns(table, keys);
  const values = Object.values(data);
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');

  const sql = `UPDATE ${table} SET ${setClause} WHERE id = $1 RETURNING *`;
  return queryOne<T>(sql, [id, ...values]);
}

/**
 * 删除数据
 */
export async function remove(
  table: string,
  id: string
): Promise<boolean> {
  validateTable(table);
  const sql = `DELETE FROM ${table} WHERE id = $1`;
  await query(sql, [id]);
  return true;
}

/**
 * 检查数据库连接是否正常
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (err) {
    console.error('[DB] 健康检查失败:', err);
    return false;
  }
}

export { getPool };
