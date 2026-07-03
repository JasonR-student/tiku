'use client';

// ============================================
// 设置页面 - 全局刷题参数配置
// ============================================

import { useState } from 'react';
import { useApp } from '@/app/providers';
import { QuestionType, QuestionTypeLabels } from '@/lib/types';

export default function SettingsPage() {
  const { progress, updateProgress } = useApp();

  const [dailyGoal, setDailyGoal] = useState(progress.dailyGoal || 50);

  const saveDailyGoal = () => {
    updateProgress({ dailyGoal });
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-xl font-bold" style={{color:'var(--text-main)'}}>⚙ SYSTEM CONFIG</h2>

      {/* 刷题设置 */}
      <div className="cyber-card">
        <div className="cyber-card-body space-y-4">
          <h3 className="font-bold font-mono text-xs tracking-wider" style={{color:'var(--neon-cyan)'}}>{'>'} QUIZ_CONFIG</h3>

          {/* 自动跳下一题 */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm" style={{color:'var(--text-dim)'}}>提交后自动跳下一题</span>
            <button
              onClick={() => updateProgress({ autoNext: !progress.autoNext })}
              className={`neon-switch ${progress.autoNext ? 'neon-switch-on' : ''}`}
            >
              <span className="neon-switch-knob" />
            </button>
          </label>

          {/* 题目顺序乱序 */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm" style={{color:'var(--text-dim)'}}>题目顺序自动乱序</span>
            <button
              onClick={() => updateProgress({ shuffleQuestions: !progress.shuffleQuestions })}
              className={`neon-switch ${progress.shuffleQuestions ? 'neon-switch-on' : ''}`}
            >
              <span className="neon-switch-knob" />
            </button>
          </label>
        </div>
      </div>

      {/* 每日目标 */}
      <div className="cyber-card">
        <div className="cyber-card-body space-y-4">
          <h3 className="font-bold font-mono text-xs tracking-wider" style={{color:'var(--neon-cyan)'}}>{'>'} DAILY_TARGET</h3>
          <div className="flex items-center gap-3">
            <input
              type="number" min={5} max={500} step={5}
              value={dailyGoal}
              onChange={(e) => setDailyGoal(parseInt(e.target.value) || 50)}
              className="w-24 px-3 py-2 rounded-lg text-sm outline-none"
              style={{background:'rgba(17,24,39,0.8)', border:'1px solid var(--border-subtle)', color:'var(--text-main)'}}
            />
            <span className="text-xs" style={{color:'var(--text-muted)'}}>题/天</span>
            <button onClick={saveDailyGoal} className="btn-cyber text-xs">SAVE</button>
          </div>
        </div>
      </div>

      {/* 默认题型 */}
      <div className="cyber-card">
        <div className="cyber-card-body space-y-3">
          <h3 className="font-bold font-mono text-xs tracking-wider" style={{color:'var(--neon-cyan)'}}>{'>'} DEFAULT_TYPES</h3>
          <div className="flex flex-wrap gap-2">
            {(['single', 'multiple', 'judge', 'essay'] as QuestionType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  const types = progress.selectedTypes.includes(type)
                    ? progress.selectedTypes.filter((t) => t !== type)
                    : [...progress.selectedTypes, type];
                  if (types.length > 0) updateProgress({ selectedTypes: types });
                }}
                className="px-3 py-1.5 rounded text-xs font-mono transition-all duration-200"
                style={{
                  background: progress.selectedTypes.includes(type) ? 'rgba(0,229,255,0.12)' : 'rgba(17,24,39,0.8)',
                  border: `1px solid ${progress.selectedTypes.includes(type) ? 'rgba(0,229,255,0.4)' : 'var(--border-subtle)'}`,
                  color: progress.selectedTypes.includes(type) ? 'var(--neon-cyan)' : 'var(--text-muted)',
                }}
              >
                {QuestionTypeLabels[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 键盘快捷键 */}
      <div className="cyber-card">
        <div className="cyber-card-body space-y-2">
          <h3 className="font-bold font-mono text-xs tracking-wider" style={{color:'var(--neon-cyan)'}}>{'>'} KEYBINDS</h3>
          <div className="text-xs space-y-1" style={{color:'var(--text-muted)'}}>
            <p><kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{background:'rgba(30,41,59,0.8)', border:'1px solid var(--border-subtle)'}}>1-4</kbd> 选择选项</p>
            <p><kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{background:'rgba(30,41,59,0.8)', border:'1px solid var(--border-subtle)'}}>ENTER</kbd> 提交答案</p>
            <p><kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{background:'rgba(30,41,59,0.8)', border:'1px solid var(--border-subtle)'}}>← →</kbd> 切换题目</p>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-body space-y-2">
          <h3 className="font-bold text-slate-700 dark:text-slate-300">⌨️ 键盘快捷键</h3>
          <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
            <p><kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-xs">1-4</kbd> 选择对应选项</p>
            <p><kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-xs">Enter</kbd> 提交答案</p>
            <p><kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-xs">← →</kbd> 切换上下题</p>
          </div>
        </div>
      </div>
    </div>
  );
}
