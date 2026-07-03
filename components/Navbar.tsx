'use client';

// ============================================
// 赛博终端顶部导航
// ============================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <nav className="sticky top-0 z-40 border-b" style={{
      background: 'rgba(6,11,20,0.92)',
      borderColor: 'var(--border-subtle)',
      backdropFilter: 'blur(12px)',
    }}>
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="text-lg font-mono font-bold tracking-wider glow-cyan" style={{color:'var(--neon-cyan)'}}>
            &gt;_
          </span>
          <span className="text-sm font-bold tracking-wide" style={{color:'var(--text-main)'}}>
            NEURAL<span style={{color:'var(--neon-cyan)'}}>·思政</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {!isHome && <Link href="/" className="btn-ghost-cyber text-xs">⌂ 终端</Link>}
        </div>
      </div>
    </nav>
  );
}
