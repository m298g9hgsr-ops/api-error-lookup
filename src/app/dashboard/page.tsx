'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Brain, Zap, History, ArrowUpRight, Settings, CreditCard, ExternalLink, Clock, CheckCircle, AlertCircle, Loader2, Bell, Lightbulb, Key, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useDashboardData, useRateLimitStatus, formatResetTime, getUsagePercentage, getProgressColor } from '@/hooks/useDashboard';
import { cn } from '@/lib/utils';

const DashboardPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData();
  const { data: rateLimitData, isLoading: rateLimitLoading } = useRateLimitStatus();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">載入儀表板中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const subscription = dashboardData?.subscription;
  const rateLimit = rateLimitData || dashboardData?.rateLimit;
  const recentActivity = dashboardData?.recentActivity || [];
  const isUnlimited = rateLimit?.isUnlimited || false;
  const used = rateLimit?.used || 0;
  const limit = rateLimit?.limit || 10;
  const remaining = rateLimit?.remaining ?? Math.max(0, limit - used);
  const percentage = getUsagePercentage(used, limit);
  const progressColor = getProgressColor(percentage);

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-main flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="heading-xl font-semibold">儀表板</h1>
            <nav className="hidden md:flex items-center gap-1" aria-label="Dashboard navigation">
              <Link href="/dashboard" className="px-3 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10" aria-current="page">
                概覽
              </Link>
              <Link href="/dashboard/history" className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                歷史記錄
              </Link>
              <Link href="/dashboard/subscription" className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                訂閱
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings/notifications" aria-label="通知設定">
                <Bell className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings/profile" aria-label="個人設定">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container-main py-8">
        {/* Welcome Section */}
        <section className="mb-8 animate-fade-in">
          <div className="glass-dark rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="heading-xl font-semibold text-white">
                  歡迎回來，{session.user?.name || '開發者'}
                </h2>
                <p className="mt-1 text-secondary-300">
                  這裡是您的錯誤分析控制中心，查看用量、近期活動並快速開始新分析。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/" className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    分析新錯誤
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/dashboard/history" className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    查看歷史
                  </Link>
                </Button>
                {!subscription && (
                  <Button variant="secondary" size="lg" asChild>
                    <Link href="/dashboard/subscription" className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      升級方案
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Usage Progress Card */}
            <Card className="card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="heading-md">今日用量</CardTitle>
                  <Badge variant={isUnlimited ? 'success' : 'outline'} className="text-xs">
                    {isUnlimited ? '無限制' : '免費方案'}
                  </Badge>
                </div>
                <CardDescription>每日重置 • {formatResetTime(rateLimit?.resetAt || new Date(Date.now() + 24 * 60 * 60 * 1000))}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">已使用</span>
                  <span className="font-medium">{isUnlimited ? '∞' : used} / {isUnlimited ? '∞' : limit}</span>
                </div>
                <Progress
                  value={isUnlimited ? 0 : percentage}
                  className={cn('h-3', progressColor === 'text-destructive' && 'bg-destructive/20', progressColor === 'text-warning' && 'bg-warning/20')}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className={cn('font-medium', progressColor)}>{isUnlimited ? '無限制' : `剩餘 ${remaining} 次`}</span>
                  <span className="text-muted-foreground">{isUnlimited ? '專業/企業方案享無限次查詢' : '每日午夜 00:00 重置'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Status Card */}
            <Card className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="heading-md flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  訂閱狀態
                </CardTitle>
                <CardDescription>目前方案與下次續費資訊</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {subscription ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{subscription.plan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {subscription.plan.price === 0 ? '免費' : `${subscription.plan.price} ${subscription.plan.currency}/${subscription.plan.interval === 'month' ? '月' : '年'}`}
                        </p>
                      </div>
                      <Badge variant={subscription.status === 'active' ? 'success' : subscription.status === 'trialing' ? 'default' : 'destructive'}>
                        {subscription.status === 'active' ? '啟用中' : subscription.status === 'trialing' ? '試用中' : subscription.status === 'past_due' ? '付款失敗' : '已取消'}
                      </Badge>
                    </div>
                    {subscription.currentPeriodEnd && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>下次扣款：{new Date(subscription.currentPeriodEnd).toLocaleDateString('zh-TW')}</span>
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href="/settings/billing">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        管理訂閱與發票
                      </Link>
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">您目前使用免費方案</p>
                    <Button asChild>
                      <Link href="/dashboard/subscription">升級至專業方案</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total Analyses Card */}
            <Card className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="heading-md flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  總分析次數
                </CardTitle>
                <CardDescription>累計完成的錯誤分析</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-foreground">{dashboardData?.totalAnalyses || 0}</div>
                <p className="text-sm text-muted-foreground mt-1">歷史總計</p>
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            <Card className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="heading-md flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  近期活動
                </CardTitle>
                <CardDescription>最近 5 筆分析記錄</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-foreground">{recentActivity.length}</div>
                <p className="text-sm text-muted-foreground mt-1">最近 30 天</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick Actions & Recent Activity */}
        <section className="grid lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          {/* Quick Actions */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="heading-md flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  快速操作
                </CardTitle>
                <CardDescription>常用功能一鍵直達</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/" className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Brain className="h-5 w-5" />
                    </div>
                    <span>分析新錯誤</span>
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/history" className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-lg bg-blue/10 text-blue">
                      <History className="h-5 w-5" />
                    </div>
                    <span>查看完整歷史</span>
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/settings/profile" className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-lg bg-green/10 text-green">
                      <Settings className="h-5 w-5" />
                    </div>
                    <span>個人設定</span>
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/settings/api-keys" className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-lg bg-purple/10 text-purple">
                      <Key className="h-5 w-5" />
                    </div>
                    <span>API 金鑰管理</span>
                  </Link>
                </Button>
                {!subscription && (
                  <Button className="w-full justify-start" asChild>
                    <Link href="/dashboard/subscription" className="flex items-center gap-3 w-full">
                      <div className="p-2 rounded-lg bg-amber/10 text-amber">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <span>升級專業方案</span>
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="card-hover border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p><strong>小提示：</strong> 免費方案每日 10 次查詢，午夜重置。</p>
                    <p>升級專業方案享每月 500 次查詢、進階 AI 分析與 API 存取。</p>
                    <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto" asChild>
                      <Link href="/dashboard/subscription">查看方案比較 →</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="card-hover">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="heading-md flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" />
                      近期分析活動
                    </CardTitle>
                    <CardDescription>最近 5 筆錯誤分析記錄，點擊查看詳情</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/history">查看全部</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-0">
                    {recentActivity.map((activity, index) => (
                      <Link
                        key={activity.id}
                        href={`/dashboard/history/${activity.id}`}
                        className={cn(
                          'flex items-center gap-4 p-4 transition-colors hover:bg-accent/50 rounded-xl',
                          index === recentActivity.length - 1 ? 'border-b-0' : 'border-b border-border'
                        )}
                      >
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Brain className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{activity.errorType || '未知錯誤類型'}</p>
                          <p className="text-sm text-muted-foreground truncate mt-1">{activity.errorInput}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(activity.createdAt).toLocaleString('zh-TW')}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {Math.round((activity.confidence || 0) * 100)}% 信心度
                            </Badge>
                          </div>
                        </div>
                        <ArrowUpRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Brain className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 heading-md text-foreground">尚無分析記錄</h3>
                    <p className="mt-2 text-muted-foreground max-w-xs">
                      開始您的第一次錯誤分析，讓 AI 幫您快速找出根本原因與解決方案。
                    </p>
                    <Button size="lg" className="mt-4" asChild>
                      <Link href="/">開始分析錯誤</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;