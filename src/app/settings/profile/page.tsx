'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, Mail, Globe, Clock, Trash2, Save, Loader2, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    language: 'zh-TW',
    timezone: 'Asia/Taipei',
    emailNotifications: true,
    marketingEmails: false,
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // In a real app, this would call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await update({ name: formData.name });
      
      toast({
        title: '儲存成功',
        description: '個人資料已更新',
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

  const handleDeleteAccount = async () => {
    setShowDeleteConfirm(false);
    try {
      // In a real app, this would call a delete account API
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push('/');
    } catch (error) {
      toast({
        title: '刪除失敗',
        description: '請稍後再試',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Header */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold text-white">
            {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <Button variant="outline" size="icon" className="absolute bottom-0 right-0 -translate-x-1/2 translate-y-1/2">
            <Camera className="h-4 w-4" />
          </Button>
        </div>
        <div>
          <h1 className="heading-display font-semibold">個人資料</h1>
          <p className="text-muted-foreground mt-1">管理您的帳戶資訊、偏好設定與隱私選項</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              基本資料
            </CardTitle>
            <CardDescription>您的公開顯示名稱與聯絡資訊</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">顯示名稱</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="輸入您的名稱"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">電子郵件</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">電子郵件無法修改，如需變更請聯繫支援</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              偏好設定
            </CardTitle>
            <CardDescription>語言、時區與通知偏好</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="language">介面語言</Label>
                <Select value={formData.language} onValueChange={value => handleChange('language', value)}>
                  <SelectTrigger id="language">
                    <SelectValue placeholder="選擇語言" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timezone">時區</Label>
                <Select value={formData.timezone} onValueChange={value => handleChange('timezone', value)}>
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="選擇時區" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">通知偏好</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">Email 通知</p>
                    <p className="text-sm text-muted-foreground">接收分析完成、系統更新等重要通知</p>
                  </div>
                  <Switch
                    checked={formData.emailNotifications}
                    onCheckedChange={checked => handleChange('emailNotifications', checked)}
                    disabled={isSaving}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">行銷郵件</p>
                    <p className="text-sm text-muted-foreground">接收產品更新、優惠活動與技術部落格</p>
                  </div>
                  <Switch
                    checked={formData.marketingEmails}
                    onCheckedChange={checked => handleChange('marketingEmails', checked)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
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
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">刪除帳戶</p>
                <p className="text-sm text-muted-foreground">永久刪除您的帳戶、所有分析歷史與訂閱資料，此操作無法復原</p>
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
                    <AlertDialogAction onClick={handleDeleteAccount}>確定刪除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
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
                儲存變更
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}