'use client';

import { ReactNode } from 'react';
import { Brain } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div>
          <Link href="/" className="flex items-center gap-2 mb-12">
            <Brain className="w-10 h-10 text-primary-600" />
            <span className="font-bold text-2xl text-secondary-900 dark:text-secondary-100">
              API Error Lookup
            </span>
          </Link>
        </div>
        <div className="max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-bold text-secondary-900 dark:text-secondary-100 tracking-tight mb-6">
            智慧錯誤分析，讓除錯變得簡單
          </h1>
          <p className="text-lg text-secondary-600 dark:text-secondary-400 mb-8">
            貼上錯誤訊息，AI 秒級分析根本原因並提供修復建議。
            加入數千位開發者，提升除錯效率。
          </p>
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { value: '10K+', label: '錯誤已分析' },
              { value: '95%', label: '準確率' },
              { value: '< 2s', label: '平均回應' },
            ].map((stat, index) => (
              <div key={index}>
                <div className="text-2xl lg:text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {stat.value}
                </div>
                <div className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-secondary-500 dark:text-secondary-400">
          <span>支援語言：</span>
          {['JavaScript', 'TypeScript', 'Python', 'Go', 'Java', 'PHP', 'Rust', 'C#'].map((lang) => (
            <span key={lang} className="px-2 py-1 bg-secondary-100 dark:bg-secondary-800 rounded text-xs">
              {lang}
            </span>
          ))}
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}