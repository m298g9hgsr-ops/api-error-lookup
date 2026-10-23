'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AnalyzeInput, AnalyzeResponse } from '@/lib/validators';

export function useAnalyzeError() {
  const queryClient = useQueryClient();

  return useMutation<AnalyzeResponse, Error, AnalyzeInput>({
    mutationFn: apiClient.analyzeError,
    onSuccess: () => {
      // Invalidate and refetch history and usage after successful analysis
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}