'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';

const LoginPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');

  const [loginInput, setLoginInput] = useState({
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginInput({
      ...loginInput,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async () => {
    setErrorMsg('');
    try {
      const result = await signIn('credentials', {
        ...loginInput,
        redirect: false,
      });

      if (result?.error) {
        setErrorMsg(result.error);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      setErrorMsg('登入過程發生錯誤');
    }
  };

  if (session) {
    router.push('/');
    return null;
  }

  return (
    <div style={{ maxWidth: 400, margin: '4rem auto', padding: '1rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>登入</h2>
      {errorMsg && <div style={{ color: 'red', marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: '0.375rem' }}>{errorMsg}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleInputChange}
          value={loginInput.email}
          style={{ padding: '0.75rem', fontSize: '1rem' }}
        />
        <input
          type="password"
          name="password"
          placeholder="密碼"
          onChange={handleInputChange}
          value={loginInput.password}
          style={{ padding: '0.75rem', fontSize: '1rem' }}
        />
        <button
          onClick={handleLogin}
          style={{ padding: '0.75rem', fontSize: '1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
        >
          登入
        </button>
      </div>
      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        沒有帳號？<a href="/register" style={{ color: '#3b82f6' }}> 註冊</a>
      </p>
    </div>
  );
};

export default LoginPage;