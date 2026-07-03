'use client';

// ============================================
// 题目卡片组件 - 刷题核心交互组件
// 支持单选、多选、判断、简答四种题型
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { Question, QuestionType, AiCache } from '@/lib/types';
import { useApp } from '@/app/providers';
import { useKeyboard } from '@/hooks/useKeyboard';

interface QuestionCardProps {
  question: Question;
  aiCache?: AiCache | null;
  mode: 'study' | 'exam' | 'memorize' | 'review'; // 使用场景
  questionNumber?: number;        // 题号
  totalQuestions?: number;        // 总题数
  onAnswer?: (answer: string | string[], isCorrect: boolean) => void;
  onNext?: () => void;
  onPrev?: () => void;
  showAnswer?: boolean;           // 背题模式直接显示答案
}

/** 随机打乱数组 */
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function QuestionCard({
  question,
  aiCache,
  mode,
  questionNumber = 1,
  totalQuestions = 1,
  onAnswer,
  onNext,
  onPrev,
  showAnswer = false,
}: QuestionCardProps) {
  const { progress } = useApp();
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    aiAnswer: string;
    finalAnswer: string;
    analysis: string;
    diffExplanation: string;
  } | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [optionMapping, setOptionMapping] = useState<Record<string, string>>({});

  // 初始化乱序选项
  useEffect(() => {
    if (question.options.length > 0 && mode !== 'memorize') {
      // 创建原始字母到内容的映射
      const originalMap: Record<string, string> = {};
      question.options.forEach((opt, i) => {
        originalMap[String.fromCharCode(65 + i)] = opt;
      });

      // 随机打乱字母顺序
      const letters = Object.keys(originalMap);
      const shuffled = shuffleArray(letters);
      
      const newMapping: Record<string, string> = {};
      shuffled.forEach((letter, i) => {
        newMapping[String.fromCharCode(65 + i)] = originalMap[letter];
      });

      setOptionMapping(newMapping);
      setShuffledOptions(shuffled.map((l) => originalMap[l]));
    } else {
      setShuffledOptions([...question.options]);
      const mapping: Record<string, string> = {};
      question.options.forEach((_, i) => {
        mapping[String.fromCharCode(65 + i)] = String.fromCharCode(65 + i);
      });
      setOptionMapping(mapping);
    }
  }, [question, mode]);

  // 重置状态（题目变化时）
  useEffect(() => {
    setSelectedOptions(new Set());
    setSubmitted(false);
    setIsCorrect(false);
    setAiResult(null);
    setAiLoading(false);
  }, [question.id]);

  /** 获取正确选项字母 */
  const getCorrectLetters = useCallback((): string[] => {
    return question.answer.replace(/[^A-Za-z]/g, '').toUpperCase().split('');
  }, [question.answer]);

  /** 获取选项字母标签 */
  const getOptionLetter = (index: number): string => {
    return String.fromCharCode(65 + index);
  };

  /** 选择/取消选项 */
  const toggleOption = useCallback(
    (letter: string) => {
      if (submitted) return;

      setSelectedOptions((prev) => {
        const next = new Set(prev);
        if (question.type === 'single' || question.type === 'judge') {
          // 单选：替换
          next.clear();
          next.add(letter);
        } else if (question.type === 'multiple') {
          // 多选：切换
          if (next.has(letter)) {
            next.delete(letter);
          } else {
            next.add(letter);
          }
        }
        return next;
      });
    },
    [submitted, question.type]
  );

  /** 判断答案是否正确 */
  const checkAnswer = useCallback(
    (selected: Set<string>): boolean => {
      const correctLetters = getCorrectLetters();
      const selectedLetters = Array.from(selected).sort();

      if (question.type === 'essay') return true; // 简答题不自动判断

      // 标准答案字母集合
      const correctSet = new Set(correctLetters);
      const selectedSet = new Set(selectedLetters);

      // 完全匹配
      return (
        correctSet.size === selectedSet.size &&
        [...correctSet].every((c) => selectedSet.has(c))
      );
    },
    [getCorrectLetters, question.type]
  );

  /** 获取答案对应的选项内容（乱序适配） */
  const getAnswerContent = useCallback(
    (answer: string): string => {
      const letters = answer.replace(/[^A-Za-z]/g, '').toUpperCase().split('');
      const reverseMapping: Record<string, string> = {};
      Object.entries(optionMapping).forEach(([newLetter, content]) => {
        const originalIndex = question.options.indexOf(content);
        if (originalIndex >= 0) {
          const originalLetter = String.fromCharCode(65 + originalIndex);
          reverseMapping[originalLetter] = newLetter;
        }
      });
      return letters.map((l) => reverseMapping[l] || l).join('');
    },
    [optionMapping, question.options]
  );

  /** 提交答案 */
  const handleSubmit = useCallback(async () => {
    if (submitted || selectedOptions.size === 0) return;

    const correct = checkAnswer(selectedOptions);
    setIsCorrect(correct);
    setSubmitted(true);

    // 构建用户答案字符串
    const userAnswer = Array.from(selectedOptions).sort().join('');

    // 通知父组件
    onAnswer?.(userAnswer, correct);

    // 学习模式：自动请求AI解析
    if (mode === 'study') {
      setAiLoading(true);
      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: question.id }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setAiResult(data.data);
        }
      } catch (err) {
        console.error('AI请求失败:', err);
      } finally {
        setAiLoading(false);
      }
    }
  }, [submitted, selectedOptions, checkAnswer, onAnswer, mode, question.id]);

  // 键盘快捷键
  useKeyboard({
    enabled: !submitted && mode !== 'memorize',
    onKey1: () => toggleOption(getOptionLetter(0)),
    onKey2: () => toggleOption(getOptionLetter(1)),
    onKey3: () => toggleOption(getOptionLetter(2)),
    onKey4: () => toggleOption(getOptionLetter(3)),
    onEnter: handleSubmit,
    onLeft: onPrev,
    onRight: onNext,
  });

  /** 选项样式 - 赛博主题 */
  const getOptionStyle = (letter: string) => {
    if (!submitted && mode !== 'memorize') {
      return selectedOptions.has(letter) ? 'option-cyber option-cyber-selected' : 'option-cyber';
    }
    if (mode === 'memorize' || showAnswer) {
      const correctLetters = getCorrectLetters();
      return correctLetters.includes(letter) ? 'option-cyber option-cyber-correct' : 'option-cyber opacity-50';
    }
    const correctLetters = getCorrectLetters();
    if (correctLetters.includes(letter)) return 'option-cyber option-cyber-correct';
    if (selectedOptions.has(letter) && !correctLetters.includes(letter)) return 'option-cyber option-cyber-wrong';
    return 'option-cyber opacity-50';
  };

  const typeBadgeClass: Record<QuestionType, string> = {
    single: 'cyber-badge cyber-badge-single',
    multiple: 'cyber-badge cyber-badge-multiple',
    judge: 'cyber-badge cyber-badge-judge',
    essay: 'cyber-badge cyber-badge-essay',
    material: 'cyber-badge cyber-badge-multiple',
  };

  const typeLabel: Record<QuestionType, string> = {
    single: 'SINGLE', multiple: 'MULTI', judge: 'JUDGE', essay: 'ESSAY', material: 'MATERIAL',
  };

  return (
    <div className="cyber-card" style={{borderLeft: '2px solid rgba(0,229,255,0.3)'}}>
      <div className="cyber-card-body">
        {/* 题号 & 题型 */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-xs tracking-wider" style={{color:'var(--text-muted)'}}>
            Q_{questionNumber.toString().padStart(3,'0')}<span className="opacity-30">/{totalQuestions}</span>
          </span>
          <span className={typeBadgeClass[question.type]}>
            {typeLabel[question.type]}
          </span>
        </div>

        {/* 题干 */}
        <div className="mb-6">
          <p className="text-base sm:text-lg leading-relaxed" style={{color:'var(--text-main)'}}>
            {question.title}
          </p>
        </div>

        {/* 选项 */}
        {question.type !== 'essay' && shuffledOptions.length > 0 && (
          <div className="mb-4">
            {shuffledOptions.map((option, index) => {
              const letter = getOptionLetter(index);
              return (
                <button
                  key={`${question.id}-${index}`}
                  onClick={() => toggleOption(letter)}
                  disabled={submitted || mode === 'memorize'}
                  className={getOptionStyle(letter)}
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded font-mono text-xs font-bold mr-3 flex-shrink-0"
                    style={{
                      background: selectedOptions.has(letter) && !submitted ? 'rgba(0,229,255,0.15)' : 'rgba(30,41,59,0.8)',
                      border: `1px solid ${selectedOptions.has(letter) && !submitted ? 'var(--neon-cyan)' : 'var(--border-subtle)'}`,
                      color: selectedOptions.has(letter) && !submitted ? 'var(--neon-cyan)' : 'var(--text-dim)',
                    }}>
                    {letter}
                  </span>
                  <span className="flex-1">{option}</span>
                  {submitted && getCorrectLetters().includes(letter) && (
                    <span className="ml-2 font-mono text-sm" style={{color:'var(--neon-green)'}}>✓</span>
                  )}
                  {submitted && selectedOptions.has(letter) && !getCorrectLetters().includes(letter) && (
                    <span className="ml-2 font-mono text-sm" style={{color:'var(--neon-red)'}}>✗</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 简答输入 */}
        {question.type === 'essay' && mode !== 'memorize' && (
          <div className="mb-4">
            <textarea
              className="w-full min-h-[120px] p-3 rounded-lg text-sm outline-none transition-all duration-200"
              style={{
                background: 'rgba(17,24,39,0.8)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
              }}
              placeholder="> 输入你的答案..."
              value={Array.from(selectedOptions).join('')}
              onChange={(e) => { const s = new Set<string>(); if (e.target.value) s.add(e.target.value); setSelectedOptions(s); }}
              disabled={submitted}
            />
          </div>
        )}

        {/* 提交按钮 */}
        {!submitted && mode !== 'memorize' && (
          <button onClick={handleSubmit} disabled={selectedOptions.size === 0} className="btn-cyber w-full mt-4">
            ⏎ 提交答案 [ENTER]
          </button>
        )}

        {/* AI加载 */}
        {aiLoading && (
          <div className="analysis-panel analysis-panel-ai flex items-center gap-3">
            <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{borderColor:'var(--neon-cyan)', borderTopColor:'transparent'}} />
            <span className="text-xs pulse-neon" style={{color:'var(--neon-cyan)'}}>NEURAL ENGINE PROCESSING...</span>
          </div>
        )}

        {/* 答案解析区域 */}
        {(submitted || mode === 'memorize' || showAnswer) && (
          <div className="mt-4 space-y-3 animate-slide-up">
            {mode !== 'memorize' && (
              <div className={`analysis-panel ${isCorrect ? 'analysis-panel-correct' : 'analysis-panel-wrong'}`}>
                <span className="font-mono text-xs" style={{color: isCorrect ? 'var(--neon-green)' : 'var(--neon-red)'}}>
                  {isCorrect ? '[ OK ] 回答正确' : `[ FAIL ] 正确答案: ${question.answer}`}
                </span>
              </div>
            )}
            {mode === 'memorize' && (
              <div className="analysis-panel analysis-panel-correct">
                <span className="font-mono text-xs" style={{color:'var(--neon-green)'}}>
                  [ ANSWER ] {question.answer}
                </span>
              </div>
            )}
            {question.analysis && (
              <div className="analysis-panel">
                <span className="font-mono text-xs" style={{color:'var(--text-dim)'}}>// 题库解析</span>
                <p className="mt-1 text-sm" style={{color:'var(--text-dim)'}}>{question.analysis}</p>
              </div>
            )}
            {aiResult && (
              <>
                {aiResult.finalAnswer && (
                  <div className="analysis-panel analysis-panel-ai">
                    <span className="font-mono text-xs glow-cyan" style={{color:'var(--neon-cyan)'}}>{'>'} AI_REVIEW</span>
                    <p className="mt-1 text-sm" style={{color:'var(--text-main)'}}>{aiResult.finalAnswer}</p>
                  </div>
                )}
                {aiResult.analysis && (
                  <div className="analysis-panel analysis-panel-ai">
                    <span className="font-mono text-xs" style={{color:'var(--neon-purple)'}}>{'>'} AI_ANALYSIS</span>
                    <p className="mt-1 text-sm whitespace-pre-wrap" style={{color:'var(--text-dim)'}}>{aiResult.analysis}</p>
                  </div>
                )}
                {aiResult.diffExplanation && (
                  <div className="analysis-panel" style={{borderColor:'rgba(255,179,0,0.2)'}}>
                    <span className="font-mono text-xs" style={{color:'var(--neon-amber)'}}>{'>'} DIFF_REPORT</span>
                    <p className="mt-1 text-sm whitespace-pre-wrap" style={{color:'var(--text-dim)'}}>{aiResult.diffExplanation}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 上下题 */}
        <div className="flex justify-between mt-6 pt-4" style={{borderTop:'1px solid var(--border-subtle)'}}>
          <button onClick={onPrev} disabled={questionNumber <= 1} className="btn-ghost-cyber text-xs">
            ← PREV
          </button>
          <button onClick={onNext} disabled={questionNumber >= totalQuestions} className="btn-cyber text-xs">
            NEXT →
          </button>
        </div>
      </div>
    </div>
  );
}
