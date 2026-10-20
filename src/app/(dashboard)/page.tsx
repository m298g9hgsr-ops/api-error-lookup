'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DashboardPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [errorLogs, setErrorLogs] = useState<Array<{ id: string; error: string; timestamp: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session) {
      setIsLoading(false);
      // 模擬獲取錯誤日誌
      fetch('/api/error-history')
        .then(res => res.json())
        .then(data => setErrorLogs(data))
        .catch(err => console.error(err));
    }
  }, [session, status, router]);

  if (status === 'loading' || isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>載入中...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>儀表板</h1>
      <div style={{ marginTop: '2rem' }}>
        <h2>錯誤日誌</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {errorLogs.map(log => (
            <li key={log.id} style={{ borderBottom: '1px solid #eee', padding: '1rem 0' }}>
              <strong>{log.timestamp}</strong>: {log.error}
            </li>
          ))}
          {errorLogs.length === 0 && <p>暫無錯誤日誌</p>}
        </ul>
      </div>
    </div>
  );
};

export default DashboardPage;