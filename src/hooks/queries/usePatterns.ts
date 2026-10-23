'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PatternParams, PaginatedPatterns } from '@/lib/validators';

export function usePatterns(params: PatternParams) {
  return useQuery<PaginatedPatterns, Error>({
    queryKey: ['patterns', params],
    queryFn: () => apiClient.getPatterns(params),
    placeholderData: (previousData) => previousData,
  });
}