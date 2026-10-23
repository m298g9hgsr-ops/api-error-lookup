'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSubscription, useUsage } from '@/hooks/queries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Check, X, CreditCard, AlertCircle, CheckCircle, Clock, Shield, Zap, ArrowRight, ExternalLink, Loader2, Download, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly?: number;
  maxRequestsPerDay: number;
  features: string[];
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

interface SubscriptionData {
  id: string;
  plan: {
    id: string;
    name: string;
    priceMonthly: number;
    priceYearly?: number;
    maxRequestsPerDay: number;
    features: string[];
    stripePriceIdMonthly?: string;
    stripePriceIdYearly?: string;
  } | null;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeDetails?: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    priceId: string;
  } | null;
  remainingQuota: number;
  isPro: boolean;
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: ['每日 10 次查詢', '基礎 AI 分析', '社群支援', '7 天歷史記錄'],
  pro: ['每日 500 次查詢', '進階 AI 分析 (GPT-4)', '優先郵件支援', '30 天歷史記錄', 'CSV/JSON 匯出', 'REST API 存取', '錯誤模式搜尋'],
  enterprise: ['無限次查詢', '專屬模型微調', '專人支援 + SLA', '永久歷史記錄', '私有雲部署選項', '自訂 AI 訓練', '專屬帳戶經理', 'SSO/SAML 整合', '稽核日誌'],
};

export function SubscriptionManager() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const { data: subscriptionData, isLoading: subLoading, refetch } = useSubscription();
  const { data: usage, isLoading: usageLoading } = useUsage();

  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [showPortalLoading, setShowPortalLoading] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  // Stripe portal mutation
  const portalMutation = useMutation({
    mutationFn: () => apiClient.openBillingPortal(),
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: '開啟計費入口失敗',
        description: error.message,
      });
    },
    onSettled: () => setShowPortalLoading(false),
  });

  // Create checkout session mutation
  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) => apiClient.createCheckoutSession({ 
      priceId, 
      successUrl: `${window.location.origin}/dashboard/subscription?success=true`,
      cancelUrl: `${window.location.origin}/dashboard/subscription?canceled=true`
    }),
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: '建立結帳失敗',
        description: error.message,
      });
    },
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: () => fetch('/api/stripe/cancel-subscription', { method: 'POST' }).then(r => r.json()),
    onSuccess: () => {
      toast({
        variant: 'success',
        title: '訂閱已取消',
        description: '您仍可使用至當前計費週期結束',
      });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
      setCancelConfirm(false);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: '取消失敗',
        description: error.message,
      });
      setCancelConfirm(false);
    },
  });

  if (!session) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">登入以管理訂閱</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            登入後可查看目前方案、用量統計、帳單歷史與升級選項
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.push('/auth/login')}>
              登入
            </Button>
            <Button variant="outline" onClick={() => router.push('/auth/register')}>
              註冊
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (subLoading || usageLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded animate-pulse w-1/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            </div>
          </CardContent>
        </Card>
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-6 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
          <h3 className="font-medium mb-2">無法載入訂閱資訊</h3>
          <p className="text-muted-foreground mb-4">請稍後重試或聯繫支援</p>
          <Button onClick={() => refetch()}>重新載入</Button>
        </CardContent>
      </Card>
    );
  }

  const { plan, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, remainingQuota, isPro } = subscriptionData;
  const used = plan ? Math.max(0, plan.maxRequestsPerDay - remainingQuota) : 0;
  const limit = plan?.maxRequestsPerDay || 10;
  const isUnlimited = plan?.maxRequestsPerDay === -1 || limit > 1000;
  const percentage = isUnlimited ? 0 : Math.min(100, (used / Math.max(1, limit)) * 100);
  const remaining = isUnlimited ? '∞' : Math.max(0, limit - used);

  const getPrice = useCallback((p: Plan | null, interval: 'month' | 'year') => {
    if (!p || p.priceMonthly === 0) return 0;
    return interval === 'year' ? Math.round((p.priceYearly || p.priceMonthly * 12) * 0.85) : p.priceMonthly;
  }, []);

  const getStripePriceId = useCallback((p: Plan | null, interval: 'month' | 'year') => {
    if (!p) return null;
    return interval === 'month' ? p.stripePriceIdMonthly : p.stripePriceIdYearly;
  }, []);

  const handleUpgrade = (priceId: string | undefined) => {
    if (!priceId) {
      router.push('/contact');
      return;
    }
    checkoutMutation.mutate(priceId);
  };

  const handleOpenPortal = () => {
    setShowPortalLoading(true);
    portalMutation.mutate();
  };

  const handleCancel = () => {
    setCancelConfirm(true);
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            使用中
          </Badge>
        );
      case 'canceled':
        return <Badge variant="secondary">已取消</Badge>;
      case 'past_due':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            付款逾期
          </Badge>
        );
      case 'trialing':
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="w-3 h-3" />
            試用中
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Plan Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-xl font-semibold">目前方案</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">計費週期：</span>
            <div className="flex bg-secondary rounded-lg p-1">
              <button
                onClick={() => setBillingInterval('month')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  billingInterval === 'month'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                月付
              </button>
              <button
                onClick={() => setBillingInterval('year')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  billingInterval === 'year'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                年付 <span className="ml-1 text-xs text-success">(85折)</span>
              </button>
            </div>
          </div>
        </div>

        <Card className={cn('border-primary/20', isPro && 'bg-primary/5')}>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center', isPro ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}>
                  {isPro ? <Zap className="w-7 h-7" /> : <Shield className="w-7 h-7" />}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-2xl">{plan?.name || '免費方案'}</CardTitle>
                    {getStatusDisplay()}
                  </div>
                  <CardDescription className="mt-1">
                    {isPro
                      ? `下次續費：${currentPeriodEnd ? format(new Date(currentPeriodEnd), 'yyyy年MM月dd日', { locale: zhTW }) : '未知'}`
                      : '免費方案，每日 10 次查詢額度，午夜重置'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {!cancelAtPeriodEnd && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" onClick={handleOpenPortal} disabled={showPortalLoading}>
                        <CreditCard className="w-4 h-4 mr-2" />
                        {showPortalLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            開啟中...
                          </>
                        ) : (
                          '管理帳單'
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>確認開啟 Stripe 計費入口</DialogTitle>
                        <DialogDescription>
                          您將被導向 Stripe 客戶入口網站，可以管理付款方式、查看發票、更新帳單資訊等。
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {}}>取消</Button>
                        <Button onClick={handleOpenPortal} disabled={showPortalLoading}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          前往 Stripe 入口
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                {!isPro && (
                  <Button onClick={() => {
                    const priceId = getStripePriceId(plan, billingInterval);
                    if (priceId) handleUpgrade(priceId);
                  }} disabled={checkoutMutation.isPending}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {checkoutMutation.isPending ? '處理中...' : '升級專業版'}
                  </Button>
                )}
                {isPro && cancelAtPeriodEnd && (
                  <Badge variant="warning" className="gap-1 self-center">
                    <Clock className="w-3 h-3" />
                    將於期末取消
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Progress */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">今日用量</CardTitle>
              <Badge variant="outline" className="font-mono">
                {isUnlimited ? '無限制' : `${used} / ${limit}`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <Progress value={percentage} className="h-3" />
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>已使用 {used} 次</span>
                <span>剩餘 {remaining} 次</span>
                {!isUnlimited && currentPeriodEnd && (
                  <span>重置時間：{format(new Date(currentPeriodEnd), 'HH:mm', { locale: zhTW })}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Plan Comparison */}
      <section>
        <h2 className="heading-xl font-semibold mb-6">方案比較</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['free', 'pro', 'enterprise'] as const).map((planId) => {
            const p = plan?.id === planId ? plan : {
              id: planId,
              name: planId === 'free' ? '免費方案' : planId === 'pro' ? '專業方案' : '企業方案',
              priceMonthly: planId === 'free' ? 0 : planId === 'pro' ? 299 : 9999,
              priceYearly: planId === 'free' ? 0 : planId === 'pro' ? 2990 : 99990,
              maxRequestsPerDay: planId === 'free' ? 10 : planId === 'pro' ? 500 : -1,
              features: [],
              stripePriceIdMonthly: undefined,
              stripePriceIdYearly: undefined,
            };
            const isCurrent = plan?.id === planId;
            const price = getPrice(p, billingInterval);
            const features = PLAN_FEATURES[planId] || [];

            return (
              <Card
                key={planId}
                className={cn(
                  'relative',
                  isCurrent && 'border-primary/50 bg-primary/5 shadow-lg'
                )}
              >
                {planId === 'pro' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="secondary" className="bg-amber-500 text-amber-foreground px-3 py-1">
                      最熱門
                    </Badge>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-3">
                    <Badge variant="success" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      目前方案
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{p.name}</CardTitle>
                  <div className="mt-2 flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold">{price === 0 ? '免費' : `$${price.toLocaleString()}`}</span>
                    {price > 0 && (
                      <span className="text-muted-foreground">/{billingInterval === 'month' ? '月' : '年'}</span>
                    )}
                  </div>
                  {price > 0 && billingInterval === 'year' && (
                    <p className="text-xs text-success mt-1">相當於 ${Math.round(price / 10).toLocaleString()}/月 (省 ${Math.round((p.priceYearly || p.priceMonthly * 12) * 0.15).toLocaleString()})</p>
                  )}
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-2">
                    {isCurrent ? (
                      <Button variant="outline" className="w-full" disabled>
                        目前方案
                      </Button>
                    ) : planId === 'enterprise' ? (
                      <Button variant="outline" className="w-full" onClick={() => router.push('/contact')}>
                        聯繫銷售
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        onClick={() => {
                          const priceId = getStripePriceId(p, billingInterval);
                          if (priceId) handleUpgrade(priceId);
                        }}
                        disabled={checkoutMutation.isPending}
                      >
                        {checkoutMutation.isPending ? '處理中...' : isPro ? '切換至此方案' : '升級至此方案'}
                      </Button>
                    )}
                    {isCurrent && isPro && !cancelAtPeriodEnd && (
                      <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10" onClick={handleCancel}>
                        <X className="w-4 h-4 mr-2" />
                        取消訂閱
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelConfirm} onOpenChange={setCancelConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確定要取消訂閱嗎？</DialogTitle>
            <DialogDescription>
              您的訂閱將在當前計費週期結束時取消（{currentPeriodEnd ? format(new Date(currentPeriodEnd), 'yyyy年MM月dd日', { locale: zhTW }) : '未知'}）。在此之前您仍可繼續使用所有專業功能。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelConfirm(false)}>
              保留訂閱
            </Button>
            <Button variant="destructive" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? '取消中...' : '確認取消'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice History */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-xl font-semibold">帳單歷史</h2>
          <Button variant="outline" size="sm" onClick={handleOpenPortal} disabled={showPortalLoading}>
            <Download className="w-4 h-4 mr-2" />
            下載發票
          </Button>
        </div>
        <Card>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-medium text-muted-foreground">日期</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">發票號碼</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">金額</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">狀態</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="p-4 text-muted-foreground">暫無發票記錄</td>
                    <td className="p-4" colSpan={4}></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-4 text-center text-muted-foreground">
              <p>完整發票歷史請在 <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={handleOpenPortal}>Stripe 計費入口</Button> 查看與下載</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="heading-xl font-semibold mb-6">常見問題</h2>
        <div className="space-y-4">
          {[
            {
              q: '可以隨時更換方案嗎？',
              a: '可以。升級會立即生效並按比例計費；降級會在下個計費週期生效。'
            },
            {
              q: '如何取消訂閱？',
              a: '點擊「取消訂閱」按鈕，您的方案將在當前計費週期結束時取消，期間仍可正常使用。'
            },
            {
              q: '發票如何獲取？',
              a: '所有發票都在 Stripe 計費入口中，可隨時下載 PDF。我們也會在付款成功後發送電子發票至您的信箱。'
            },
            {
              q: '付款失敗怎麼辦？',
              a: '系統會重試扣款 3 次。期間您會收到通知郵件，請在 Stripe 入口更新付款方式以避免服務中斷。'
            },
            {
              q: '企業方案有哪些額外優勢？',
              a: '無限查詢、專屬模型、SLA 保證、私有部署、SSO 整合、稽核日誌與專屬帳戶經理。請聯繫銷售獲取報價。'
            },
          ].map((faq, i) => (
            <details key={i} className="group card">
              <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                <span className="font-medium">{faq.q}</span>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 text-muted-foreground border-t border-border">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

export default SubscriptionManager;