'use client';

import { Suspense } from 'react';
import { DashboardHistory } from '@/components/DashboardHistory';

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container-main py-8">
        <Suspense fallback={<div className="py-8 text-center text-muted-foreground">載入中…</div>}>
          <DashboardHistory />
        </Suspense>
      </div>
    </div>
  );
}