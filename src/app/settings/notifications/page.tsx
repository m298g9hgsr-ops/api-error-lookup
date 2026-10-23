'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, Mail, Save, Loader2, AlertTriangle, Megaphone, Shield, Clock, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const NOTIFICATION_CATEGORIES = [
  {
    id: 'analysis_complete',
    name: '分析完成通知',
    description: '當錯誤分析完成時發送通知',
    icon: Bell,
    default: true,
  },
  {
    id: 'weekly_report',
    name: '週報摘要',
    description: '每週一發送本週分析統計與趨勢報告',
    icon: Mail,
    default: true,
  },
  {
    id: 'quota_warning',
    name: '用量警告',
    description: '當每日查詢配額剩餘少於 2 次時提醒',
    icon: AlertTriangle,
    default: true,
  },
  {
    id: 'system_updates',
    name: '系統更新',
    description: '重大功能更新、維護通知與版本釋出',
    icon: Bell,
    default: false,
  },
  {
    id: 'marketing',
    name: '行銷活動',
    description: '優惠活動、新功能推廣與技術部落格文章',
    icon: Megaphone,
    default: false,
  },
  {
    id: 'security',
    name: '安全性通知',
    description: '登入異常、密碼變更、API 金鑰異動等安全事件',
    icon: Shield,
    default: true,
  },
];

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, { email: boolean; push: boolean }>>({});

  // Initialize preferences
  if (Object.keys(preferences).length === 0) {
    const initialPrefs: Record<string, { email: boolean; push: boolean }> = {};
    NOTIFICATION_CATEGORIES.forEach(cat => {
      initialPrefs[cat.id] = { email: cat.default, push: cat.default };
    });
    setPreferences(initialPrefs);
  }

  const handleToggle = (categoryId: string, type: 'email' | 'push', checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], [type]: checked },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // In a real app, this would call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: '儲存成功',
        description: '通知偏好已更新',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: '儲存失敗',
        description: '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="heading-display font-semibold">通知設定</h1>
        <p className="text-muted-foreground mt-1">管理您接收的通知類型與頻道</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Email & Push Settings */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              通知頻道
            </CardTitle>
            <CardDescription>選擇您希望透過哪些頻道接收通知</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4 p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium">Email 通知</h4>
                    <p className="text-sm text-muted-foreground">發送至您的註冊信箱</p>
                  </div>
                </div>
                <div className="ml-10 space-y-3">
                  {NOTIFICATION_CATEGORIES.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <cat.icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{cat.name}</p>
                          <p className="text-xs text-muted-foreground">{cat.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences[cat.id]?.email || false}
                        onCheckedChange={checked => handleToggle(cat.id, 'email', checked)}
                        disabled={isSaving}
                        aria-label={`${cat.name} Email 通知`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium">瀏覽器推播</h4>
                    <p className="text-sm text-muted-foreground">即時顯示在瀏覽器中（需授權）</p>
                  </div>
                </div>
                <div className="ml-10 space-y-3">
                  {NOTIFICATION_CATEGORIES.map(cat => (
                    <div key={`push-${cat.id}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <cat.icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{cat.name}</p>
                          <p className="text-xs text-muted-foreground">{cat.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences[cat.id]?.push || false}
                        onCheckedChange={checked => handleToggle(cat.id, 'push', checked)}
                        disabled={isSaving}
                        aria-label={`${cat.name} 推播通知`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Frequency Settings */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              通知頻率
            </CardTitle>
            <CardDescription>控制通知的發送頻率與彙總方式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>彙總通知</Label>
              <p className="text-sm text-muted-foreground">將多個通知合併為單一郵件/推播，減少干擾</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">啟用彙總模式</p>
                <p className="text-sm text-muted-foreground">每小時最多發送一則彙總通知</p>
              </div>
              <Switch defaultChecked disabled={isSaving} />
            </div>

            <Separator />

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
          </CardContent>
        </Card>

        {/* Test Notification */}
        <Card className="card-hover border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              測試通知
            </CardTitle>
            <CardDescription>發送測試通知以確認設定正確</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="flex-1">
              <p className="font-medium">發送測試 Email</p>
              <p className="text-sm text-muted-foreground">將發送一封測試郵件至您的註冊信箱</p>
            </div>
            <Button variant="outline" type="button" disabled={isSaving}>
              <Mail className="h-4 w-4 mr-2" />
              發送測試 Email
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
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
        </div>
      </form>
    </div>
  );
}