'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SubscriptionStatus } from '@/lib/validators';

export function useSubscription() {
  return useQuery<SubscriptionStatus, Error>({
    queryKey: ['subscription'],
    queryFn: apiClient.getSubscription,
    refetchInterval: 30_000, // Poll every 30 seconds
    staleTime: 30_000,
  });
}