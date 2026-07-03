'use client';

// ============================================
// 背题模式页面 - 直接展示答案与解析
// 支持手动翻页 + 自动翻页
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import QuestionCard from '@/components/QuestionCard';
import { useApp } from '@/app/providers';
import { Question, QuestionType, QuestionTypeLabels } from '@/lib/types';

export default function MemorizePage() {
  const { progress, updateProgress } = useApp();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoFlip, setAutoFlip] = useState(false);
  const [flipInterval, setFlipInterval] = useState(3); // 秒
  const [selectedTypes, setSelectedTypes] = useState<Set<QuestionType>>(
    new Set(['single', 'multiple', 'judge'])
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 加载题目
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('pageSize', '500');
      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      if (data.success) {
        const types = Array.from(selectedTypes);
        const filtered = data.data.items.filter((q: Question) => types.includes(q.type));
        setQuestions(progress.shuffleQuestions ? filtered.sort(() => Math.random() - 0.5) : filtered);
        setCurrentIndex(0);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedTypes, progress.shuffleQuestions]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // 自动翻页
  useEffect(() => {
    if (autoFlip && currentIndex < questions.length - 1) {
      timerRef.current = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, flipInterval * 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoFlip, currentIndex, questions.length, flipInterval]);

  const currentQ = questions[currentIndex] || null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-32 rounded-lg" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <span className="text-4xl mb-4 block">📭</span>
          <p className="text-slate-600 dark:text-slate-400">没有符合条件的题目</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          📖 背题模式
        </h2>

        <div className="flex items-center gap-3">
          {/* 自动翻页开关 */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <span className="text-slate-600 dark:text-slate-400">自动翻页</span>
            <button
              onClick={() => setAutoFlip(!autoFlip)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                autoFlip ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                  autoFlip ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          {/* 翻页间隔 */}
          {autoFlip && (
            <select
              value={flipInterval}
              onChange={(e) => setFlipInterval(parseInt(e.target.value))}
              className="input-field w-24 text-sm py-1"
            >
              <option value={1}>1秒</option>
              <option value={2}>2秒</option>
              <option value={3}>3秒</option>
              <option value={5}>5秒</option>
              <option value={10}>10秒</option>
            </select>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* 题目卡片 - 直接显示答案 */}
      {currentQ && (
        <QuestionCard
          key={`memorize-${currentQ.id}`}
          question={currentQ}
          mode="memorize"
          showAnswer={true}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          onNext={() => {
            if (currentIndex < questions.length - 1) {
              setCurrentIndex((prev) => prev + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          onPrev={() => {
            if (currentIndex > 0) {
              setCurrentIndex((prev) => prev - 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        />
      )}
    </div>
  );
}
