import type { Metadata } from 'next';
import ErrorAnalyzer from '@/components/ErrorAnalyzer';

export const metadata: Metadata = {
  title: '錯誤分析 - API Error Lookup',
  description: '貼上錯誤訊息、堆疊追蹤或上傳日誌檔案，AI 即時分析根本原因並提供修復建議',
  keywords: ['錯誤分析', '堆疊追蹤', '除錯', 'AI 分析', '開發工具', '程式錯誤'],
  openGraph: {
    title: '錯誤分析 - API Error Lookup',
    description: '貼上錯誤訊息、堆疊追蹤或上傳日誌檔案，AI 即時分析根本原因並提供修復建議',
    type: 'website',
  },
};

export default function AnalyzePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            智慧錯誤分析
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            貼上錯誤訊息、HTTP 狀態碼、堆疊追蹤，或上傳 .log/.txt 日誌檔案，
            AI 將即時識別錯誤類型、分析根本原因並提供修復建議。
          </p>
        </div>
        <ErrorAnalyzer />
      </main>
    </div>
  );
}