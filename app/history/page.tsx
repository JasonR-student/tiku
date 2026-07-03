'use client';

// ============================================
// 考试历史页面
// ============================================

import { useState, useEffect } from 'react';
import { loadExamHistory } from '@/lib/storage';
import { ExamRecord } from '@/lib/types';

export default function HistoryPage() {
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 先从本地加载
    const local = loadExamHistory() as ExamRecord[];
    setRecords(local);
    setLoading(false);

    // 尝试从数据库加载
    fetch('/api/exam?pageSize=50')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.items.length > 0) {
          setRecords(data.data.items);
        }
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <span className="text-4xl mb-4 block">📊</span>
          <p className="text-slate-600 dark:text-slate-400">暂无考试记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
        📊 考试历史 ({records.length})
      </h2>

      <div className="space-y-3">
        {records.map((record, index) => (
          <div key={record.id || index} className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">
                  {record.exam_time
                    ? new Date(record.exam_time).toLocaleString('zh-CN')
                    : '未知时间'}
                </span>
                <span
                  className={`badge ${
                    record.accuracy >= 80
                      ? 'badge-success'
                      : record.accuracy >= 60
                      ? 'badge-warning'
                      : 'badge-danger'
                  }`}
                >
                  {record.accuracy}%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-slate-400">题量</span>
                  <span className="ml-2 font-bold text-slate-700 dark:text-slate-200">
                    {record.total_questions}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">得分</span>
                  <span className="ml-2 font-bold text-slate-700 dark:text-slate-200">
                    {record.user_score}/{record.total_score}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">用时</span>
                  <span className="ml-2 font-bold text-slate-700 dark:text-slate-200">
                    {Math.floor(record.duration / 60)}分{record.duration % 60}秒
                  </span>
                </div>
              </div>

              {/* 分题型正确率 */}
              {record.type_accuracy && Object.keys(record.type_accuracy).length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {Object.entries(record.type_accuracy).map(([type, acc]) => (
                    <span key={type} className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                      {type}: {acc}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
