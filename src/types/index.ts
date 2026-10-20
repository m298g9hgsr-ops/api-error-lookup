export interface ErrorAnalysisResult {
  id: string;
  errorInput: string;
  errorType: string;
  cause: string;
  solution: string;
  documentationLinks: DocumentationLink[];
  confidence: number;
  createdAt: Date;
  userId: string;
}

export interface DocumentationLink {
  title: string;
  url: string;
  description?: string;
}

export interface ErrorInput {
  text?: string;
  file?: File;
  exampleId?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  quota: number;
  stripePriceId?: string;
}

export interface UserSubscription {
  plan: SubscriptionPlan;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  usedQuota: number;
  remainingQuota: number;
}

export interface HistoryQuery {
  id: string;
  errorInput: string;
  errorType: string;
  confidence: number;
  createdAt: Date;
}

export interface FilterOptions {
  search: string;
  errorType: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  sortBy: 'date' | 'confidence' | 'type';
  sortOrder: 'asc' | 'desc';
}

export interface ExampleError {
  id: string;
  title: string;
  description: string;
  errorText: string;
  category: string;
}

export const EXAMPLE_ERRORS: ExampleError[] = [
  {
    id: '1',
    title: 'TypeError: Cannot read property of undefined',
    description: 'JavaScript/TypeScript 常見錯誤，嘗試存取 undefined 物件的屬性',
    errorText: `TypeError: Cannot read properties of undefined (reading 'map')
    at App.js:15:23
    at Component.render (Component.js:45)
    at processChild (react-reconciler.js:1234)`,
    category: 'JavaScript/TypeScript',
  },
  {
    id: '2',
    title: 'SQLSTATE[HY000] [2002] Connection refused',
    description: '資料庫連線失敗，通常是服務未啟動或連線參數錯誤',
    errorText: `SQLSTATE[HY000] [2002] Connection refused
    PDOException in Connector.php line 70
    SQLSTATE[HY000] [2002] Connection refused (trying to connect via tcp://127.0.0.1:3306)`,
    category: 'Database',
  },
  {
    id: '3',
    title: '401 Unauthorized - Invalid API Key',
    description: 'API 金鑰無效、過期或權限不足',
    errorText: `{
  "error": {
    "code": 401,
    "message": "Invalid API key provided",
    "type": "authentication_error"
  }
}`,
    category: 'API',
  },
  {
    id: '4',
    title: 'ModuleNotFoundError: No module named \'requests\'',
    description: 'Python 套件未安裝或虛擬環境未啟用',
    errorText: `Traceback (most recent call last):
  File "app.py", line 3, in <module>
    import requests
ModuleNotFoundError: No module named 'requests'`,
    category: 'Python',
  },
  {
    id: '5',
    title: 'ECONNREFUSED 127.0.0.1:3000',
    description: 'Node.js 服務連線被拒絕，服務可能未啟動或端口衝突',
    errorText: `Error: connect ECONNREFUSED 127.0.0.1:3000
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1146)
    Emitted 'error' event on ClientRequest instance`,
    category: 'Node.js',
  },
  {
    id: '6',
    title: 'CORS policy: No Access-Control-Allow-Origin header',
    description: '跨域請求被瀏覽器攔截，伺服器未設定正確的 CORS 標頭',
    errorText: `Access to fetch at 'https://api.example.com/data' from origin 'https://app.example.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`,
    category: 'Web/API',
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: '免費方案',
    price: 0,
    currency: 'TWD',
    interval: 'month',
    features: ['每月 10 次查詢', '基本錯誤分析', '社群支援'],
    quota: 10,
  },
  {
    id: 'pro',
    name: '專業方案',
    price: 299,
    currency: 'TWD',
    interval: 'month',
    features: ['每月 500 次查詢', '進階 AI 分析', '優先支援', '查詢歷史匯出', 'API 存取'],
    quota: 500,
    stripePriceId: 'price_pro_monthly',
  },
  {
    id: 'enterprise',
    name: '企業方案',
    price: 2999,
    currency: 'TWD',
    interval: 'month',
    features: ['無限次查詢', '專屬 AI 模型', '專人技術支援', 'SLA 保證', '私有部署選項', 'SSO 整合'],
    quota: -1,
    stripePriceId: 'price_enterprise_monthly',
  },
];