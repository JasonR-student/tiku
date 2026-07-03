'use client';

// ============================================
// AI调用统计页面 (P2功能)
// ============================================

import { useState, useEffect } from 'react';
import { loadAiStats } from '@/lib/storage';

export default function StatsPage() {
  const [stats, setStats] = useState({ total: 0, today: 0, todayDate: '' });
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [cacheCount, setCacheCount] = useState(0);

  useEffect(() => {
    const localStats = loadAiStats();
    setStats(localStats);

    // 检查数据库状态
    fetch('/api/questions?pageSize=1')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDbConnected(true);
          setQuestionCount(data.data.total);
        } else {
          setDbConnected(false);
        }
      })
      .catch(() => setDbConnected(false));
  }, []);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">📈 系统统计</h2>

      {/* 数据库状态 */}
      <div className="card">
        <div className="card-body">
          <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3">🗄️ 数据库状态</h3>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                dbConnected === null
                  ? 'bg-slate-400 animate-pulse-soft'
                  : dbConnected
                  ? 'bg-green-500'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {dbConnected === null
                ? '检测中...'
                : dbConnected
                ? `已连接 · 题库共 ${questionCount} 题`
                : '未连接 · 使用本地存储模式'}
            </span>
          </div>
        </div>
      </div>

      {/* AI调用统计 */}
      <div className="card">
        <div className="card-body">
          <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3">🤖 AI调用统计</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="text-3xl font-bold text-primary-600">{stats.total}</div>
              <div className="text-xs text-slate-500 mt-1">累计调用</div>
            </div>
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="text-3xl font-bold text-primary-600">{stats.today}</div>
              <div className="text-xs text-slate-500 mt-1">今日调用</div>
            </div>
          </div>
        </div>
      </div>

      {/* 环境变量信息 */}
      <div className="card">
        <div className="card-body space-y-2 text-sm">
          <h3 className="font-bold text-slate-700 dark:text-slate-300">⚙️ 运行配置</h3>
          <div className="flex justify-between">
            <span className="text-slate-500">AI模型</span>
            <span className="text-slate-700 dark:text-slate-300 font-mono text-xs">
              {process.env.NEXT_PUBLIC_APP_NAME || '思政题库刷题'} v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">存储模式</span>
            <span className="text-slate-700 dark:text-slate-300">
              {dbConnected ? '数据库 + 本地双写' : '仅本地存储'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
