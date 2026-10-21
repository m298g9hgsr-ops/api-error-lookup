'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

const DashboardPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [errorHistory, setErrorHistory] = useState<Array<{ id: string; error: string; timestamp: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      fetch('/api/error-history')
        .then(res => res.json())
        .then(data => setErrorHistory(data))
        .catch(err => setError(err.message));
    }
  }, [session]);

  const handleAddError = async (errorMsg: string) => {
    if (!session) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/error-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: errorMsg }),
      });
      if (res.ok) {
        const newError = await res.json();
        setErrorHistory(prev => [newError, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add error');
    }
  };

  const ErrorFallback = ({ error: err, resetErrorBoundary }: FallbackProps) => (
    <div style={{ padding: '1rem', color: 'red' }}>
      <p>錯誤: {err instanceof Error ? err.message : String(err)}</p>
      <button onClick={resetErrorBoundary}>重試</button>
    </div>
  );

  if (!session) {
    return <div>請先登入</div>;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div style={{ padding: '1rem' }}>
        <h2>錯誤歷史</h2>
        {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
        <form
          onSubmit={e => { e.preventDefault(); const target = e.target as HTMLFormElement; const input = target.elements.namedItem('error') as HTMLInputElement; handleAddError(input?.value as string); target.reset(); }}
          style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
        >
          <input name="error" placeholder="輸入錯誤訊息" style={{ flex: 1, padding: '0.5rem' }} />
          <button type="submit" style={{ padding: '0.5rem 1rem' }}>新增</button>
        </form>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {errorHistory.map(item => (
            <li key={item.id} style={{ borderBottom: '1px solid #eee', padding: '0.5rem 0' }}>
              <strong>{item.timestamp}</strong>: {item.error}
            </li>
          ))}
        </ul>
      </div>
    </ErrorBoundary>
  );
};

export default DashboardPage;