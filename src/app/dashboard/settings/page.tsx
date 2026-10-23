'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  User,
  Mail,
  Globe,
  Clock,
  Shield,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Key,
  CreditCard,
  Bell,
  Plus,
  Copy,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Validation schemas
const ProfileSchema = z.object({
  name: z.string().min(2, '姓名至少需要 2 個字元').max(100, '姓名過長'),
  email: z.string().email('請輸入有效的電子郵件地址'),
  language: z.string().min(1, '請選擇語言'),
  timezone: z.string().min(1, '請選擇時區'),
});

const NotificationSchema = z.object({
  emailNotifications: z.boolean(),
  analysisComplete: z.boolean(),
  weeklyReport: z.boolean(),
  marketingEmails: z.boolean(),
});

const LANGUAGES = [
  { value: 'zh-TW', label: '繁體中文 (台灣)' },
  { value: 'zh-CN', label: '简体中文 (中国大陆)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'ko-KR', label: '한국어' },
];

const TIMEZONES = [
  { value: 'Asia/Taipei', label: '台北 (UTC+8)' },
  { value: 'Asia/Shanghai', label: '上海 (UTC+8)' },
  { value: 'Asia/Hong_Kong', label: '香港 (UTC+8)' },
  { value: 'Asia/Tokyo', label: '東京 (UTC+9)' },
  { value: 'Asia/Seoul', label: '首爾 (UTC+9)' },
  { value: 'America/Los_Angeles', label: '洛杉磯 (UTC-8)' },
  { value: 'America/New_York', label: '紐約 (UTC-5)' },
  { value: 'Europe/London', label: '倫敦 (UTC+0)' },
  { value: 'Europe/Paris', label: '巴黎 (UTC+1)' },
  { value: 'UTC', label: 'UTC' },
];

type ProfileFormValues = z.infer<typeof ProfileSchema>;
type NotificationFormValues = z.infer<typeof NotificationSchema>;

interface UserProfile {
  id: string;
  name: string;
  email: string;
  language: string;
  timezone: string;
  emailNotifications: boolean;
  analysisComplete: boolean;
  weeklyReport: boolean;
  marketingEmails: boolean;
  createdAt: string;
}

interface SubscriptionInfo {
  planName: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: string | null;
  price: number;
  currency: string;
  interval: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'api-keys' | 'billing'>('profile');
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  // Mock profile data - in real app comes from API via React Query
  const profile: UserProfile = {
    id: (session?.user as any)?.id || '1',
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    language: 'zh-TW',
    timezone: 'Asia/Taipei',
    emailNotifications: true,
    analysisComplete: true,
    weeklyReport: true,
    marketingEmails: false,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const subscription: SubscriptionInfo = {
    planName: '免費方案',
    status: 'active',
    currentPeriodEnd: null,
    price: 0,
    currency: 'TWD',
    interval: 'month',
  };

  // Profile form with react-hook-form + zod
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: profile.name,
      email: profile.email,
      language: profile.language,
      timezone: profile.timezone,
    },
  });

  // Notification form
  const {
    register: registerNotif,
    handleSubmit: handleSubmitNotif,
    watch: watchNotif,
    setValue: setValueNotif,
    formState: { isSubmitting: isNotifSubmitting },
  } = useForm<NotificationFormValues>({
    resolver: zodResolver(NotificationSchema),
    defaultValues: {
      emailNotifications: profile.emailNotifications,
      analysisComplete: profile.analysisComplete,
      weeklyReport: profile.weeklyReport,
      marketingEmails: profile.marketingEmails,
    },
  });

  const handleProfileSubmit = (data: ProfileFormValues) => {
    setIsSaving({ ...isSaving, profile: true });
    // In real app: use React Query mutation to update profile
    setTimeout(() => {
      setValue('language', data.language);
      setValue('timezone', data.timezone);
      setIsSaving({ ...isSaving, profile: false });
      toast({
        title: '儲存成功',
        description: '個人資料已更新',
        variant: 'success',
      });
    }, 800);
  };

  const handleNotificationSubmit = (data: NotificationFormValues) => {
    setIsSaving({ ...isSaving, notifications: true });
    setTimeout(() => {
      setIsSaving({ ...isSaving, notifications: false });
      toast({
        title: '儲存成功',
        description: '通知偏好已更新',
        variant: 'success',
      });
    }, 800);
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(false);
    // In real app: call delete account API
    setTimeout(() => {
      toast({
        title: '帳戶已刪除',
        description: '您的帳戶與所有資料已永久刪除',
        variant: 'success',
      });
    }, 500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-display font-semibold">設定</h1>
          <p className="text-muted-foreground mt-1">管理您的帳戶資訊、偏好與訂閱</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard">返回儀表板</Link>
        </Button>
      </div>

      <Tabs
        defaultValue="profile"
        onValueChange={(value) => setActiveTab(value as any)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 border-b border-border">
          <TabsTrigger
            value="profile"
            className={cn('flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all', activeTab === 'profile' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50')}
          >
            <User className="h-4 w-4" />
            個人資料
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className={cn('flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all', activeTab === 'notifications' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50')}
          >
            <Bell className="h-4 w-4" />
            通知
          </TabsTrigger>
          <TabsTrigger
            value="api-keys"
            className={cn('flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all', activeTab === 'api-keys' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50')}
          >
            <Key className="h-4 w-4" />
            API 金鑰
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className={cn('flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all', activeTab === 'billing' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50')}
          >
            <CreditCard className="h-4 w-4" />
            訂閱帳單
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-4 space-y-6">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                個人資料
              </CardTitle>
              <CardDescription>更新您的顯示名稱、語言與時區偏好</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleProfileSubmit)} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">顯示名稱</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="輸入您的名稱"
                      disabled={isSubmitting}
                      className={cn('w-full', errors.name && 'border-destructive')}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">電子郵件</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">電子郵件無法修改，如需變更請聯繫支援</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="language">介面語言</Label>
                    <Select {...register('language')}>
                      <SelectTrigger id="language">
                        <SelectValue placeholder="選擇語言" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.language && (
                      <p className="text-sm text-destructive">{errors.language.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">時區</Label>
                    <Select {...register('timezone')}>
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="選擇時區" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => (
                          <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.timezone && (
                      <p className="text-sm text-destructive">{errors.timezone.message}</p>
                    )}
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      儲存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      儲存變更
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="card-hover border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                危險區域
              </CardTitle>
              <CardDescription>不可逆的操作，請謹慎執行</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">刪除帳戶</p>
                    <p className="text-sm text-muted-foreground">
                      永久刪除您的帳戶、所有分析歷史與訂閱資料。此操作無法復原。
                    </p>
                  </div>
                  <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        刪除帳戶
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>確定要刪除帳戶嗎？</AlertDialogTitle>
                        <AlertDialogDescription>
                          此操作將永久刪除您的帳戶、所有錯誤分析歷史、訂閱資料與 API 金鑰。
                          此操作無法復原，請確認後再繼續。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} variant="destructive">
                          確定刪除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-4 space-y-6">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                通知偏好
              </CardTitle>
              <CardDescription>選擇您希望透過哪些頻道接收通知</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitNotif(handleNotificationSubmit)} className="space-y-6">
                <div className="space-y-4">
                  {[
                    { id: 'emailNotifications', name: 'Email 通知', desc: '接收分析完成、系統更新等重要通知' },
                    { id: 'analysisComplete', name: '分析完成通知', desc: '當錯誤分析完成時立即通知您' },
                    { id: 'weeklyReport', name: '週報摘要', desc: '每週一發送本週分析統計與趨勢報告' },
                    { id: 'marketingEmails', name: '行銷郵件', desc: '接收產品更新、優惠活動與技術部落格' },
                  ].map(field => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                          {field.id === 'emailNotifications' ? (
                            <Mail className="h-4 w-4" />
                          ) : field.id === 'analysisComplete' ? (
                            <Bell className="h-4 w-4" />
                          ) : field.id === 'weeklyReport' ? (
                            <Clock className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{field.name}</p>
                          <p className="text-xs text-muted-foreground">{field.desc}</p>
                        </div>
                      </div>
                      <Switch
                        {...registerNotif(field.id as keyof NotificationFormValues)}
                        checked={watchNotif(field.id as keyof NotificationFormValues)}
                        onCheckedChange={(checked: boolean) => setValueNotif(field.id as keyof NotificationFormValues, checked)}
                        aria-label={field.name}
                      />
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>免打擾時間</Label>
                    <p className="text-sm text-muted-foreground">設定不接收通知的時間區段（以您的時區為準）</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="dnd-start">開始時間</Label>
                      <Input id="dnd-start" type="time" defaultValue="22:00" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dnd-end">結束時間</Label>
                      <Input id="dnd-end" type="time" defaultValue="08:00" />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={isNotifSubmitting} className="w-full sm:w-auto">
                  {isNotifSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      儲存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      儲存通知設定
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="mt-4 space-y-6">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                API 金鑰管理
              </CardTitle>
              <CardDescription>建立與管理 API 金鑰，用於程式化存取錯誤分析服務</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="space-y-4">
                    {[
                      {
                        id: '1',
                        name: 'Production API Key',
                        prefix: 'sk_live_',
                        permissions: ['analyze', 'history', 'subscription'],
                        lastUsed: '2024-01-15T10:30:00Z',
                        createdAt: '2024-01-01T00:00:00Z',
                        expiresAt: null,
                        status: 'active' as const,
                      },
                      {
                        id: '2',
                        name: 'Development Key',
                        prefix: 'sk_test_',
                        permissions: ['analyze'],
                        lastUsed: '2024-01-14T15:45:00Z',
                        createdAt: '2024-01-05T00:00:00Z',
                        expiresAt: '2024-07-01T00:00:00Z',
                        status: 'active' as const,
                      },
                    ].map(key => (
                      <div
                        key={key.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="font-medium truncate max-w-[250px]">{key.name}</h4>
                            <Badge variant="outline" className="text-xs font-mono">
                              {key.prefix}****
                            </Badge>
                            <Badge variant={key.status === 'active' ? 'success' : 'default'} className="text-xs">
                              {key.status === 'active' ? '啟用中' : '已過期'}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {key.permissions.map(perm => (
                              <Badge key={perm} variant="outline" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span>建立於 {new Date(key.createdAt).toLocaleDateString('zh-TW')}</span>
                            <span>最後使用：2024-01-15</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:ml-4">
                          <Button variant="outline" size="icon" aria-label="複製金鑰">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" aria-label="查看詳情">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => {}} aria-label="撤銷金鑰">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        建立新金鑰
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>建立新 API 金鑰</DialogTitle>
                        <DialogDescription>
                          輸入名稱並選擇權限，建立後完整金鑰僅顯示一次。
                        </DialogDescription>
                      </DialogHeader>
                      <form className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="new-key-name">金鑰名稱</Label>
                          <Input id="new-key-name" placeholder="例如：Production Server" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>權限範圍</Label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="w-4 h-4" />
                              <span>錯誤分析 (analyze)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="w-4 h-4" checked />
                              <span>歷史查詢 (history)</span>
                            </label>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" type="button">取消</Button>
                          <Button type="submit">建立金鑰</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Card className="card-hover border-amber/30 bg-amber/5 mt-6">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                          <AlertCircle className="h-5 w-5" />
                        </div>
                        <div className="text-sm text-muted-foreground space-y-2">
                          <p><strong>安全提醒：</strong> API 金鑰具有帳戶存取權限，請勿洩露。</p>
                          <p>• 使用環境變數儲存金鑰</p>
                          <p>• 定期輪換金鑰（建議每 90 天）</p>
                          <p>• 遵循最小權限原則</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-4 space-y-6">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                訂閱與帳單
              </CardTitle>
              <CardDescription>管理您的訂閱方案與發票</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Subscription */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-sm text-muted-foreground">當前方案</p>
                  <p className="font-semibold">{subscription.planName}</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary border border-border">
                  <p className="text-sm text-muted-foreground">狀態</p>
                  <Badge variant={subscription.status === 'active' ? 'success' : 'default'}>
                    {subscription.status === 'active' ? '啟用中' : subscription.status === 'trialing' ? '試用中' : subscription.status === 'past_due' ? '付款失敗' : '已取消'}
                  </Badge>
                </div>
                <div className="p-4 rounded-xl bg-secondary border border-border">
                  <p className="text-sm text-muted-foreground">下次扣款</p>
                  <p className="font-semibold">
                    {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString('zh-TW') : '-'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Stripe Portal Button */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/dashboard/subscription">
                    <CreditCard className="h-5 w-5 mr-2" />
                    管理訂閱與發票
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  查看發票歷史
                </Button>
              </div>

              {/* Plans */}
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { name: '免費方案', price: 0, currency: 'TWD', interval: '月', features: ['每月 10 次查詢', '基本錯誤分析', '社群支援'], current: subscription.planName === '免費方案' },
                  { name: '專業方案', price: 299, currency: 'TWD', interval: '月', features: ['每月 500 次查詢', '進階 AI 分析', '優先支援', '查詢歷史匯出', 'API 存取'], current: subscription.planName === '專業方案' },
                  { name: '企業方案', price: 2999, currency: 'TWD', interval: '月', features: ['無限次查詢', '專屬 AI 模型', '專人技術支援', 'SLA 保證', '私有部署', 'SSO 整合'], current: false },
                ].map(plan => (
                  <Card key={plan.name} className={cn('card-hover p-6', plan.current ? 'border-primary bg-primary/5' : '')}>
                    <div className="text-center">
                      {plan.current && <Badge variant="default" className="mb-4 text-xs">當前方案</Badge>}
                      <h3 className="heading-md mb-2">{plan.name}</h3>
                      <div className="text-3xl font-bold mb-2">
                        {plan.price === 0 ? '免費' : plan.price} {plan.currency}/{plan.interval}
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-primary">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={plan.current ? 'outline' : 'default'}
                        disabled={plan.current}
                        className="w-full"
                      >
                        {plan.current ? '當前方案' : '升級方案'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}