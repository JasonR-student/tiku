'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', icon: '⌂', label: '终端' },
  { href: '/study', icon: '▶', label: '刷题' },
  { href: '/exam', icon: '◈', label: '考试' },
  { href: '/wrong-book', icon: '⍟', label: '错题' },
  { href: '/favorites', icon: '◆', label: '收藏' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav md:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded transition-all duration-200"
            style={{
              color: isActive ? 'var(--neon-cyan)' : 'var(--text-muted)',
              textShadow: isActive ? '0 0 8px rgba(0,229,255,0.4)' : 'none',
            }}
          >
            <span className="text-lg font-mono">{item.icon}</span>
            <span className="text-[10px] tracking-wider">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
