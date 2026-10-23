'use client';

import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { AnalyzeErrorRequest, AnalyzeErrorResponse, ErrorInputForm } from '@/lib/schemas';

/** 分析錯誤的回應型別 */
interface AnalyzeErrorMutationData {
  errorMessage: string;
  stackTrace?: string;
  context?: string;
  language?: string;
  framework?: string;
}

/** 建立分析請求 */
async function analyzeErrorApi(data: AnalyzeErrorMutationData): Promise<AnalyzeErrorResponse['data']> {
  const response = await axios.post<AnalyzeErrorResponse>('/api/analyze', {
    errorMessage: data.errorMessage,
    stackTrace: data.stackTrace,
    context: data.context,
    language: data.language,
    framework: data.framework,
  });

  if (!response.data.success) {
    throw new Error(response.data.error || '分析失敗');
  }

  return response.data.data!;
}

/** useAnalyzeError Hook
 * 
 * 提供錯誤分析的 React Query mutation
 * 
 * @param options - React Query mutation 選項
 * @returns mutation 物件與 helper 函式
 * 
 * @example
 * ```tsx
 * const { mutate, isPending, error } = useAnalyzeError({
 *   onSuccess: (data) => console.log('分析完成', data),
 *   onError: (error) => toast.error(error.message),
 * });
 * 
 * // 使用
 * mutate({ errorMessage: 'TypeError: undefined' });
 * ```
 */
export function useAnalyzeError(
  options?: Omit<
    UseMutationOptions<AnalyzeErrorResponse['data'], Error, AnalyzeErrorMutationData, unknown>,
    'mutationFn'
  >
): UseMutationResult<AnalyzeErrorResponse['data'], Error, AnalyzeErrorMutationData, unknown> & {
  analyze: (formData: ErrorInputForm) => Promise<void>;
} {
  const mutation = useMutation<AnalyzeErrorResponse['data'], Error, AnalyzeErrorMutationData>({
    mutationFn: analyzeErrorApi,
    ...options,
  });

  /** 從表單資料建立並提交分析請求 */
  const analyze = async (formData: ErrorInputForm): Promise<void> => {
    await mutation.mutateAsync({
      errorMessage: formData.errorInput,
      stackTrace: formData.stackTrace,
      context: formData.context,
      language: formData.language,
      framework: formData.framework,
    });
  };

  return {
    ...mutation,
    analyze,
  };
}

/** 取得錯誤訊息的字元數統計 */
export function useCharacterCount(text: string): { count: number; isOverLimit: boolean } {
  const count = text.length;
  return {
    count,
    isOverLimit: count > 50000,
  };
}