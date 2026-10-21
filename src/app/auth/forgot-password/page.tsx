'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const forgotPasswordSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件地址'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'success'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    setFormError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In real app, call NextAuth or API to send reset email
      setStep('success');
    } catch (err) {
      setFormError('發送重設郵件失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success-600 dark:text-success-400" />
          </div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
            重設郵件已發送
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            我們已發送密碼重設連結至您的電子郵件信箱。請檢查收件匣（包含垃圾郵件資料夾）並按照郵件中的指示操作。
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/auth/login" className="btn-primary w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回登入頁面
          </Link>
          <button className="btn-ghost w-full text-sm">
            沒收到郵件？重新發送
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <svg className="w-8 h-8 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 18a5 5 0 0 0-10 0" />
            <path d="M12 2v20" />
            <path d="M9 13h6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
          忘記密碼
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          輸入您的電子郵件，我們將發送密碼重設連結
        </p>
      </div>

      {formError && (
        <div className="mb-6 p-4 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 animate-slide-down">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger-700 dark:text-danger-300">{formError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="email" className="label">
            電子郵件
          </label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
            <input
              {...register('email')}
              id="email"
              type="email"
              autoComplete="email"
              placeholder="您的電子郵件"
              className={cn(
                'input pl-10',
                errors.email && 'border-danger-500 focus:ring-danger-500 focus:border-danger-500'
              )}
              disabled={isLoading}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
          </div>
          {errors.email && (
            <p id="email-error" className="mt-1.5 text-sm text-danger-600 dark:text-danger-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.email.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              發送中...
            </>
          ) : (
            '發送重設連結'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-secondary-600 dark:text-secondary-400">
        記得密碼了？{' '}
        <Link href="/auth/login" className="font-medium text-primary-600 dark:text-primary-400 hover:underline">
          返回登入
        </Link>
      </p>
    </div>
  );
}