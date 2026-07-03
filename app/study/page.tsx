'use client';

// ============================================
// 学习模式 - 选项强制乱序 + 答案文本比对 + 错题回池
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/app/providers';
import { Question, QuestionType, QuestionTypeLabels } from '@/lib/types';
import { shuffle, isAnswerCorrect, splitMergedOptions, getDisplayAnswer, TYPE_BADGE_CLASS, TYPE_LABEL } from '@/lib/quiz-utils';

// ---- 内联QuizCard（强制乱序 + 答案文本比对） ----
function QuizCard({ question, qNum, total, onAnswer, onNext, onPrev }: {
  question: Question; qNum: number; total: number;
  onAnswer: (a: string, correct: boolean) => void;
  onNext: () => void; onPrev: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<Record<string,string>|null>(null);
  const [aiRegenerating, setAiRegenerating] = useState(false);
  const [shuffled, setShuffled] = useState<string[]>([]);
  const [regenerated, setRegenerated] = useState(false);

  useEffect(() => {
    const raw = splitMergedOptions([...question.options]);
    if (raw.length > 0) setShuffled(shuffle(raw));
    else setShuffled([]);
    setSelected(new Set()); setSubmitted(false); setCorrect(false); setAiResult(null);
    setRegenerated(false);
  }, [question.id, question.options]);

  const toggle = (i: number) => {
    if (submitted) return;
    setSelected(prev => {
      const n = new Set(prev);
      if (question.type === 'single' || question.type === 'judge') { n.clear(); n.add(i); }
      else { n.has(i) ? n.delete(i) : n.add(i); }
      return n;
    });
  };

  // 请求AI（支持重新生成）
  const requestAi = async (forceRegen = false) => {
    setAiLoading(true); setAiRegenerating(forceRegen);
    try {
      const r = await fetch('/api/ai', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-device-id':localStorage.getItem('neural_device_id')||''},
        body:JSON.stringify({questionId:question.id, regenerate:forceRegen})
      });
      const d = await r.json();
      if (d.success) setAiResult(d.data);
    } catch {} finally { setAiLoading(false); setAiRegenerating(false); }
  };

  const submit = useCallback(async () => {
    if (submitted || selected.size === 0) return;
    const userAns = Array.from(selected).map(i => shuffled[i]).join('');
    const originalOpts = splitMergedOptions([...question.options]);
    const ok = isAnswerCorrect(userAns, question.answer, question.type, originalOpts);
    setCorrect(ok); setSubmitted(true); onAnswer(userAns, ok);
    setRegenerated(false);
    // 始终请求AI解析（对错都显示）
    if (question.type !== 'essay' && question.type !== 'material') {
      requestAi(false);
    }
    // 做对了自动2秒后跳下一题
    if (ok && onNext) {
      setTimeout(() => onNext(), 2000);
    }
  }, [submitted, selected, shuffled, question, onAnswer, onNext]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!submitted) { const n = parseInt(e.key); if (n>=1 && n<=Math.min(4,shuffled.length)) toggle(n-1); if (e.key==='Enter') submit(); }
      if (e.key==='ArrowRight') onNext(); if (e.key==='ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [submitted, shuffled.length, submit, onNext, onPrev]);

  const tb = TYPE_BADGE_CLASS;
  const tl = TYPE_LABEL;

  // 显示用答案文本
  const displayAnswer = () => getDisplayAnswer(question.answer, splitMergedOptions([...question.options]));

  const os = (i: number) => {
    if (!submitted) return selected.has(i) ? 'option-cyber option-cyber-selected' : 'option-cyber';
    const ct = question.answer.replace(/\s+/g,''); const ot = (shuffled[i]||'').replace(/\s+/g,'');
    if (ot && ct.includes(ot)) return 'option-cyber option-cyber-correct';
    if (selected.has(i)) return 'option-cyber option-cyber-wrong';
    return 'option-cyber opacity-50';
  };

  return (
    <div className="cyber-card" style={{borderLeft:'2px solid rgba(0,229,255,0.3)'}}>
      <div className="cyber-card-body">
        <div className="flex items-center justify-between mb-4">
          <span className={tb[question.type]}>{tl[question.type]}</span>
          <span className="font-mono text-xs" style={{color:'var(--text-muted)'}}>第 {qNum}/{total} 题</span>
        </div>
        <p className="text-base leading-relaxed mb-5" style={{color:'var(--text-main)'}}>{question.title}</p>
        {question.type==='material' && question.subQuestions?.map((sq,i)=>(
          <div key={i} className="mb-3 p-3 rounded-lg" style={{background:'rgba(17,24,39,0.6)',border:'1px solid var(--border-subtle)'}}>
            <p className="text-sm font-bold" style={{color:'var(--neon-cyan)'}}>子题{i+1}: {sq.title}</p>
          </div>
        ))}
        {question.type!=='essay' && shuffled.length>0 && (
          <div className="mb-4">
            {shuffled.map((opt,i)=>(
              <button key={i} onClick={()=>toggle(i)} disabled={submitted} className={os(i)}>
                <span className="inline-flex items-center justify-center w-7 h-7 rounded font-mono text-xs font-bold mr-3"
                  style={{background:selected.has(i)&&!submitted?'rgba(0,229,255,0.15)':'rgba(30,41,59,0.8)',border:`1px solid ${selected.has(i)&&!submitted?'var(--neon-cyan)':'var(--border-subtle)'}`,color:selected.has(i)&&!submitted?'var(--neon-cyan)':'var(--text-dim)'}}>
                  {String.fromCharCode(65+i)}</span>
                <span className="flex-1 text-sm">{opt}</span>
              </button>
            ))}
          </div>
        )}
        {question.type==='essay' && (
          <textarea className="w-full min-h-[100px] p-3 rounded-lg text-sm outline-none mb-4" style={{background:'rgba(17,24,39,0.8)',border:'1px solid var(--border-subtle)',color:'var(--text-main)'}}
            placeholder="> 输入你的答案..." disabled={submitted}
            onChange={e=>{const s=new Set<number>(); if(e.target.value)s.add(0);setSelected(s);}} />
        )}
        {!submitted && <button onClick={submit} disabled={selected.size===0} className="btn-cyber w-full">⏎ 提交答案 [Enter]</button>}
        {aiLoading && (
          <div className="analysis-panel analysis-panel-ai flex items-center gap-3 mt-4">
            <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{borderColor:'var(--neon-cyan)',borderTopColor:'transparent'}}/>
            <span className="text-xs pulse-neon" style={{color:'var(--neon-cyan)'}}>AI 分析中...</span>
          </div>
        )}
        {submitted && (
          <div className="mt-4 space-y-3">
            <div className={`analysis-panel ${correct?'analysis-panel-correct':'analysis-panel-wrong'}`}>
              <span className="font-mono text-xs" style={{color:correct?'var(--neon-green)':'var(--neon-red)'}}>
                {correct ? '[ 正确 ]' : `[ 错误 ] 正确答案: ${displayAnswer()}`}
              </span>
            </div>
            {question.analysis && <div className="analysis-panel"><span className="font-mono text-xs" style={{color:'var(--text-dim)'}}>// 解析</span><p className="mt-1 text-sm" style={{color:'var(--text-dim)'}}>{question.analysis}</p></div>}
            {aiResult?.finalAnswer && <div className="analysis-panel analysis-panel-ai"><span className="font-mono text-xs glow-cyan" style={{color:'var(--neon-cyan)'}}>{'>'} AI_REVIEW</span><p className="mt-1 text-sm" style={{color:'var(--text-main)'}}>{aiResult.finalAnswer}</p></div>}
            {aiResult?.analysis && <div className="analysis-panel analysis-panel-ai"><span className="font-mono text-xs" style={{color:'var(--neon-purple)'}}>{'>'} AI_ANALYSIS</span><p className="mt-1 text-sm whitespace-pre-wrap" style={{color:'var(--text-dim)'}}>{aiResult.analysis}</p></div>}
            {/* 重新生成按钮（1次机会） */}
            {submitted && !regenerated && aiResult && !aiLoading && (
              <button onClick={() => { requestAi(true); setRegenerated(true); }}
                disabled={aiRegenerating}
                className="btn-ghost-cyber text-xs w-full mt-2"
                style={{color:'var(--neon-amber)', borderColor:'rgba(255,179,0,0.3)'}}>
                {aiRegenerating ? '∿ REGENERATING...' : '↻ 重新生成AI解析 (剩余1次)'}
              </button>
            )}
          </div>
        )}
        <div className="flex justify-between mt-6 pt-4" style={{borderTop:'1px solid var(--border-subtle)'}}>
          <button onClick={onPrev} disabled={qNum<=1} className="btn-ghost-cyber text-xs">← 上一题</button>
          <span className="text-[10px] font-mono" style={{color:'var(--text-muted)'}}>[ 1-{Math.min(4,shuffled.length)}选择 Enter提交 ←→切换 ]</span>
          <button onClick={onNext} disabled={qNum>=total} className="btn-cyber text-xs">下一题 →</button>
        </div>
      </div>
    </div>
  );
}

// ---- 主页面 ----
export default function StudyPage() {
  const router = useRouter();
  const { progress, updateProgress } = useApp();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<QuestionType>>(new Set(progress.selectedTypes));

  const loadQuestions = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const types = Array.from(selectedTypes);
      if (types.length===0) { setError('至少选择一种题型'); setLoading(false); return; }
      const r = await fetch('/api/questions?pageSize=500');
      const d = await r.json();
      if (d.success) {
        let items: Question[] = d.data.items.filter((q:Question)=>types.includes(q.type));
        if (progress.shuffleQuestions) items = shuffle(items);
        setQuestions(items); setCurrentIndex(0);
      } else setError(d.error||'加载失败');
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  }, [selectedTypes, progress.shuffleQuestions]);

  useEffect(()=>{loadQuestions();},[loadQuestions]);

  const currentQ = questions[currentIndex]||null;

  const handleAnswer = useCallback((_answer: string, isCorrect: boolean) => {
    if (!currentQ) return;
    if (!isCorrect) {
      // 错题回池：在后面随机位置插入一份副本，不改变当前位置
      setQuestions(prev=>{
        const next=[...prev];
        const pos=currentIndex+5+Math.floor(Math.random()*Math.max(1,(next.length-currentIndex-5)));
        next.splice(Math.min(pos,next.length),0,{...currentQ}); // 插入副本
        return next;
      });
    }
    updateProgress({ todayCompleted: progress.todayCompleted+1 });
  }, [currentQ, currentIndex, progress.todayCompleted, updateProgress]);

  const goNext = ()=> { if(currentIndex<questions.length-1) { setCurrentIndex(p=>p+1); scrollTo(0,0); } };
  const goPrev = ()=> { if(currentIndex>0) { setCurrentIndex(p=>p-1); scrollTo(0,0); } };

  if (loading) return <div className="space-y-4"><div className="skeleton-cyber h-8 w-32"/><div className="skeleton-cyber h-64"/></div>;
  if (error) return <div className="cyber-card text-center py-12"><p className="text-sm mb-4" style={{color:'var(--text-dim)'}}>{error}</p><button onClick={loadQuestions} className="btn-cyber">重试</button></div>;
  if (questions.length===0) return <div className="cyber-card text-center py-12"><p className="text-sm mb-4" style={{color:'var(--text-dim)'}}>无题目，请先导入题库</p><button onClick={()=>router.push('/')} className="btn-cyber">返回</button></div>;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-mono text-sm font-bold glow-cyan" style={{color:'var(--neon-cyan)'}}>▸ 学习模式</h2>
        <div className="flex gap-2 items-center">
          {(['single','multiple','judge'] as QuestionType[]).map(t=>(
            <button key={t} onClick={()=>setSelectedTypes(prev=>{const n=new Set(prev); n.has(t)?(n.size>1&&n.delete(t)):n.add(t); return n;})}
              className="px-2 py-1 rounded text-[10px] font-mono transition-all" style={{
                background:selectedTypes.has(t)?'rgba(0,229,255,0.12)':'rgba(17,24,39,0.8)',
                border:`1px solid ${selectedTypes.has(t)?'rgba(0,229,255,0.4)':'var(--border-subtle)'}`,
                color:selectedTypes.has(t)?'var(--neon-cyan)':'var(--text-muted)'}}>
              {QuestionTypeLabels[t]}</button>
          ))}
          <button onClick={()=>{updateProgress({shuffleQuestions:!progress.shuffleQuestions});loadQuestions();}}
            className="px-2 py-1 rounded text-[10px] font-mono transition-all" style={{
              background:progress.shuffleQuestions?'rgba(139,92,246,0.12)':'rgba(17,24,39,0.8)',
              border:`1px solid ${progress.shuffleQuestions?'rgba(139,92,246,0.4)':'var(--border-subtle)'}`,
              color:progress.shuffleQuestions?'var(--neon-purple)':'var(--text-muted)'}}>
            {progress.shuffleQuestions?'乱序':'顺序'}</button>
        </div>
      </div>
      <div className="neon-progress h-1"><div className="neon-progress-bar" style={{width:`${((currentIndex+1)/questions.length)*100}%`}}/></div>
      <div className="text-[10px] font-mono text-right" style={{color:'var(--text-muted)'}}>第 {currentIndex+1} / {questions.length} 题</div>
      {currentQ && <QuizCard question={currentQ} qNum={currentIndex+1} total={questions.length} onAnswer={handleAnswer} onNext={goNext} onPrev={goPrev} />}
    </div>
  );
}
