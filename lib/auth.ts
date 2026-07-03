// ============================================
// 设备ID + 管理员认证工具
// 零依赖、零配置，开箱即用
// ============================================

import { NextRequest } from 'next/server';

/** 从请求头提取设备ID */
export function getDeviceId(request: NextRequest): string {
  return request.headers.get('x-device-id') || 'anonymous';
}

/** 管理员认证 */
export function isAdmin(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const adminToken = process.env.ADMIN_TOKEN || '';
    return adminToken.length > 0 && token === adminToken;
  }
  // 兼容 Basic Auth
  if (auth.startsWith('Basic ')) {
    const creds = Buffer.from(auth.slice(6), 'base64').toString();
    const [user, pass] = creds.split(':');
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || '';
    return user === adminUser && pass === adminPass && adminPass.length > 0;
  }
  return false;
}

/** 检查是否需要注册（通过环境变量开关） */
export function isRegistrationOpen(): boolean {
  return process.env.ALLOW_REGISTRATION === 'true';
}

/** 获取或创建用户（基于设备ID） */
export async function getOrCreateUser(
  deviceId: string,
  dbQuery: (sql: string, params: unknown[]) => Promise<unknown[]>
): Promise<{ id: string; device_id: string; role: string } | null> {
  if (!deviceId || deviceId === 'anonymous') return null;

  try {
    // 查询已有用户
    const rows = await dbQuery(
      'SELECT id, device_id, role FROM users WHERE device_id = $1',
      [deviceId]
    );
    if (rows.length > 0) {
      // 更新最后活跃时间
      await dbQuery('UPDATE users SET last_seen = NOW() WHERE device_id = $1', [deviceId]);
      return rows[0] as { id: string; device_id: string; role: string };
    }

    // 创建新用户
    const newRows = await dbQuery(
      'INSERT INTO users (device_id, role) VALUES ($1, $2) RETURNING id, device_id, role',
      [deviceId, 'user']
    );
    return newRows[0] as { id: string; device_id: string; role: string } | null;
  } catch (err) {
    console.error('[Auth] 获取或创建用户失败:', err);
    return null;
  }
}
