'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  FileText,
  ArrowUpDown,
} from 'lucide-react';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';
import { useHistory } from '@/hooks/queries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface HistoryQuery {
  id: string;
  errorInput: string;
  errorType: string;
  confidence: number;
  createdAt: string;
}

interface HistoryParams {
  page: number;
  limit: number;
  search?: string;
  errorType?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy: 'date' | 'confidence' | 'type';
  sortOrder: 'asc' | 'desc';
}

interface PaginatedHistory {
  data: HistoryQuery[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function DashboardHistory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Parse URL params for state persistence
  const initialParams: HistoryParams = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: 20,
    search: searchParams.get('search') || undefined,
    errorType: searchParams.get('errorType') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    sortBy: (searchParams.get('sortBy') as HistoryParams['sortBy']) || 'date',
    sortOrder: (searchParams.get('sortOrder') as HistoryParams['sortOrder']) || 'desc',
  };

  const [params, setParams] = useState<HistoryParams>(initialParams);
  const [search, setSearch] = useState(initialParams.search || '');
  const [errorTypeFilter, setErrorTypeFilter] = useState(initialParams.errorType || '');
  const [showFilters, setShowFilters] = useState(false);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(initialParams.dateFrom || '');
  const [dateTo, setDateTo] = useState(initialParams.dateTo || '');

  // Fetch history with React Query
  const { data, isLoading, error, refetch } = useHistory(params);

  // Sync URL with params
  useEffect(() => {
    const newParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        newParams.set(key, String(value));
      }
    });
    router.replace(`/dashboard/history?${newParams.toString()}`, { scroll: false });
  }, [params, router]);

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    const timeout = setTimeout(() => {
      setParams((prev) => ({ ...prev, search: value || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  const handleErrorTypeChange = useCallback((value: string) => {
    setErrorTypeFilter(value);
    setParams((prev) => ({ ...prev, errorType: value || undefined, page: 1 }));
  }, []);

  const handleDateFromChange = useCallback((value: string) => {
    setDateFrom(value);
    setParams((prev) => ({ ...prev, dateFrom: value || undefined, page: 1 }));
  }, []);

  const handleDateToChange = useCallback((value: string) => {
    setDateTo(value);
    setParams((prev) => ({ ...prev, dateTo: value || undefined, page: 1 }));
  }, []);

  const handleSortChange = useCallback((sortBy: HistoryParams['sortBy'], sortOrder?: HistoryParams['sortOrder']) => {
    setParams((prev) => ({ 
      ...prev, 
      sortBy, 
      sortOrder: sortOrder || (prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'),
      page: 1 
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }));
  }, []);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteAnalysis(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });

  // Export functions
  const exportCSV = useCallback(() => {
    if (!data) return;
    const headers = ['ID', 'Error Type', 'Confidence', 'Created At', 'Error Input'];
    const rows = data.data.map((q) => [
      q.id,
      q.errorType,
      `${q.confidence}%`,
      new Date(q.createdAt).toISOString(),
      `"${q.errorInput.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `error-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [data]);

  const exportJSON = useCallback(() => {
    if (!data) return;
    const json = JSON.stringify(data.data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `error-history-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }, [data]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setCopiedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2000);
  }, []);

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('確定要刪除這筆查詢記錄嗎？')) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'destructive';
  };

  const queries = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  if (isLoading && queries.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="card">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input placeholder="搜尋錯誤訊息、類型..." className="input pl-10" disabled />
              </div>
              <Button variant="outline" disabled>
                <Filter className="w-4 h-4 mr-2" />
                篩選
              </Button>
            </div>
          </CardContent>
        </div>
        <Card>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="p-6 text-center">
          <Brain className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-medium">載入失敗</h3>
          <p className="text-muted-foreground mt-2 mb-4">{error.message}</p>
          <Button onClick={() => refetch()}>重試</Button>
        </CardContent>
      </Card>
    );
  }

  if (queries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
          <Brain className="w-16 h-16 text-muted" />
          <h3 className="text-xl font-semibold">尚無查詢記錄</h3>
          <p className="text-muted-foreground max-w-md">
            開始分析錯誤後，歷史記錄將顯示在這裡
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get unique error types for filter
  const errorTypes = useMemo(() => {
    const types = new Set(queries.map((q) => q.errorType));
    return Array.from(types).sort();
  }, [queries]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="搜尋錯誤訊息、類型..."
                className="input pl-10"
              />
              {search && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="清除搜尋"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap',
                showFilters && 'border-primary/50 text-primary'
              )}
            >
              <Filter className="w-4 h-4" />
              <span>篩選</span>
            </Button>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>匯出</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportCSV} className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  匯出 CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportJSON} className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  匯出 JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Select
                value={params.sortBy}
                onValueChange={(value) => handleSortChange(value as HistoryParams['sortBy'])}
              >
                <SelectTrigger className="w-auto">
                  <SelectValue placeholder="排序" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">日期</SelectItem>
                  <SelectItem value="confidence">信心度</SelectItem>
                  <SelectItem value="type">錯誤類型</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSortChange(params.sortBy, params.sortOrder === 'asc' ? 'desc' : 'asc')}
                aria-label={params.sortOrder === 'asc' ? '降序' : '升序'}
              >
                <ArrowUpDown className={cn('w-4 h-4', params.sortOrder === 'desc' && 'rotate-180')} />
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t animate-slide-down">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="error-type-filter" className="label">
                    錯誤類型
                  </label>
                  <Select
                    value={errorTypeFilter}
                    onValueChange={handleErrorTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="所有類型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">所有類型</SelectItem>
                      {errorTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="date-from" className="label">
                    起始日期
                  </label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => handleDateFromChange(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="date-to" className="label">
                    結束日期
                  </label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => handleDateToChange(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      handleSearch('');
                      setErrorTypeFilter('');
                      handleErrorTypeChange('');
                      setDateFrom('');
                      handleDateFromChange('');
                      setDateTo('');
                      handleDateToChange('');
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    重置篩選
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          共 {total} 筆記錄
          {queries.length !== total && (
            <span className="ml-2">(顯示第 {params.page} 頁，共 {totalPages} 頁)</span>
          )}
        </span>
      </div>

      {/* History List */}
      <Card className="overflow-hidden">
        <div className="divide-y">
          {queries.map((query) => (
            <div
              key={query.id}
              className={cn(
                'hover:bg-accent/50 transition-colors',
                expandedId === query.id && 'bg-primary/5 dark:bg-primary/90/10'
              )}
            >
              <button
                onClick={() => setExpandedId(expandedId === query.id ? null : query.id)}
                className="w-full p-4 text-left flex items-start gap-4"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium truncate flex-1">
                      {query.errorType}
                    </h4>
                    <Badge
                      variant={getConfidenceColor(query.confidence) as 'success' | 'warning' | 'destructive'}
                      className="px-2 py-0.5 font-mono text-xs"
                    >
                      {query.confidence}%
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(query.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate font-mono">
                    {truncate(query.errorInput, 120)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(query.errorInput, query.id);
                    }}
                    aria-label="複製錯誤輸入"
                  >
                    {copiedIds.has(query.id) ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(query.id, e)}
                    className="text-destructive hover:bg-destructive/10"
                    aria-label="刪除記錄"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpandedId(expandedId === query.id ? null : query.id)}
                    aria-label={expandedId === query.id ? '收起' : '展開'}
                  >
                    <ChevronDown
                      className={cn('w-4 h-4 transition-transform', expandedId === query.id && 'rotate-180')}
                    />
                  </Button>
                </div>
              </button>

              {expandedId === query.id && (
                <div className="px-4 pb-4 border-t animate-slide-down">
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-mono whitespace-pre-wrap break-all">
                      {query.errorInput}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(query.errorInput, query.id);
                      }}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      <span>複製完整錯誤</span>
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      ID: {query.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <CardContent className="p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(params.page - 1)}
                  disabled={params.page <= 1}
                >
                  上一頁
                </Button>
                <span className="text-sm text-muted-foreground">
                  第 {params.page} / {totalPages} 頁
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(params.page + 1)}
                  disabled={params.page >= totalPages}
                >
                  下一頁
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">每頁</span>
                <Select
                  value={String(params.limit)}
                  onValueChange={(value) => setParams((prev) => ({ ...prev, limit: parseInt(value), page: 1 }))}
                >
                  <SelectTrigger className="w-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">筆</span>
              </div>
            </div>
          </CardContent>
        )}

        {queries.length === 0 && total > 0 && (
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">沒有符合條件的記錄</p>
            <Button variant="ghost" className="mt-2" onClick={() => { setSearch(''); handleSearch(''); setErrorTypeFilter(''); handleErrorTypeChange(''); }}>
              <X className="w-4 h-4 mr-1" />
              清除篩選條件
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}