'use client';

import { SubscriptionManager } from '@/components/SubscriptionManager';

export default function SubscriptionPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container-main py-8">
        <SubscriptionManager />
      </div>
    </div>
  );
}