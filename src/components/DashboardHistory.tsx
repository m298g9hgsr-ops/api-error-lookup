'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Calendar,
  Download,
  MoreVertical,
  Copy,
  Check,
  Trash2,
  Clock,
  Brain,
} from 'lucide-react';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';
import { HistoryQuery, FilterOptions } from '@/types';

interface DashboardHistoryProps {
  queries: HistoryQuery[];
  onFilterChange: (filters: Partial<FilterOptions>) => void;
  onDelete?: (id: string) => void;
  onCopy?: (text: string) => void;
  isLoading?: boolean;
}

export function DashboardHistory({
  queries,
  onFilterChange,
  onDelete,
  onCopy,
  isLoading = false,
}: DashboardHistoryProps) {
  const [search, setSearch] = useState('');
  const [errorTypeFilter, setErrorTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'confidence' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const errorTypes = useMemo(() => {
    const types = new Set(queries.map((q) => q.errorType));
    return Array.from(types).sort();
  }, [queries]);

  const filteredQueries = useMemo(() => {
    let result = [...queries];

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(
        (q) =>
          q.errorInput.toLowerCase().includes(lowerSearch) ||
          q.errorType.toLowerCase().includes(lowerSearch)
      );
    }

    if (errorTypeFilter) {
      result = result.filter((q) => q.errorType === errorTypeFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'type':
          comparison = a.errorType.localeCompare(b.errorType);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [queries, search, errorTypeFilter, sortBy, sortOrder]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    onCopy?.(text);
    setCopiedIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setCopiedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2000);
  }, [onCopy]);

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('確定要刪除這筆查詢記錄嗎？')) {
      onDelete?.(id);
    }
  }, [onDelete]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'danger';
  };

  const getConfidenceBadge = (confidence: number) => {
    const color = getConfidenceColor(confidence);
    return (
      <span className={cn(
        'badge px-2 py-0.5 font-mono text-xs',
        color === 'success' && 'badge-success',
        color === 'warning' && 'badge-warning',
        color === 'danger' && 'badge-danger'
      )}>
        {confidence}%
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="card animate-fade-in">
        <div className="card-content">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (queries.length === 0) {
    return (
      <div className="card animate-fade-in">
        <div className="card-content">
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <Brain className="w-16 h-16 text-secondary-300 dark:text-secondary-700" />
            <h3 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">
              尚無查詢記錄
            </h3>
            <p className="text-secondary-500 dark:text-secondary-400 max-w-md">
              開始分析錯誤後，歷史記錄將顯示在這裡
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search & Filter Bar */}
      <div className="card">
        <div className="card-content pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜尋錯誤訊息、類型..."
                className="input pl-10"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                  aria-label="清除搜尋"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'btn-outline flex items-center gap-2 whitespace-nowrap',
                showFilters && 'border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400'
              )}
            >
              <Filter className="w-4 h-4" />
              <span>篩選</span>
            </button>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-by" className="text-sm text-secondary-500 dark:text-secondary-400">
                排序：
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'confidence' | 'type')}
                className="input w-auto py-1.5 text-sm"
              >
                <option value="date">日期</option>
                <option value="confidence">信心度</option>
                <option value="type">錯誤類型</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="btn-ghost p-1.5 rounded"
                aria-label={sortOrder === 'asc' ? '降序' : '升序'}
              >
                <ChevronDown className={cn('w-4 h-4', sortOrder === 'desc' && 'rotate-180')} />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-secondary-200 dark:border-secondary-700 animate-slide-down">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="error-type-filter" className="label">
                    錯誤類型
                  </label>
                  <select
                    id="error-type-filter"
                    value={errorTypeFilter}
                    onChange={(e) => setErrorTypeFilter(e.target.value)}
                    className="input"
                  >
                    <option value="">所有類型</option>
                    {errorTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearch('');
                      setErrorTypeFilter('');
                    }}
                    className="btn-ghost text-sm"
                  >
                    <X className="w-4 h-4 mr-1" />
                    重置篩選
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-secondary-500 dark:text-secondary-400">
        <span>
          共 {filteredQueries.length} 筆記錄
          {queries.length !== filteredQueries.length && (
            <span className="ml-2">(從 {queries.length} 筆篩選)</span>
          )}
        </span>
      </div>

      {/* History List */}
      <div className="card overflow-hidden">
        <div className="divide-y divide-secondary-200 dark:divide-secondary-700">
          {filteredQueries.map((query) => (
            <div
              key={query.id}
              className={cn(
                'hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors',
                expandedId === query.id && 'bg-primary-50 dark:bg-primary-900/10'
              )}
            >
              <button
                onClick={() => setExpandedId(expandedId === query.id ? null : query.id)}
                className="w-full p-4 text-left flex items-start gap-4"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-secondary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-secondary-900 dark:text-secondary-100 truncate flex-1">
                      {query.errorType}
                    </h4>
                    {getConfidenceBadge(query.confidence)}
                    <span className="text-xs text-secondary-500 dark:text-secondary-400 whitespace-nowrap">
                      {formatRelativeTime(query.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1 truncate font-mono">
                    {truncate(query.errorInput, 120)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(query.errorInput, query.id);
                    }}
                    className="btn-ghost p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700"
                    aria-label="複製錯誤輸入"
                  >
                    {copiedIds.has(query.id) ? (
                      <Check className="w-4 h-4 text-success-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  {onDelete && (
                    <button
                      onClick={(e) => handleDelete(query.id, e)}
                      className="btn-ghost p-1.5 rounded hover:bg-danger-100 dark:hover:bg-danger-900/30 text-danger-600 dark:text-danger-400"
                      aria-label="刪除記錄"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === query.id ? null : query.id)}
                    className="btn-ghost p-1.5 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700"
                    aria-label={expandedId === query.id ? '收起' : '展開'}
                  >
                    <ChevronDown
                      className={cn('w-4 h-4 transition-transform', expandedId === query.id && 'rotate-180')}
                    />
                  </button>
                </div>
              </button>

              {expandedId === query.id && (
                <div className="px-4 pb-4 border-t border-secondary-200 dark:border-secondary-700 animate-slide-down">
                  <div className="mt-3 p-3 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg">
                    <p className="text-sm text-secondary-700 dark:text-secondary-300 font-mono whitespace-pre-wrap break-all">
                      {query.errorInput}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(query.errorInput, query.id);
                      }}
                      className="btn-outline btn-sm flex items-center gap-1.5"
                    >
                      <Copy className="w-4 h-4" />
                      <span>複製完整錯誤</span>
                    </button>
                    <span className="text-xs text-secondary-500 dark:text-secondary-400">
                      ID: {query.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredQueries.length === 0 && queries.length > 0 && (
          <div className="card-content py-12 text-center">
            <p className="text-secondary-500 dark:text-secondary-400">
              沒有符合條件的記錄
            </p>
            <button
              onClick={() => {
                setSearch('');
                setErrorTypeFilter('');
              }}
              className="btn-ghost mt-2"
            >
              <X className="w-4 h-4 mr-1" />
              清除篩選條件
            </button>
          </div>
        )}
      </div>
    </div>
  );
}