'use client';

// ============================================
// 导入预览组件 - 题库导入校验预览
// ============================================

import { useState } from 'react';
import { ImportPreviewItem, QuestionTypeLabels } from '@/lib/types';

interface ImportPreviewProps {
  items: ImportPreviewItem[];
  onConfirm: (items: ImportPreviewItem[]) => void;
  onCancel: () => void;
  onEdit?: (item: ImportPreviewItem) => void;
  onDelete?: (tempId: string) => void;
}

export default function ImportPreview({
  items,
  onConfirm,
  onCancel,
  onEdit,
  onDelete,
}: ImportPreviewProps) {
  const [editableItems, setEditableItems] = useState<ImportPreviewItem[]>(items);

  const stats = {
    total: items.length,
    valid: items.filter((i) => i.status === 'valid').length,
    warning: items.filter((i) => i.status === 'warning').length,
    error: items.filter((i) => i.status === 'error').length,
  };

  const handleDelete = (tempId: string) => {
    setEditableItems((prev) => prev.filter((i) => i.tempId !== tempId));
    onDelete?.(tempId);
  };

  return (
    <div className="space-y-4">
      {/* 统计概览 */}
      <div className="card">
        <div className="card-body">
          <h2 className="text-lg font-bold mb-3">📊 识别结果概览</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{stats.total}</div>
              <div className="text-xs text-slate-500">总题目数</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
              <div className="text-xs text-green-600">正常</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
              <div className="text-xs text-yellow-600">警告</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.error}</div>
              <div className="text-xs text-red-600">错误</div>
            </div>
          </div>
        </div>
      </div>

      {/* 题目预览列表 */}
      <div className="space-y-3">
        {editableItems.map((item, index) => (
          <div
            key={item.tempId}
            className={`card border-l-4 ${
              item.status === 'error'
                ? 'border-l-red-500'
                : item.status === 'warning'
                ? 'border-l-yellow-500'
                : 'border-l-green-500'
            }`}
          >
            <div className="card-body">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">#{index + 1}</span>
                  <span className="badge badge-info">
                    {QuestionTypeLabels[item.type]}
                  </span>
                  {item.status !== 'valid' && (
                    <span
                      className={`badge ${
                        item.status === 'error' ? 'badge-danger' : 'badge-warning'
                      }`}
                    >
                      {item.status === 'error' ? '错误' : '警告'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.tempId)}
                  className="btn-ghost text-red-500 text-sm"
                >
                  删除
                </button>
              </div>

              <p className="text-sm mb-2">{item.title}</p>

              {item.options.length > 0 && (
                <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                  {item.options.map((opt, i) => (
                    <span key={i} className="mr-3">
                      {String.fromCharCode(65 + i)}. {opt}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>答案：{item.answer || '未识别'}</span>
                {item.analysis && <span>解析：{item.analysis.slice(0, 50)}...</span>}
              </div>

              {item.message && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ {item.message}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 操作按钮 */}
      {editableItems.length > 0 && (
        <div className="flex gap-3 justify-end sticky bottom-4">
          <button onClick={onCancel} className="btn-secondary">
            取消
          </button>
          <button
            onClick={() => onConfirm(editableItems)}
            className="btn-primary"
            disabled={editableItems.every((i) => i.status === 'error')}
          >
            确认导入 ({editableItems.filter((i) => i.status !== 'error').length} 题)
          </button>
        </div>
      )}
    </div>
  );
}
