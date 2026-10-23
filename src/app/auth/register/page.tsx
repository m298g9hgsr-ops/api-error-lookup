'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

const RegisterPage = () => {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('密碼不一致');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.message || '註冊失敗');
        return;
      }

      setSuccessMsg('註冊成功，正在登入...');

      // 自動登入
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        router.push('/login');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      setErrorMsg('註冊過程發生錯誤');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '4rem auto', padding: '1rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>註冊</h2>
      {errorMsg && <div style={{ color: 'red', marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: '0.375rem' }}>{errorMsg}</div>}
      {successMsg && <div style={{ color: 'green', marginBottom: '1rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '0.375rem' }}>{successMsg}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="text"
          name="name"
          placeholder="姓名"
          onChange={handleInputChange}
          value={formData.name}
          style={{ padding: '0.75rem', fontSize: '1rem' }}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleInputChange}
          value={formData.email}
          style={{ padding: '0.75rem', fontSize: '1rem' }}
        />
        <input
          type="password"
          name="password"
          placeholder="密碼"
          onChange={handleInputChange}
          value={formData.password}
          style={{ padding: '0.75rem', fontSize: '1rem' }}
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="確認密碼"
          onChange={handleInputChange}
          value={formData.confirmPassword}
          style={{ padding: '0.75rem', fontSize: '1rem' }}
        />
        <button
          onClick={handleRegister}
          style={{ padding: '0.75rem', fontSize: '1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
        >
          註冊
        </button>
      </div>
      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        已有帳號？<a href="/login" style={{ color: '#3b82f6' }}> 登入</a>
      </p>
    </div>
  );
};

export default RegisterPage;