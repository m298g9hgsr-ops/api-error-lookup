'use client';

import { useState } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AnalysisResult {
  errorType: string;
  analysis: string;
  suggestions: string[];
  documentation: string[];
  confidence: number;
}

interface SubscriptionStatus {
  plan: string;
  requestsUsed: number;
  requestsLimit: number;
  isPro: boolean;
}

export default function ErrorAnalyzer() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [errorInput, setErrorInput] = useState('');
  const [stackTrace, setStackTrace] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'result'>('input');

  useEffect(() => {
    if (session?.user) {
      fetchSubscription();
    }
  }, [session]);

  const fetchSubscription = async () => {
    try {
      const res = await axios.get('/api/subscription/status');
      setSubscription(res.data);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    }
  };

  const handleAnalyze = async () => {
    if (!errorInput.trim()) {
      setError('請輸入錯誤訊息');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await axios.post('/api/analyze', {
        errorMessage: errorInput,
        stackTrace: stackTrace || undefined,
        context: context || undefined,
      });
      setResult(res.data);
      setActiveTab('result');
    } catch (err: any) {
      setError(err.response?.data?.message || '分析失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    router.push('/auth/signin');
  };

  const handleRegister = () => {
    router.push('/auth/signup');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatSuggestions = (suggestions: string[]) => {
    return suggestions.filter(s => s.trim()).map((s, i) => (
      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
        <span className="text-green-500 mt-1">✓</span>
        <span>{s.trim()}</span>
      </li>
    ));
  };

  if (status === 'loading') {
    return <div className="flex items-center justify-center h-64">載入中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {subscription && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-gray-900">目前方案：</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                subscription.isPro
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {subscription.plan}
              </span>
              <span className="text-sm text-gray-500">
                已用 {subscription.requestsUsed} / {subscription.requestsLimit === -1 ? '∞' : subscription.requestsLimit} 次
              </span>
            </div>
            {!subscription.isPro && (
              <button
                onClick={() => router.push('/dashboard/subscription')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                升級專業版
              </button>
            )}
          </div>
        </div>
      )}

      {!session && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <h3 className="text-lg font-medium text-blue-800 mb-2">登入以獲得更完整體驗</h3>
          <p className="text-blue-600 mb-4">登入後可查看歷史記錄、獲得更高額度、使用進階功能</p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleLogin} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              登入
            </button>
            <button onClick={handleRegister} className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
              註冊
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex gap-4 border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('input')}
            className={`px-4 py-2 font-medium rounded-t-xl transition-colors ${
              activeTab === 'input'
                ? 'bg-purple-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            輸入錯誤
          </button>
          <button
            onClick={() => setActiveTab('result')}
            className={`px-4 py-2 font-medium rounded-t-xl transition-colors ${
              activeTab === 'result'
                ? 'bg-purple-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            disabled={!result}
          >
            分析結果
          </button>
        </div>

        {activeTab === 'input' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                錯誤訊息 / HTTP 狀態碼 / 堆疊追蹤 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={errorInput}
                onChange={(e) => setErrorInput(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                placeholder="貼上錯誤訊息、HTTP 狀態碼、堆疊追蹤...&#10;例：TypeError: Cannot read property 'map' of undefined&#10;例：500 Internal Server Error&#10;例：at Component.render (Component.jsx:42)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">堆疊追蹤 (可選)</label>
              <textarea
                value={stackTrace}
                onChange={(e) => setStackTrace(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                placeholder="完整的堆疊追蹤資訊..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">上下文資訊 (可選)</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                placeholder="相關程式碼片段、環境資訊、重現步驟..."
              />
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-2">快速嘗試範例：</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'TypeError: Cannot read property "map" of undefined',
                  '500 Internal Server Error',
                  'Error: connect ECONNREFUSED 127.0.0.1:5432',
                  'ModuleNotFoundError: Module not found: Error: Can\'t resolve',
                  'SyntaxError: Unexpected token < in JSON at position 0',
                  'ReferenceError: process is not defined',
                ].map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setErrorInput(ex)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors whitespace-nowrap"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || !errorInput.trim()}
              className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  分析中...
                </>
              ) : (
                '開始分析'
              )}
            </button>
          </div>
        )}

        {activeTab === 'result' && result && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="relative w-20 h-20">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="50" cy="50" r="45"
                    className="text-gray-200"
                    strokeWidth="8"
                    fill="none"
                    stroke="currentColor"
                  />
                  <circle
                    cx="50" cy="50" r="45"
                    className={getConfidenceColor(result.confidence)}
                    strokeWidth="8"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={283}
                    strokeDashoffset={283 - 283 * result.confidence}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round(result.confidence * 100)}%
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">信心度</h3>
                <p className="text-sm text-gray-500">AI 對此分析的把握程度</p>
              </div>
              <div className="ml-auto">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  result.confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                  result.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {result.confidence >= 0.8 ? '高度可信' : result.confidence >= 0.6 ? '中等可信' : '需人工確認'}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">錯誤類型</span>
                {result.errorType}
              </h3>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">原因分析</span>
              </h3>
              <div className="p-4 bg-gray-50 rounded-xl text-gray-700 leading-relaxed">
                {result.analysis}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">修復建議</span>
              </h3>
              <ul className="space-y-2">
                {formatSuggestions(result.suggestions)}
              </ul>
            </div>

            {result.documentation && result.documentation.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">相關文檔</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.documentation.map((doc, i) => (
                    <a
                      key={i}
                      href={doc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-purple-300 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      參考文檔 {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                複製 JSON
              </button>
              <button
                onClick={() => setActiveTab('input')}
                className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5v14a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2h-2.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 11l-6 6-6-6" />
                </svg>
                重新分析
              </button>
            </div>
          </div>
        )}

        {activeTab === 'result' && !result && (
          <div className="text-center py-12 text-gray-500">
            尚無分析結果，請先輸入錯誤進行分析
          </div>
        )}
      </div>
    </div>
  );
}
