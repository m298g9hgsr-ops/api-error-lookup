'use client';

import { Brain, Sparkles, Wand2, Shield, Clock, Code, Database, Globe, Layers, Terminal, Zap, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Brain,
    title: 'AI 智慧分析',
    description: '使用先進語言模型自動識別錯誤類型、分析根本原因並提供精確修復建議',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Wand2,
    title: '即時回應',
    description: '毫秒級分析速度，支援多種程式語言與框架的錯誤堆疊追蹤',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Shield,
    title: '資料安全',
    description: '錯誤資料僅用於分析，不會儲存敏感資訊，符合企業級安全標準',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Layers,
    title: '多格式支援',
    description: '支援文字貼上、檔案上傳、API 回應、編譯錯誤、資料庫錯誤等多種格式',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: Clock,
    title: '歷史查詢',
    description: '完整的查詢歷史記錄，支援搜尋、篩選、匯出與分享',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    icon: Globe,
    title: '文檔連結',
    description: '自動提供相關官方文檔、Stack Overflow 討論與最佳實踐連結',
    color: 'from-teal-500 to-cyan-500',
  },
];

const steps = [
  {
    number: '01',
    title: '輸入錯誤資訊',
    description: '貼上錯誤堆疊追蹤、上傳日誌檔案、或從範例中選擇常見錯誤類型',
    icon: Code,
  },
  {
    number: '02',
    title: 'AI 智慧分析',
    description: '先進語言模型自動識別錯誤模式、分析根本原因並生成修復方案',
    icon: Sparkles,
  },
  {
    number: '03',
    title: '獲得解決方案',
    description: '取得詳細修復步驟、程式碼範例、官方文檔連結與最佳實踐建議',
    icon: Wand2,
  },
];

const techStack = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust',
  'React', 'Vue', 'Next.js', 'Node.js', 'Django', 'Spring',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes',
  'AWS', 'Terraform', 'GraphQL', 'REST API', 'gRPC'
];

const exampleErrors = [
  {
    label: 'TypeError: Cannot read property',
    value: `TypeError: Cannot read property 'map' of undefined
    at App.render (App.jsx:42:15)
    at processChild (react-dom.development.js:3245:12)
    at mountChildFibers (react-dom.development.js:3290:9)`,
    language: 'javascript',
    framework: 'react',
  },
  {
    label: 'Python KeyError',
    value: `Traceback (most recent call last):
  File "main.py", line 23, in <module>
    print(data['user']['name'])
KeyError: 'user'`,
    language: 'python',
  },
  {
    label: 'SQL Syntax Error',
    value: `ERROR: syntax error at or near "SELECT"
LINE 1: SELECT * FROM users WHERE id = SELECT * FROM posts;
                                    ^
SQL state: 42601`,
    language: 'sql',
  },
  {
    label: 'HTTP 429 Rate Limit',
    value: `{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Retry after 60 seconds.",
  "retry_after": 60
}`,
    language: 'json',
    framework: 'nextjs',
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [errorInput, setErrorInput] = useState('');
  const [selectedExample, setSelectedExample] = useState<typeof exampleErrors[0] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleAnalyze = async () => {
    const input = errorInput.trim() || selectedExample?.value;
    if (!input) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorInput: input,
          stackTrace: '',
          context: '',
          language: selectedExample?.language,
          framework: selectedExample?.framework,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setAnalysisResult(data.data);
        setToast({ message: '分析完成！', type: 'success' });
      } else {
        setToast({ message: data.error || '分析失敗', type: 'error' });
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setToast({ message: '網路錯誤，請稍後再試', type: 'error' });
    } finally {
      setIsAnalyzing(false);
    }

    setTimeout(() => setToast(null), 3000);
  };

  const handleExampleClick = (example: typeof exampleErrors[0]) => {
    setSelectedExample(example);
    setErrorInput(example.value);
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-slide-right">
          <div className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-elevation-3',
            toast.type === 'success'
              ? 'bg-success/10 border border-success/30 text-success'
              : 'bg-destructive/10 border border-destructive/30 text-destructive'
          )}>
            {toast.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container-main flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Button variant="ghost" className="gap-2 text-heading-sm font-semibold">
              <Brain className="h-6 w-6 text-primary" />
              <span>API Error Lookup</span>
            </Button>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">功能特色</a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">運作方式</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">方案價格</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">登入</Button>
            <Button size="sm">免費開始</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16">
        <div className="container-main text-center">
          <h1 className="heading-display mb-6">全新 AI 驅動的錯誤分析引擎上線</h1>
          <p className="body-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            讓 AI 幫你快速找出錯誤根本原因。貼上錯誤訊息、上傳日誌檔案或選擇範例，秒級獲得根本原因分析、修復建議與官方文檔連結。支援 50+ 程式語言與框架。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto">立即免費開始體驗 Demo</Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">免費方案每月 10 次查詢</Button>
          </div>
        </div>
      </section>

      {/* Error Analyzer */}
      <section id="analyzer" className="section bg-secondary">
        <div className="container-main">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
              <h2 className="heading-xl">錯誤分析器</h2>
              <p className="body-md text-muted-foreground">貼上錯誤訊息、上傳日誌檔案或選擇範例開始分析</p>

              <div className="flex gap-2">
                <Button variant={activeTab === 'text' ? 'default' : 'outline'} onClick={() => setActiveTab('text')} size="sm">文字輸入</Button>
                <Button variant={activeTab === 'file' ? 'default' : 'outline'} onClick={() => setActiveTab('file')} size="sm">檔案上傳</Button>
              </div>

              {activeTab === 'text' ? (
                <Textarea
                  placeholder="貼上您的錯誤訊息、堆疊追蹤、API 回應或日誌內容..."
                  className="h-64 font-mono text-sm"
                  value={errorInput}
                  onChange={(e) => setErrorInput(e.target.value)}
                />
              ) : (
                <div className="h-64 border border-border rounded-xl bg-background flex items-center justify-center text-muted-foreground">
                  檔案上傳功能即將推出
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {exampleErrors.map((example) => (
                  <Button key={example.label} variant="outline" size="sm" onClick={() => handleExampleClick(example)}>
                    {example.label}
                  </Button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                支援：錯誤堆疊追蹤、API 錯誤回應、編譯錯誤、執行時異常、資料庫錯誤等
              </p>
            </div>

            <div className="space-y-6">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" />
                    分析結果
                  </CardTitle>
                  <CardDescription>{analysisResult ? '分析已完成' : '等待分析完成後顯示結果'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysisResult ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Brain className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">錯誤類型</p>
                          <p className="text-sm text-muted-foreground">{analysisResult.errorType || '未知'}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">原因分析</h4>
                        <p className="text-sm text-muted-foreground">{analysisResult.analysis || '暫無分析'}</p>
                      </div>

                      {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">修復建議</h4>
                          <ul className="space-y-2">
                            {analysisResult.suggestions.map((s: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysisResult.documentation && analysisResult.documentation.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">相關文檔</h4>
                          <ul className="space-y-1">
                            {analysisResult.documentation.map((doc: string, i: number) => (
                              <li key={i}>
                                <a href={doc} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  文檔連結 {i + 1}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-sm text-muted-foreground">信心度</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full bg-primary transition-all duration-500`} style={{ width: `${(analysisResult.confidence || 0) * 100}%` }} />
                          </div>
                          <span className="text-sm font-medium">{Math.round((analysisResult.confidence || 0) * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Terminal className="h-12 w-12 opacity-50" />
                      <p className="mt-4">在左側輸入錯誤訊息、上傳檔案或選擇範例，然後點擊「開始分析錯誤」</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {isAnalyzing && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <Zap className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium text-primary">AI 正在分析中...</span>
                </div>
              )}

              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !errorInput.trim() && !selectedExample}
                className="w-full btn-lg"
              >
                {isAnalyzing ? '分析中...' : '開始分析錯誤'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="section">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="heading-display text-primary">10,000+</div>
              <p className="text-muted-foreground">錯誤已分析</p>
            </div>
            <div>
              <div className="heading-display text-primary">95%</div>
              <p className="text-muted-foreground">分析準確率</p>
            </div>
            <div>
              <div className="heading-display text-primary">&lt;2s</div>
              <p className="text-muted-foreground">平均回應時間</p>
            </div>
            <div>
              <div className="heading-display text-primary">50+</div>
              <p className="text-muted-foreground">支援語言/框架</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="heading-display mb-4">強大功能，輕鬆除錯</h2>
            <p className="body-lg text-muted-foreground">從錯誤識別到修復建議，全流程 AI 輔助讓除錯不再是負擔</p>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
            {features.map((feature, index) => (
              <Card key={feature.title} className="card-hover group relative overflow-hidden animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent group-hover:from-primary/5 group-hover:to-secondary/5 transition-all duration-500" />
                <CardContent className="relative p-6 space-y-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="heading-md">{feature.title}</h3>
                    <p className="mt-2 body-md text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="section">
        <div className="container-main">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4">
              <Zap className="mr-1.5 h-3 w-3" />
              三步驟完成錯誤分析
            </Badge>
            <h2 className="heading-display mb-4">簡單直觀的流程，讓您專注於解決問題而非查找資料</h2>
            <p className="body-lg text-muted-foreground">無需複雜設定，三步驟從錯誤到解決方案</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                    {step.number}
                  </div>
                </div>
                <Card className="card-hover h-full pt-10 animate-slide-up" style={{ animationDelay: `${index * 150}ms` }}>
                  <CardContent className="pt-6 text-center space-y-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                      <step.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="heading-md">{step.title}</h3>
                    <p className="body-md text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
                {index < steps.length - 1 && (
                  <div className="absolute left-1/2 top-8 w-full h-1 bg-gradient-to-r from-primary to-secondary/20 -translate-x-1/2 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="section bg-secondary">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="heading-display mb-4">支援主流語言與框架</h2>
            <p className="body-lg text-muted-foreground">涵蓋前端、後端、資料庫、DevOps 等全棧開發場景</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {techStack.map((tech, index) => (
              <Badge key={tech} variant="outline" className="animate-fade-in" style={{ animationDelay: `${index * 30}ms` }}>
                {tech}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container-main">
          <div className="glass-dark rounded-2xl p-12 text-center">
            <h2 className="heading-display text-white mb-6">準備好更快解決錯誤了嗎？</h2>
            <p className="body-lg text-secondary-300 mb-8 max-w-2xl mx-auto">
              加入數千位開發者，讓 AI 成為您的除錯夥伴。免費開始，隨時升級。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="w-full sm:w-auto">免費開始使用</Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">查看方案價格</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="container-main section py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">產品</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">儀表板</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">方案價格</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">文檔</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API 參考</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">公司</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">關於我們</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">部落格</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">職缺</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">聯絡我們</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">法律</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">隱私政策</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">服務條款</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookie 政策</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">© 2024 API Error Lookup. 保留所有權利。</p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">隱私權政策</a>
              <a href="#" className="hover:text-foreground transition-colors">服務條款</a>
              <a href="#" className="hover:text-foreground transition-colors">Cookie 設定</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}