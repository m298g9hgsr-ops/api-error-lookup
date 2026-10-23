'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { UsageResponse } from '@/lib/validators';

export function useUsage() {
  return useQuery<UsageResponse, Error>({
    queryKey: ['usage'],
    queryFn: apiClient.getUsage,
    refetchInterval: 30_000, // Poll every 30 seconds
    staleTime: 30_000,
  });
}