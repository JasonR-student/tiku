'use client';

// ============================================
// 错题本页面 - 错题专项练习
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QuestionCard from '@/components/QuestionCard';
import { useApp } from '@/app/providers';
import { Question } from '@/lib/types';

export default function WrongBookPage() {
  const router = useRouter();
  const { progress, updateProgress } = useApp();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // 加载错题
  const loadWrongQuestions = useCallback(async () => {
    if (progress.wrongBook.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 逐个获取错题详情
      const fetched: Question[] = [];
      for (const id of progress.wrongBook) {
        try {
          const res = await fetch(`/api/questions/${id}`);
          const data = await res.json();
          if (data.success) {
            fetched.push(data.data);
          }
        } catch {
          // 跳过获取失败的题目
        }
      }
      setQuestions(fetched);
      setCurrentIndex(0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [progress.wrongBook]);

  useEffect(() => {
    loadWrongQuestions();
  }, [loadWrongQuestions]);

  const currentQ = questions[currentIndex] || null;

  // 掌握标记（移出错题本）
  const markMastered = useCallback(
    (questionId: string) => {
      const newWrongBook = progress.wrongBook.filter((id) => id !== questionId);
      updateProgress({ wrongBook: newWrongBook });
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      if (currentIndex >= questions.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    },
    [progress.wrongBook, updateProgress, currentIndex, questions.length]
  );

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
          <span className="text-4xl mb-4 block">🎉</span>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            错题本为空，继续保持！
          </p>
          <button onClick={() => router.push('/study')} className="btn-primary">
            去刷题
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          📕 错题本 ({questions.length} 题)
        </h2>
      </div>

      {currentQ && (
        <>
          <QuestionCard
            key={currentQ.id}
            question={currentQ}
            mode="study"
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
            onAnswer={(_, isCorrect) => {
              if (isCorrect) {
                // 答对了提示是否移出错题本
              }
            }}
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

          {/* 操作按钮 */}
          <div className="flex justify-center gap-3">
            <button
              onClick={() => markMastered(currentQ.id)}
              className="btn-outline text-green-600 border-green-300 text-sm"
            >
              ✅ 标记已掌握
            </button>
            <button
              onClick={() => {
                const newFavorites = progress.favorites.includes(currentQ.id)
                  ? progress.favorites.filter((id) => id !== currentQ.id)
                  : [...progress.favorites, currentQ.id];
                updateProgress({ favorites: newFavorites });
              }}
              className={`btn-outline text-sm ${
                progress.favorites.includes(currentQ.id) ? 'text-amber-500 border-amber-300' : ''
              }`}
            >
              {progress.favorites.includes(currentQ.id) ? '⭐ 取消收藏' : '☆ 收藏此题'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
