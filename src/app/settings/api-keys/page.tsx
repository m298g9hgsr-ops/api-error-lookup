'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface APIKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  permissions: string[];
  lastUsed: string | null;
  createdAt: string;
  expiresAt: string | null;
}

const MOCK_API_KEYS: APIKey[] = [
  {
    id: '1',
    name: 'Production API Key',
    key: 'sk_live_' + 'x'.repeat(32), // placeholder — real keys are stored server-side
    prefix: 'sk_live_',
    permissions: ['analyze', 'history', 'subscription'],
    lastUsed: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    expiresAt: null,
  },
  {
    id: '2',
    name: 'Development Key',
    key: 'sk_test_abcdef1234567890abcdef1234567890',
    prefix: 'sk_test_',
    permissions: ['analyze'],
    lastUsed: '2024-01-14T15:45:00Z',
    createdAt: '2024-01-05T00:00:00Z',
    expiresAt: '2024-07-01T00:00:00Z',
  },
];

const PERMISSIONS = [
  { id: 'analyze', name: '錯誤分析', description: '呼叫錯誤分析 API' },
  { id: 'history', name: '歷史查詢', description: '讀取分析歷史記錄' },
  { id: 'subscription', name: '訂閱資訊', description: '讀取訂閱與用量資訊' },
];

export default function APIKeysPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<APIKey[]>(MOCK_API_KEYS);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['analyze']);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState<{ key: APIKey; showFull: boolean } | null>(null);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // In a real app, this would call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newKey: APIKey = {
        id: Date.now().toString(),
        name: newKeyName,
        key: `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
        prefix: 'sk_live_',
        permissions: newKeyPermissions,
        lastUsed: null,
        createdAt: new Date().toISOString(),
        expiresAt: null,
      };

      setApiKeys(prev => [newKey, ...prev]);
      setShowNewKey(newKey.key);
      setNewKeyName('');
      setNewKeyPermissions(['analyze']);
      
      toast({
        title: 'API 金鑰已建立',
        description: '請妥善保管，完整金鑰僅顯示一次',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: '建立失敗',
        description: '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('確定要撤銷此 API 金鑰嗎？此操作無法復原。')) return;

    try {
      // In a real app, this would call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setApiKeys(prev => prev.filter(k => k.id !== keyId));
      
      toast({
        title: '已撤銷',
        description: 'API 金鑰已成功撤銷',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: '撤銷失敗',
        description: '請稍後再試',
        variant: 'destructive',
      });
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: '已複製',
      description: 'API 金鑰已複製到剪貼簿',
      variant: 'success',
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '無期限';
    return new Date(dateStr).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return '從未使用';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return formatDate(dateStr);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-display font-semibold">API 金鑰管理</h1>
          <p className="text-muted-foreground mt-1">建立與管理 API 金鑰，用於程式化存取錯誤分析服務</p>
        </div>
        <Dialog open={!!showNewKey} onOpenChange={open => !open && setShowNewKey(null)}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowNewKey('new')}>
              <Plus className="h-4 w-4 mr-2" />
              建立新金鑰
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>建立新 API 金鑰</DialogTitle>
              <DialogDescription>
                輸入名稱並選擇權限，建立後完整金鑰僅顯示一次，請務必複製保存。
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="key-name">金鑰名稱</Label>
                <Input
                  id="key-name"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder="例如：Production Server"
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-1.5">
                <Label>權限範圍</Label>
                <div className="space-y-2">
                  {PERMISSIONS.map(perm => (
                    <label key={perm.id} className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={newKeyPermissions.includes(perm.id)}
                        onCheckedChange={(checked: boolean) => 
                          setNewKeyPermissions(prev => 
                            checked 
                              ? [...prev, perm.id] 
                              : prev.filter(p => p !== perm.id)
                          )
                        }
                      />
                      <div>
                        <p className="font-medium text-sm">{perm.name}</p>
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewKey(null)} disabled={isCreating}>
                  取消
                </Button>
                <Button type="submit" disabled={isCreating || !newKeyName.trim() || newKeyPermissions.length === 0}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      建立中...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      建立金鑰
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* New Key Display */}
      {showNewKey && showNewKey !== 'new' && (
        <Card className="card-hover border-primary/30 bg-primary/5 animate-slide-down">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">新 API 金鑰已建立</p>
                  <p className="text-sm text-muted-foreground">請立即複製並妥善保存，此金鑰不會再顯示</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleCopyKey(showNewKey)}>
                <Copy className="h-4 w-4 mr-2" />
                複製金鑰
              </Button>
            </div>
            <div className="mt-4 p-4 bg-background rounded-xl font-mono text-sm break-all border border-border">
              {showNewKey}
            </div>
            <Button variant="ghost" size="sm" className="mt-4" onClick={() => setShowNewKey(null)}>
              我已複製，關閉
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            您的 API 金鑰
          </CardTitle>
          <CardDescription>管理現有金鑰、查看權限與使用狀態</CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 heading-md text-foreground">尚無 API 金鑰</h3>
              <p className="mt-2 text-muted-foreground max-w-xs">
                建立您的第一個 API 金鑰以開始整合錯誤分析服務。
              </p>
              <Button className="mt-4" onClick={() => setShowNewKey('new')}>
                <Plus className="h-4 w-4 mr-2" />
                建立第一個金鑰
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map(key => (
                <div
                  key={key.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className="font-medium truncate max-w-[300px]">{key.name}</h4>
                      <Badge variant="outline" className="text-xs font-mono">{key.prefix}****</Badge>
                      {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                        <Badge variant="destructive" className="text-xs">已過期</Badge>
                      )}
                      {key.expiresAt && new Date(key.expiresAt) >= new Date() && (
                        <Badge variant="default" className="text-xs">有效</Badge>
                      )}
                      {!key.expiresAt && (
                        <Badge variant="success" className="text-xs">無期限</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {key.permissions.map(perm => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        建立於 {formatDate(key.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        最後使用：{formatRelativeTime(key.lastUsed)}
                      </span>
                      {key.expiresAt && (
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          到期：{formatDate(key.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyKey(key.key)}
                      aria-label="複製金鑰"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowKeyDialog({ key, showFull: true })}
                      aria-label="查看完整金鑰"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRevokeKey(key.id)}
                      aria-label="撤銷金鑰"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Details Dialog */}
      {showKeyDialog && (
        <Dialog open onOpenChange={open => !open && setShowKeyDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{showKeyDialog.key.name}</DialogTitle>
              <DialogDescription>完整金鑰資訊，請妥善保管</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>完整金鑰</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={showKeyDialog.key.key}
                    readOnly
                    className="font-mono text-sm flex-1"
                  />
                  <Button variant="outline" size="icon" onClick={() => handleCopyKey(showKeyDialog.key.key)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>權限範圍</Label>
                <div className="flex flex-wrap gap-2">
                  {showKeyDialog.key.permissions.map(perm => (
                    <Badge key={perm} variant="outline">{perm}</Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">建立時間</p>
                  <p className="font-medium">{formatDate(showKeyDialog.key.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">到期時間</p>
                  <p className="font-medium">{formatDate(showKeyDialog.key.expiresAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">最後使用</p>
                  <p className="font-medium">{formatRelativeTime(showKeyDialog.key.lastUsed)}</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleCopyKey(showKeyDialog.key.key)}>
                <Copy className="h-4 w-4 mr-2" />
                複製金鑰
              </Button>
              <Button variant="destructive" onClick={() => handleRevokeKey(showKeyDialog.key.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                撤銷金鑰
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Security Notice */}
      <Card className="card-hover border-amber/30 bg-amber/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>安全提醒：</strong> API 金鑰具有帳戶存取權限，請勿洩露至公開倉庫、客戶端程式碼或不安全的環境。</p>
              <p>• 使用環境變數儲存金鑰</p>
              <p>• 定期輪換金鑰（建議每 90 天）</p>
              <p>• 遵循最小權限原則，僅授予必要權限</p>
              <p>• 發現金鑰洩露請立即撤銷並建立新金鑰</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}