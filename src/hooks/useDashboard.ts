'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { UserSubscription, HistoryQuery, RateLimitStatus } from '@/types';

// API response types
interface DashboardDataResponse {
  subscription: UserSubscription | null;
  rateLimit: RateLimitStatus;
  recentActivity: HistoryQuery[];
  totalAnalyses: number;
}

async function fetchDashboardData(): Promise<DashboardDataResponse> {
  const [subscriptionRes, rateLimitRes, historyRes] = await Promise.all([
    axios.get<UserSubscription>('/api/stripe/subscription'),
    axios.get<RateLimitStatus>('/api/rate-limit/status'),
    axios.get<{ errorLogs: HistoryQuery[] }>('/api/error-history?limit=5'),
  ]);

  return {
    subscription: subscriptionRes.data,
    rateLimit: rateLimitRes.data,
    recentActivity: historyRes.data.errorLogs || [],
    totalAnalyses: historyRes.data.errorLogs?.length || 0,
  };
}

async function fetchRateLimitStatus(): Promise<RateLimitStatus> {
  const response = await axios.get<RateLimitStatus>('/api/rate-limit/status');
  return response.data;
}

async function fetchRecentActivity(limit: number = 5): Promise<HistoryQuery[]> {
  const response = await axios.get<{ errorLogs: HistoryQuery[] }>(`/api/error-history?limit=${limit}`);
  return response.data.errorLogs || [];
}

async function fetchSubscription(): Promise<UserSubscription | null> {
  try {
    const response = await axios.get<UserSubscription>('/api/stripe/subscription');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/** Hook to fetch all dashboard data */
export function useDashboardData(): UseQueryResult<DashboardDataResponse, Error> {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });
}

/** Hook to fetch rate limit status */
export function useRateLimitStatus(): UseQueryResult<RateLimitStatus, Error> {
  return useQuery({
    queryKey: ['rate-limit'],
    queryFn: fetchRateLimitStatus,
    staleTime: 10 * 1000, // 10 seconds
    retry: 1,
  });
}

/** Hook to fetch recent activity */
export function useRecentActivity(limit: number = 5): UseQueryResult<HistoryQuery[], Error> {
  return useQuery({
    queryKey: ['recent-activity', limit],
    queryFn: () => fetchRecentActivity(limit),
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  });
}

/** Hook to fetch subscription */
export function useSubscription(): UseQueryResult<UserSubscription | null, Error> {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: fetchSubscription,
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  });
}

/** Format reset time to relative string */
export function formatResetTime(resetAt: string | Date): string {
  const reset = new Date(resetAt);
  const now = new Date();
  const diffMs = reset.getTime() - now.getTime();
  
  if (diffMs <= 0) return '即將重置';
  
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  
  if (diffHours > 0) {
    return `${diffHours} 小時 ${diffMins} 分鐘後重置`;
  }
  return `${diffMins} 分鐘後重置`;
}

/** Get progress percentage */
export function getUsagePercentage(used: number, limit: number): number {
  if (limit === -1) return 0;
  return Math.min(100, (used / limit) * 100);
}

/** Get progress color based on usage */
export function getProgressColor(percentage: number): string {
  if (percentage >= 90) return 'text-destructive';
  if (percentage >= 70) return 'text-warning';
  return 'text-primary';
}