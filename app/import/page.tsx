'use client';

// ============================================
// 题库导入页面 - JSON/文本两种导入方式
// ============================================

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ImportPreview from '@/components/ImportPreview';
import { ImportPreviewItem } from '@/lib/types';

type ImportFormat = 'json' | 'text';
type ImportPhase = 'input' | 'preview' | 'done';

export default function ImportPage() {
  const router = useRouter();
  const [format, setFormat] = useState<ImportFormat>('json');
  const [content, setContent] = useState('');
  const [phase, setPhase] = useState<ImportPhase>('input');
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState('');

  // 解析内容为预览
  const handlePreview = useCallback(async () => {
    if (!content.trim()) {
      setError('请输入或粘贴题库内容');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let body: { format: string; data: unknown };

      if (format === 'json') {
        try {
          body = { format: 'json', data: JSON.parse(content) };
        } catch {
          setError('JSON格式错误，请检查语法');
          setLoading(false);
          return;
        }
      } else {
        body = { format: 'text', data: content };
      }

      // 前端解析预览
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, previewOnly: true }),
      });

      if (!res.ok) {
        // 预览失败，用前端解析器
        if (format === 'json') {
          try {
            const parsed = JSON.parse(content);
            const items: ImportPreviewItem[] = (Array.isArray(parsed) ? parsed : []).map(
              (item: Record<string, unknown>, index: number) => ({
                tempId: String(index + 1),
                type: (['single', 'multiple', 'judge', 'essay'].includes(String(item.type || ''))
                  ? String(item.type)
                  : 'single') as ImportPreviewItem['type'],
                title: String(item.title || ''),
                options: Array.isArray(item.options) ? item.options.map(String) : [],
                answer: String(item.answer || ''),
                analysis: String(item.analysis || ''),
                status: 'valid' as const,
              })
            );
            setPreviewItems(items);
          } catch {
            setError('JSON解析失败');
            setLoading(false);
            return;
          }
        } else {
          setError('文本解析失败');
          setLoading(false);
          return;
        }
      } else {
        const data = await res.json();
        if (data.success && data.data?.items) {
          setPreviewItems(data.data.items);
        }
      }

      setPhase('preview');
    } catch (err) {
      setError('解析失败，请检查输入内容');
    } finally {
      setLoading(false);
    }
  }, [content, format]);

  // 确认导入
  const handleConfirm = async (items: ImportPreviewItem[]) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'json',
          data: items.map((i) => ({
            type: i.type,
            title: i.title,
            options: i.options,
            answer: i.answer,
            analysis: i.analysis,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setPhase('done');
      } else {
        setError(data.error || '导入失败');
      }
    } catch {
      setError('网络错误，导入失败');
    } finally {
      setLoading(false);
    }
  };

  // 输入阶段
  if (phase === 'input') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">📥 导入题库</h2>

        {/* 格式选择 */}
        <div className="flex gap-2">
          <button
            onClick={() => setFormat('json')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              format === 'json'
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            JSON 格式
          </button>
          <button
            onClick={() => setFormat('text')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              format === 'text'
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            纯文本格式
          </button>
        </div>

        {/* 格式说明 */}
        <div className="card">
          <div className="card-body text-sm space-y-2">
            {format === 'json' ? (
              <>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  JSON格式要求：
                </p>
                <pre className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs overflow-x-auto text-slate-600 dark:text-slate-400">
{`[
  {
    "type": "single",
    "title": "马克思主义诞生的标志是？",
    "options": ["《共产党宣言》的发表", "巴黎公社的成立", ...],
    "answer": "A",
    "analysis": "解析内容..."
  }
]`}
                </pre>
              </>
            ) : (
              <>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  文本格式要求：
                </p>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1">
                  <li>题型标记：如「一、单选题」「二、多选题」等</li>
                  <li>题号格式：如「1.」「1、」「1）」开头</li>
                  <li>选项格式：A. B. C. D. 开头</li>
                  <li>答案标记：「答案：」或「参考答案：」</li>
                  <li>解析标记：「解析：」或「答案解析：」</li>
                </ul>
              </>
            )}
          </div>
        </div>

        {/* 内容输入区 */}
        <div>
          <textarea
            className="input-field min-h-[300px] font-mono text-sm"
            placeholder={
              format === 'json'
                ? '在此粘贴JSON格式题库数据...'
                : '在此粘贴纯文本格式题库内容...'
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handlePreview}
          disabled={loading || !content.trim()}
          className="btn-primary w-full"
        >
          {loading ? '解析中...' : '🔍 预览识别结果'}
        </button>
      </div>
    );
  }

  // 预览阶段
  if (phase === 'preview') {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">📋 导入预览</h2>
        <ImportPreview
          items={previewItems}
          onConfirm={handleConfirm}
          onCancel={() => setPhase('input')}
        />
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-2 text-sm text-slate-500">正在导入题目...</p>
          </div>
        )}
      </div>
    );
  }

  // 完成阶段
  if (phase === 'done' && result) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="card">
          <div className="card-body py-12">
            <span className="text-5xl mb-4 block">✅</span>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              导入完成
            </h3>
            <div className="space-y-2 text-slate-600 dark:text-slate-400">
              <p>成功导入 <span className="font-bold text-green-600">{result.inserted}</span> 道题目</p>
              {result.skipped > 0 && (
                <p>跳过 <span className="font-bold text-amber-600">{result.skipped}</span> 道重复题目</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setPhase('input');
              setContent('');
              setResult(null);
            }}
            className="btn-secondary"
          >
            继续导入
          </button>
          <button onClick={() => router.push('/study')} className="btn-primary">
            开始刷题
          </button>
        </div>
      </div>
    );
  }

  return null;
}
