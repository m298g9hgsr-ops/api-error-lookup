'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { HistoryParams, PaginatedAnalysis } from '@/lib/validators';

export function useHistory(params: HistoryParams) {
  return useQuery<PaginatedAnalysis, Error>({
    queryKey: ['history', params],
    queryFn: () => apiClient.getHistory(params),
    placeholderData: (previousData) => previousData,
  });
}