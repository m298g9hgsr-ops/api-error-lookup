'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.push('/login');
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>儀表板</h1>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: '#3b82f6' }}>首頁</Link>
          <Link href="/dashboard/history" style={{ textDecoration: 'none', color: '#3b82f6' }}>錯誤歷史</Link>
          <Link href="/dashboard/subscription" style={{ textDecoration: 'none', color: '#3b82f6' }}>訂閱</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
};

export default DashboardLayout;