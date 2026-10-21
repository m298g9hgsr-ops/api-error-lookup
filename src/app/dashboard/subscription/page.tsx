'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

const SUBSCRIPTION_PLANS = [
  { id: 'free', name: '免費方案', price: 0, currency: 'TWD', interval: 'month', features: ['每月 10 次查詢', '基礎 AI 分析', '社群支援', '30 天歷史記錄'], quota: 10 },
  { id: 'pro', name: '專業方案', price: 299, currency: 'TWD', interval: 'month', features: ['每月 500 次查詢', '進階 AI 分析', '優先支援', '查詢歷史匯出', 'API 存取'], quota: 500 },
  { id: 'enterprise', name: '企業方案', price: 9999, currency: 'TWD', interval: 'month', features: ['無限次查詢', '專屬模型', '專人支援 + SLA', '永久歷史記錄', '私有部署', '自訂 AI 訓練'], quota: -1 },
];

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  const getPrice = (plan: { price: number }) => {
    if (plan.price === 0) return 0;
    return billingInterval === 'year' ? Math.round(plan.price * 10 * 0.85) : plan.price;
  };

  if (!session) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p>請先 <Link href="/login">登入</Link> 查看訂閱方案</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>訂閱方案</h1>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setBillingInterval('month')}
          style={{
            padding: '0.5rem 1.5rem',
            background: billingInterval === 'month' ? '#3b82f6' : '#e5e7eb',
            color: billingInterval === 'month' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
          }}
        >
          月付
        </button>
        <button
          onClick={() => setBillingInterval('year')}
          style={{
            padding: '0.5rem 1.5rem',
            background: billingInterval === 'year' ? '#3b82f6' : '#e5e7eb',
            color: billingInterval === 'year' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
          }}
        >
          年付 (享 85 折)
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {SUBSCRIPTION_PLANS.map(plan => (
          <div
            key={plan.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              background: plan.id === 'pro' ? '#fef3c7' : 'white',
              position: 'relative',
            }}
          >
            {plan.id === 'pro' && (
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#f59e0b', color: 'white', padding: '0.25rem 1rem', borderRadius: '9999px', fontSize: '0.75rem' }}>
                最熱門
              </div>
            )}
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{plan.name}</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              {plan.price === 0 ? '免費' : `${getPrice(plan)} {plan.currency}/{plan.interval === 'month' ? '月' : '年'}`}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
              {plan.features.map((feature, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#374151' }}>
                  <span style={{ color: '#22c55e' }}>✓</span> {feature}
                </li>
              ))}
            </ul>
            <button
              style={{
                width: '100%',
                padding: '0.75rem',
                background: plan.id === 'pro' ? '#f59e0b' : plan.id === 'free' ? '#3b82f6' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
              disabled={plan.id === 'free'}
            >
              {plan.id === 'free' ? '目前方案' : plan.id === 'pro' ? '升級至此方案' : '聯繫銷售'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}