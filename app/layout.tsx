import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from './providers';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'NEURAL·思政 | 智能刷题终端',
  description: '赛博朋克风思政题库AI刷题系统 - Neural Grid',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen pb-16">
        <AppProvider>
          <Navbar />
          <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
            {children}
          </main>
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
