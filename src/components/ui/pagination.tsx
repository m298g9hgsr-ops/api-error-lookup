'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './button';

interface PaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  className?: string;
  showPageSize?: boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  totalItems?: number;
}

export function Pagination({
  totalPages,
  currentPage,
  onPageChange,
  className,
  showPageSize = false,
  pageSize,
  onPageSizeChange,
  totalItems,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = React.useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('ellipsis');
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('ellipsis');
      pages.push(totalPages);
    }

    return pages;
  }, [totalPages, currentPage]);

  return (
    <nav
      className={cn('flex flex-col sm:flex-row items-center justify-between gap-4', className)}
      aria-label="Pagination"
    >
      <div className="flex items-center gap-4">
        {showPageSize && totalItems && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>每頁顯示</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="h-8 px-2 py-1 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Page size"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} 條
                </option>
              ))}
            </select>
            <span>，共 {totalItems} 條</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            aria-label="第一頁"
            title="第一頁"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="上一頁"
            title="上一頁"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pages.map((page, index) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page)}
                aria-label={`第 ${page} 頁`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </Button>
            )
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="下一頁"
            title="下一頁"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="最後一頁"
            title="最後一頁"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground" aria-live="polite">
        第 <span className="font-medium">{currentPage}</span> 頁，共 <span className="font-medium">{totalPages}</span> 頁
      </div>
    </nav>
  );
}

export interface PaginationItemProps {
  page: number;
  currentPage: number;
  onClick: (page: number) => void;
  className?: string;
}

export function PaginationItem({ page, currentPage, onClick, className }: PaginationItemProps) {
  return (
    <button
      onClick={() => onClick(page)}
      className={cn(
        'relative inline-flex items-center justify-center h-9 w-9 min-w-[2.25rem] text-sm font-medium transition-colors rounded-lg',
        page === currentPage
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        className
      )}
      aria-label={`第 ${page} 頁`}
      aria-current={page === currentPage ? 'page' : undefined}
    >
      {page}
    </button>
  );
}