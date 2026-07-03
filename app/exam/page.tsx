'use client';

// ============================================
// 模拟考试 - 固定题型与分值
// 单选30×1 + 多选10×2 + 判断20×1 + 简答2×7 + 材料分析1×8 = 100分
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/app/providers';
import { Question, QuestionType, EXAM_FIXED_CONFIG } from '@/lib/types';
import { saveExamRecord } from '@/lib/storage';
import { shuffle, isAnswerCorrect, splitMergedOptions, getDisplayAnswer, TYPE_BADGE_CLASS, TYPE_LABEL } from '@/lib/quiz-utils';

// ---- 内联考试答题卡片 ----
function ExamCard({ question, qNum, total, scorePerQ, onAnswer, onNext, onPrev, submitted }: {
  question: Question; qNum: number; total: number; scorePerQ: number;
  onAnswer: (a: string, correct: boolean) => void;
  onNext: () => void; onPrev: () => void;
  submitted: boolean;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [shuffled, setShuffled] = useState<string[]>([]);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  useEffect(() => {
    const raw = splitMergedOptions([...question.options]);
    if (raw.length > 0) setShuffled(shuffle(raw));
    else setShuffled([]);
    setSelected(new Set()); setLocalSubmitted(false); setCorrect(false);
  }, [question.id, question.options]);

  const toggle = (i: number) => {
    if (localSubmitted) return;
    setSelected(prev => {
      const n = new Set(prev);
      if (question.type === 'single' || question.type === 'judge') { n.clear(); n.add(i); }
      else { n.has(i) ? n.delete(i) : n.add(i); }
      return n;
    });
  };

  const submit = () => {
    if (localSubmitted || selected.size === 0) return;
    const userAns = Array.from(selected).map(i => shuffled[i]).join('');
    const orig = splitMergedOptions([...question.options]);
    const ok = isAnswerCorrect(userAns, question.answer, question.type, orig);
    setCorrect(ok); setLocalSubmitted(true); onAnswer(userAns, ok);
  };

  const os = (i: number) => {
    if (!localSubmitted) return selected.has(i) ? 'option-cyber option-cyber-selected' : 'option-cyber';
    const orig = splitMergedOptions([...question.options]);
    const displayAns = getDisplayAnswer(question.answer, orig);
    const ct = displayAns.replace(/\s+/g, ''); const ot = (shuffled[i] || '').replace(/\s+/g, '');
    if (ot && ct.includes(ot)) return 'option-cyber option-cyber-correct';
    if (selected.has(i)) return 'option-cyber option-cyber-wrong';
    return 'option-cyber opacity-50';
  };

  const tb = TYPE_BADGE_CLASS;
  const tl = TYPE_LABEL;

  return (
    <div className="cyber-card" style={{ borderLeft: '2px solid rgba(139,92,246,0.3)' }}>
      <div className="cyber-card-body">
        <div className="flex items-center justify-between mb-4">
          <span className={tb[question.type]}>{tl[question.type]}</span>
          <div>
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>第 {qNum}/{total} 题</span>
            <span className="font-mono text-[10px] ml-2" style={{ color: 'var(--neon-purple)' }}>+{scorePerQ}分</span>
          </div>
        </div>
        <p className="text-base leading-relaxed mb-5" style={{ color: 'var(--text-main)' }}>{question.title}</p>
        {question.type === 'material' && question.subQuestions?.map((sq, i) => (
          <div key={i} className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--neon-cyan)' }}>子题{i + 1}: {sq.title}</p>
          </div>
        ))}
        {question.type !== 'essay' && shuffled.length > 0 && (
          <div className="mb-4">
            {shuffled.map((opt, i) => (
              <button key={i} onClick={() => toggle(i)} disabled={localSubmitted} className={os(i)}>
                <span className="inline-flex items-center justify-center w-7 h-7 rounded font-mono text-xs font-bold mr-3"
                  style={{ background: selected.has(i) && !localSubmitted ? 'rgba(139,92,246,0.15)' : 'rgba(30,41,59,0.8)', border: `1px solid ${selected.has(i) && !localSubmitted ? 'var(--neon-purple)' : 'var(--border-subtle)'}`, color: selected.has(i) && !localSubmitted ? 'var(--neon-purple)' : 'var(--text-dim)' }}>
                  {String.fromCharCode(65 + i)}</span>
                <span className="flex-1 text-sm">{opt}</span>
              </button>
            ))}
          </div>
        )}
        {question.type === 'essay' && (
          <textarea className="w-full min-h-[100px] p-3 rounded-lg text-sm outline-none mb-4" style={{ background: 'rgba(17,24,39,0.8)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
            placeholder="> 输入你的答案..." disabled={localSubmitted}
            onChange={e => { const s = new Set<number>(); if (e.target.value) s.add(0); setSelected(s); }} />
        )}
        {!localSubmitted && <button onClick={submit} disabled={selected.size === 0} className="btn-cyber w-full" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(0,229,255,0.2))', color: 'var(--neon-purple)' }}>⏎ 提交答案</button>}
        {localSubmitted && (
          <div className={`analysis-panel mt-3 ${correct ? 'analysis-panel-correct' : 'analysis-panel-wrong'}`}>
            <span className="font-mono text-xs" style={{ color: correct ? 'var(--neon-green)' : 'var(--neon-red)' }}>
              {correct ? '[ 正确 ]' : `[ 错误 ] 正确答案: ${getDisplayAnswer(question.answer, splitMergedOptions([...question.options]))}`}
            </span>
          </div>
        )}
        <div className="flex justify-between mt-6 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={onPrev} disabled={qNum <= 1} className="btn-ghost-cyber text-xs">← 上一题</button>
          <button onClick={onNext} disabled={qNum >= total} className="btn-cyber text-xs">下一题 →</button>
        </div>
      </div>
    </div>
  );
}

// ---- 主考试页面 ----
export default function ExamPage() {
  const router = useRouter();
  const { progress, updateProgress } = useApp();
  const [phase, setPhase] = useState<'ready' | 'exam' | 'result'>('ready');
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, { answer: string; correct: boolean; score: number }>>(new Map());
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60分钟
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ total: number; score: number; maxScore: number; accuracy: number; duration: number } | null>(null);
  const startTime = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 倒计时
  useEffect(() => {
    if (phase !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // 开始考试
  const startExam = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/questions?pageSize=500');
      const d = await r.json();
      if (!d.success) return;

      const all: Question[] = d.data.items;
      const byType = (t: QuestionType) => shuffle(all.filter((q: Question) => q.type === t));

      const picked: Question[] = [
        ...byType('single').slice(0, EXAM_FIXED_CONFIG.single.count),
        ...byType('multiple').slice(0, EXAM_FIXED_CONFIG.multiple.count),
        ...byType('judge').slice(0, EXAM_FIXED_CONFIG.judge.count),
        ...byType('essay').slice(0, EXAM_FIXED_CONFIG.essay.count),
        ...byType('material').slice(0, EXAM_FIXED_CONFIG.material.count),
      ];

      setExamQuestions(shuffle(picked));
      setCurrentIndex(0);
      setAnswers(new Map());
      startTime.current = Date.now();
      setPhase('exam');
    } catch { }
    finally { setLoading(false); }
  };

  // 记录答案
  const handleAnswer = (qid: string, answer: string, correct: boolean) => {
    const q = examQuestions.find(qq => qq.id === qid);
    if (!q) return;
    const score = correct
      ? q.type === 'essay' ? EXAM_FIXED_CONFIG.essay.score
        : q.type === 'material' ? EXAM_FIXED_CONFIG.material.score
          : q.type === 'multiple' ? EXAM_FIXED_CONFIG.multiple.score
            : EXAM_FIXED_CONFIG.single.score
      : 0;
    setAnswers(prev => { const n = new Map(prev); n.set(qid, { answer, correct, score }); return n; });
  };

  // 交卷
  const handleSubmit = () => {
    const duration = Math.round((Date.now() - startTime.current) / 1000);
    let totalScore = 0;
    answers.forEach(a => { totalScore += a.score; });
    const accuracy = examQuestions.length > 0 ? Math.round((Array.from(answers.values()).filter(a => a.correct).length / examQuestions.length) * 100) : 0;
    setResult({ total: examQuestions.length, score: totalScore, maxScore: EXAM_FIXED_CONFIG.totalScore, accuracy, duration });
    setPhase('result');

    // 保存记录
    saveExamRecord({ totalQuestions: examQuestions.length, userScore: totalScore, totalScore: EXAM_FIXED_CONFIG.totalScore, accuracy, duration, examTime: new Date().toISOString(), answerDetails: Array.from(answers.entries()).map(([qid, a]) => ({ question_id: qid, is_correct: a.correct, score: a.score })) });
    updateProgress({ todayCompleted: progress.todayCompleted + examQuestions.length });
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const isWarning = timeLeft <= 300;

  // ---- 准备阶段 ----
  if (phase === 'ready') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="cyber-card text-center" style={{ borderLeft: '3px solid rgba(139,92,246,0.5)' }}>
          <div className="cyber-card-body py-8">
            <div className="font-mono text-3xl mb-4 glow-cyan" style={{ color: 'var(--neon-purple)' }}>◈ EXAM</div>
            <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>模拟考试 · 固定题型与分值</p>
            <div className="space-y-2 mb-6 text-left max-w-xs mx-auto">
              {[
                { t: '单选题', n: EXAM_FIXED_CONFIG.single.count, s: EXAM_FIXED_CONFIG.single.score, c: 'var(--neon-cyan)' },
                { t: '多选题', n: EXAM_FIXED_CONFIG.multiple.count, s: EXAM_FIXED_CONFIG.multiple.score, c: 'var(--neon-purple)' },
                { t: '判断题', n: EXAM_FIXED_CONFIG.judge.count, s: EXAM_FIXED_CONFIG.judge.score, c: 'var(--neon-amber)' },
                { t: '简答题', n: EXAM_FIXED_CONFIG.essay.count, s: EXAM_FIXED_CONFIG.essay.score, c: 'var(--neon-green)' },
                { t: '材料分析', n: EXAM_FIXED_CONFIG.material.count, s: EXAM_FIXED_CONFIG.material.score, c: 'var(--neon-red)' },
              ].map(r => (
                <div key={r.t} className="flex justify-between text-xs" style={{ color: 'var(--text-dim)' }}>
                  <span style={{ color: r.c }}>{r.t}</span>
                  <span className="font-mono">{r.n}题 × {r.s}分 = {r.n * r.s}分</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-2" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}>
                <span>合计</span>
                <span className="font-mono glow-cyan" style={{ color: 'var(--neon-cyan)' }}>{EXAM_FIXED_CONFIG.totalQuestions}题 · {EXAM_FIXED_CONFIG.totalScore}分</span>
              </div>
            </div>
            <div className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>⏱ 限时60分钟 · 时间耗尽自动交卷</div>
            <button onClick={startExam} disabled={loading} className="btn-cyber text-lg px-8" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(0,229,255,0.2))', color: 'var(--neon-purple)' }}>
              {loading ? 'LOADING...' : '▶ 开始考试'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- 考试阶段 ----
  if (phase === 'exam') {
    const answeredCount = answers.size;
    const currentQ = examQuestions[currentIndex];
    if (!currentQ) return null;

    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="cyber-card">
          <div className="p-3 flex items-center justify-between flex-wrap gap-2">
            <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>第 {currentIndex + 1}/{examQuestions.length} 题 · 已答{answeredCount}题</span>
            <div className={`font-mono font-bold text-lg ${isWarning ? 'glow-red' : ''}`} style={{ color: isWarning ? 'var(--neon-red)' : 'var(--neon-cyan)' }}>
              ⏱ {formatTime(timeLeft)}
            </div>
            <button onClick={handleSubmit} className="btn-danger-cyber text-xs">交卷</button>
          </div>
        </div>
        <ExamCard question={currentQ} qNum={currentIndex + 1} total={examQuestions.length}
          scorePerQ={currentQ.type === 'essay' ? EXAM_FIXED_CONFIG.essay.score : currentQ.type === 'material' ? EXAM_FIXED_CONFIG.material.score : currentQ.type === 'multiple' ? EXAM_FIXED_CONFIG.multiple.score : EXAM_FIXED_CONFIG.single.score}
          onAnswer={(a, c) => handleAnswer(currentQ.id, a, c)}
          onNext={() => { if (currentIndex < examQuestions.length - 1) { setCurrentIndex(p => p + 1); scrollTo(0, 0); } }}
          onPrev={() => { if (currentIndex > 0) { setCurrentIndex(p => p - 1); scrollTo(0, 0); } }}
          submitted={false} />
        {/* 答题卡 */}
        <div className="cyber-card"><div className="cyber-card-body">
          <div className="text-[10px] font-mono mb-2" style={{ color: 'var(--text-muted)' }}>答题卡</div>
          <div className="flex flex-wrap gap-1.5">
            {examQuestions.map((q, i) => (
              <button key={q.id} onClick={() => { setCurrentIndex(i); scrollTo(0, 0); }}
                className="w-7 h-7 rounded text-[10px] font-mono transition-all"
                style={{
                  background: i === currentIndex ? 'rgba(139,92,246,0.2)' : answers.has(q.id) ? 'rgba(0,229,255,0.1)' : 'rgba(17,24,39,0.8)',
                  border: `1px solid ${i === currentIndex ? 'var(--neon-purple)' : answers.has(q.id) ? 'var(--neon-cyan)' : 'var(--border-subtle)'}`,
                  color: i === currentIndex ? 'var(--neon-purple)' : answers.has(q.id) ? 'var(--neon-cyan)' : 'var(--text-muted)',
                }}>{i + 1}</button>
            ))}
          </div>
        </div></div>
      </div>
    );
  }

  // ---- 结果阶段 ----
  if (phase === 'result' && result) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="cyber-card text-center" style={{ borderLeft: '3px solid rgba(0,255,136,0.5)' }}>
          <div className="cyber-card-body py-8">
            <div className="data-readout text-5xl mb-2" style={{ color: result.accuracy >= 60 ? 'var(--neon-green)' : 'var(--neon-red)' }}>{result.accuracy}%</div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>得分 {result.score}/{result.maxScore} · 用时 {Math.floor(result.duration / 60)}分{result.duration % 60}秒</p>
            <div className="neon-progress h-2 mb-6"><div className="neon-progress-bar" style={{ width: `${result.accuracy}%` }} /></div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push('/')} className="btn-ghost-cyber text-xs">返回首页</button>
              <button onClick={() => { setPhase('ready'); setResult(null); }} className="btn-cyber text-xs">再来一次</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
