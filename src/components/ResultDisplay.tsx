'use client';

import { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Brain,
  Link2,
  Shield,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { ErrorAnalysisResult, DocumentationLink } from '@/types';

interface ResultDisplayProps {
  result: ErrorAnalysisResult | null;
  isLoading: boolean;
  onCopy?: (text: string) => void;
}

export function ResultDisplay({ result, isLoading, onCopy }: ResultDisplayProps) {
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  const handleCopy = (text: string, itemId: string) => {
    navigator.clipboard.writeText(text);
    onCopy?.(text);
    setCopiedItems((prev) => new Set(prev).add(itemId));
    setTimeout(() => {
      setCopiedItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="card animate-fade-in">
        <div className="card-content">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            <p className="text-secondary-600 dark:text-secondary-400 text-lg">
              正在分析錯誤...
            </p>
            <p className="text-sm text-secondary-500 dark:text-secondary-500 max-w-md text-center">
              AI 正在識別錯誤類型、分析根本原因並生成修復建議
            </p>
            <div className="flex gap-2">
              <div className="w-16 h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 animate-pulse" style={{ width: '60%' }} />
              </div>
              <div className="w-16 h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 animate-pulse" style={{ width: '30%', animationDelay: '0.3s' }} />
              </div>
              <div className="w-16 h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 animate-pulse" style={{ width: '10%', animationDelay: '0.6s' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="card animate-fade-in">
        <div className="card-content">
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <Brain className="w-16 h-16 text-secondary-300 dark:text-secondary-700" />
            <h3 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">
              等待分析
            </h3>
            <p className="text-secondary-500 dark:text-secondary-400 max-w-md">
              在左側輸入錯誤訊息、上傳檔案或選擇範例，然後點擊「開始分析錯誤」
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'danger';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return '高度可信';
    if (confidence >= 60) return '中等可信';
    return '低可信度';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Error Type & Confidence Header */}
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                  錯誤類型：{result.errorType}
                </h3>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">
                  分析完成於 {formatRelativeTime(result.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Confidence Indicator */}
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      className={cn(
                        'text-secondary-200 dark:text-secondary-700'
                      )}
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeDasharray={201}
                      strokeDashoffset={201 - (result.confidence / 100) * 201}
                      strokeLinecap="round"
                      className={cn(
                        'transition-all duration-1000',
                        getConfidenceColor(result.confidence) === 'success' &&
                          'text-success-500',
                        getConfidenceColor(result.confidence) === 'warning' &&
                          'text-warning-500',
                        getConfidenceColor(result.confidence) === 'danger' &&
                          'text-danger-500'
                      )}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn(
                      'text-2xl font-bold',
                      getConfidenceColor(result.confidence) === 'success' &&
                        'text-success-600 dark:text-success-400',
                      getConfidenceColor(result.confidence) === 'warning' &&
                        'text-warning-600 dark:text-warning-400',
                      getConfidenceColor(result.confidence) === 'danger' &&
                        'text-danger-600 dark:text-danger-400'
                    )}>
                      {result.confidence}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                    信心度
                  </p>
                  <p className={cn(
                    'text-sm font-medium',
                    getConfidenceColor(result.confidence) === 'success' &&
                      'text-success-600 dark:text-success-400',
                    getConfidenceColor(result.confidence) === 'warning' &&
                      'text-warning-600 dark:text-warning-400',
                    getConfidenceColor(result.confidence) === 'danger' &&
                      'text-danger-600 dark:text-danger-400'
                  )}>
                    {getConfidenceLabel(result.confidence)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cause Analysis */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400" />
            </div>
            <h3 className="card-title">根本原因分析</h3>
          </div>
        </div>
        <div className="card-content">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap">
              {result.cause}
            </p>
          </div>
        </div>
      </div>

      {/* Solution */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400" />
            </div>
            <h3 className="card-title">修復建議</h3>
          </div>
        </div>
        <div className="card-content">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap">
              {result.solution}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleCopy(result.solution, 'solution')}
              className="btn-outline btn-sm flex items-center gap-1.5"
            >
              {copiedItems.has('solution') ? (
                <>
                  <Check className="w-4 h-4 text-success-500" />
                  <span>已複製</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>複製方案</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Documentation Links */}
      {result.documentationLinks.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="card-title">相關文檔與資源</h3>
            </div>
          </div>
          <div className="card-content">
            <div className="space-y-3">
              {result.documentationLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-secondary-900 dark:text-secondary-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {link.title}
                    </p>
                    {link.description && (
                      <p className="text-sm text-secondary-500 dark:text-secondary-400 truncate">
                        {link.description}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="w-5 h-5 text-secondary-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-secondary-500 dark:text-secondary-400">查詢 ID</p>
              <p className="font-mono text-secondary-900 dark:text-secondary-100">
                {result.id.slice(0, 8)}...
              </p>
            </div>
            <div>
              <p className="text-secondary-500 dark:text-secondary-400">分析時間</p>
              <p className="font-mono text-secondary-900 dark:text-secondary-100">
                {formatRelativeTime(result.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}