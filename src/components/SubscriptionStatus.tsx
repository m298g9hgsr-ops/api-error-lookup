'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const SubscriptionStatus = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState<'active' | 'inactive' | 'unknown'>('unknown');

  const handleSubscriptionStatus = async () => {
    if (!session) {
      router.push('/login');
      return;
    }

    try {
      // 簡化版：直接切換狀態，實際應呼叫 API
      const newStatus = status === 'active' ? 'inactive' : 'active';
      setStatus(newStatus);
    } catch (e) {
      console.error('Error handling subscription status:', e);
    }
  };

  return (
    <button onClick={handleSubscriptionStatus} style={{ padding: '0.5rem 1rem' }}>
      {status === 'active' ? '取消訂閱' : '啟用訂閱'}
    </button>
  );
};

export default SubscriptionStatus;