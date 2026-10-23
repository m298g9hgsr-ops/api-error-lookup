'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSubscription, useUsage } from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Brain, CreditCard, AlertCircle, CheckCircle, Clock, Shield, Zap, ArrowRight } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export function SubscriptionStatus() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: usage, isLoading: usageLoading } = useUsage();

  if (!session) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-center">
          <Brain className="w-8 h-8 text-primary mx-auto mb-2" />
          <h3 className="font-medium mb-1">登入以查看訂閱狀態</h3>
          <p className="text-sm text-muted-foreground mb-3">登入後可查看用量、方案詳情與升級選項</p>
          <Button size="sm" onClick={() => router.push('/auth/login')}>
            登入
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (subLoading || usageLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription || !usage) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="p-4 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">無法載入訂閱資訊</p>
        </CardContent>
      </Card>
    );
  }

  const isPro = subscription.isPro;
  const used = usage.used;
  const limit = usage.limit;
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, (used / Math.max(1, limit)) * 100);
  const remaining = isUnlimited ? '∞' : Math.max(0, limit - used);

  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'active':
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> 使用中</Badge>;
      case 'canceled':
        return <Badge variant="secondary">已取消</Badge>;
      case 'past_due':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> 逾期</Badge>;
      case 'trialing':
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> 試用中</Badge>;
      default:
        return <Badge variant="secondary">{subscription.status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Plan Card */}
      <Card className={cn('border-primary/20', isPro && 'bg-primary/5')}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', isPro ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}>
                {isPro ? <Zap className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{subscription.plan.name}</CardTitle>
                  {getStatusBadge()}
                </div>
                <CardDescription>
                  {isPro 
                    ? `下次續費：${format(new Date(subscription.currentPeriodEnd), 'yyyy年MM月dd日', { locale: zhTW })}`
                    : '免費方案，每日 10 次查詢額度'
                  }
                </CardDescription>
              </div>
            </div>
            {!isPro && (
              <Button onClick={() => router.push('/dashboard/subscription')}>
                <CreditCard className="w-4 h-4 mr-2" />
                升級方案
              </Button>
            )}
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
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>已使用 {used} 次</span>
              <span>剩餘 {remaining} 次</span>
              {!isUnlimited && (
                <span>重置時間：{format(new Date(usage.resetAt), 'HH:mm', { locale: zhTW })}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{isUnlimited ? '∞' : limit}</div>
            <div className="text-xs text-muted-foreground">每日額度</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{subscription.plan.features.length} 項功能</div>
            <div className="text-xs text-muted-foreground">包含功能</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SubscriptionStatus;