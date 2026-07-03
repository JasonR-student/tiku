'use client';

// ============================================
// 终端首页 - 仅保留学习&考试双入口
// ============================================

import Link from 'next/link';
import { useApp } from '@/app/providers';
import { useEffect, useState } from 'react';
import { EXAM_FIXED_CONFIG } from '@/lib/types';

export default function HomePage() {
  const { progress } = useApp();
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [typeCounts, setTypeCounts] = useState<Record<string,number>>({});

  useEffect(() => {
    // 直接从静态文件读取统计数据（零数据库依赖，构建时预计算，100%可靠）
    fetch('/stats.json')
      .then(r => r.json())
      .then(d => {
        setQuestionCount(d.total);
        const { total, ...counts } = d;
        setTypeCounts(counts);
      })
      .catch((err) => { console.error('[Home] 统计数据加载失败:', err); });
  }, []);

  const todayDone = progress.todayCompleted || 0;
  const todayGoal = progress.dailyGoal || 50;
  const goalPercent = Math.min(100, Math.round((todayDone / todayGoal) * 100));

  return (
    <div className="space-y-5 relative z-10 max-w-lg mx-auto">
      {/* 终端头部 */}
      <div className="cyber-card">
        <div className="cyber-card-body text-center">
          <div className="font-mono text-xs tracking-widest mb-3 glow-cyan" style={{color:'var(--neon-cyan)'}}>
            ▸ NEURAL GRID QUIZ ENGINE ◂
          </div>

          {/* 题库数据 */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { v: questionCount ?? '---', l: '题库', c: 'var(--neon-cyan)' },
              { v: typeCounts['single']??'-', l: '单选', c: 'var(--neon-purple)' },
              { v: typeCounts['multiple']??'-', l: '多选', c: 'var(--neon-amber)' },
              { v: typeCounts['judge']??'-', l: '判断', c: 'var(--neon-green)' },
            ].map(s => (
              <div key={s.l}>
                <div className="data-readout text-lg" style={{color:s.c, textShadow:`0 0 10px ${s.c}40`}}>{s.v}</div>
                <div className="text-[10px] tracking-wider mt-0.5" style={{color:'var(--text-muted)'}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* 每日进度 */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono" style={{color:'var(--text-dim)'}}>
              <span>DAILY PROGRESS</span>
              <span style={{color:'var(--neon-cyan)'}}>{todayDone}/{todayGoal}</span>
            </div>
            <div className="neon-progress h-1">
              <div className="neon-progress-bar" style={{width:`${goalPercent}%`}} />
            </div>
          </div>
        </div>
      </div>

      {/* 双入口 */}
      <div className="grid grid-cols-1 gap-3">
        <Link href="/study" className="cyber-card group cursor-pointer block"
          style={{borderLeft:'3px solid rgba(0,229,255,0.5)'}}>
          <div className="cyber-card-body flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center font-mono text-2xl"
              style={{background:'rgba(0,229,255,0.1)', color:'var(--neon-cyan)'}}>▶</div>
            <div className="flex-1">
              <div className="text-lg font-bold" style={{color:'var(--text-main)'}}>学习模式</div>
              <div className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>逐题练习 · AI即时解析 · 错题自动回池 · 选项自动乱序</div>
            </div>
            <span className="font-mono text-xs group-hover:translate-x-1 transition-transform" style={{color:'var(--neon-cyan)'}}>→</span>
          </div>
        </Link>

        <Link href="/exam" className="cyber-card group cursor-pointer block"
          style={{borderLeft:'3px solid rgba(139,92,246,0.5)'}}>
          <div className="cyber-card-body flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center font-mono text-2xl"
              style={{background:'rgba(139,92,246,0.1)', color:'var(--neon-purple)'}}>◈</div>
            <div className="flex-1">
              <div className="text-lg font-bold" style={{color:'var(--text-main)'}}>模拟考试</div>
              <div className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>
                {EXAM_FIXED_CONFIG.totalQuestions}题 · 100分 · 单选{EXAM_FIXED_CONFIG.single.count}+多选{EXAM_FIXED_CONFIG.multiple.count}+判断{EXAM_FIXED_CONFIG.judge.count}+简答{EXAM_FIXED_CONFIG.essay.count}+材料分析{EXAM_FIXED_CONFIG.material.count}
              </div>
            </div>
            <span className="font-mono text-xs group-hover:translate-x-1 transition-transform" style={{color:'var(--neon-purple)'}}>→</span>
          </div>
        </Link>
      </div>

      {/* 底部状态 */}
      <div className="text-center py-1">
        <span className="text-[10px] font-mono tracking-widest" style={{color:'var(--text-muted)'}}>
          SYS_OK · {new Date().toLocaleDateString('zh-CN')} · v2.0
        </span>
      </div>
    </div>
  );
}
