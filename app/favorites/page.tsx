'use client';

// ============================================
// 收藏夹页面 - 收藏题目专项复习
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QuestionCard from '@/components/QuestionCard';
import { useApp } from '@/app/providers';
import { Question } from '@/lib/types';

export default function FavoritesPage() {
  const router = useRouter();
  const { progress, updateProgress } = useApp();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    if (progress.favorites.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const fetched: Question[] = [];
      for (const id of progress.favorites) {
        try {
          const res = await fetch(`/api/questions/${id}`);
          const data = await res.json();
          if (data.success) fetched.push(data.data);
        } catch { /* skip */ }
      }
      setQuestions(fetched);
      setCurrentIndex(0);
    } finally {
      setLoading(false);
    }
  }, [progress.favorites]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

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
          <span className="text-4xl mb-4 block">⭐</span>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            收藏夹为空，刷题时点击收藏按钮添加
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
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
        ⭐ 收藏夹 ({questions.length} 题)
      </h2>

      {currentQ && (
        <QuestionCard
          key={currentQ.id}
          question={currentQ}
          mode="study"
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
