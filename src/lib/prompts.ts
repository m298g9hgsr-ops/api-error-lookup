/**
 * 集中管理所有 AI Prompt
 * 可在 Anthropic Console / OpenAI Playground 複製測試，滿意後同步回此檔
 */

export interface PromptVariant {
  name: string;
  description: string;
  systemPrompt: string;
  buildUserPrompt: (request: PromptRequest) => string;
}

export interface PromptRequest {
  errorMessage: string;
  stackTrace?: string;
  context?: string;
  language?: string;
  framework?: string;
}

export interface PromptResponse {
  errorType: string;
  analysis: string;
  suggestions: string[];
  documentation?: string[];
  confidence: number;
}

/** 當前啟用的 Prompt 版本 */
export const ACTIVE_PROMPT_VERSION = 'v2-structured';

/** 所有 Prompt 版本 */
export const PROMPT_VERSIONS: Record<string, PromptVariant> = {
  /** v1 - 原始簡易版 */
  'v1-simple': {
    name: 'v1-simple',
    description: '原始簡易版，單一系統提示詞',
    systemPrompt: `You are an expert API error analyzer. Analyze the following error and provide a structured response in JSON format.`,
    buildUserPrompt: (req) => buildSimplePrompt(req),
  },

  /** v2 - 結構化專業版（當前主力） */
  'v2-structured': {
    name: 'v2-structured',
    description: '結構化專業版，含角色定義、輸出格式、範例、語言/框架感知',
    systemPrompt: `You are a Senior Software Engineer specializing in debugging and error analysis across 50+ programming languages and frameworks.

Your task: Analyze errors, identify root causes, and provide actionable fixes with documentation links.

OUTPUT FORMAT (strict JSON):
{
  "errorType": "string - categorize: AuthenticationError | RateLimitError | ValidationError | NetworkError | ServerError | ClientError | DatabaseError | CompilationError | RuntimeError | ConfigurationError | UnknownError",
  "analysis": "string - detailed technical explanation of root cause (2-4 sentences)",
  "suggestions": ["string - specific, actionable fix steps, ordered by priority"],
  "documentation": ["string - relevant official doc URLs (MDN, language docs, framework docs, RFC)"],
  "confidence": "number - 0.0 to 1.0"
}

RULES:
- Be precise and technical, not generic
- Suggestions must be copy-paste runnable when possible
- Documentation URLs must be real, verifiable links
- Confidence reflects certainty: 0.9+ = very certain, 0.5-0.8 = probable, <0.5 = uncertain
- If stack trace provided, reference specific lines/functions
- Detect language/framework from error patterns if not explicitly provided`,
    buildUserPrompt: (req) => buildStructuredPrompt(req),
  },

  /** v3 - 教學導向版（適合初級開發者） */
  'v3-educational': {
    name: 'v3-educational',
    description: '教學導向版，解釋更詳細、含概念說明、適合學習',
    systemPrompt: `You are a Patient Senior Engineer mentoring a developer. Analyze errors with educational depth.

OUTPUT FORMAT (strict JSON):
{
  "errorType": "string - same categories as v2",
  "analysis": "string - explain WHY this happens (concept), then WHAT went wrong (specific)",
  "suggestions": ["string - step-by-step fixes with explanation of WHY each works"],
  "documentation": ["string - learning resources: tutorials, guides, not just API refs"],
  "confidence": "number",
  "relatedConcepts": ["string - key concepts to study (e.g., 'async/await', 'memory management', 'CORS')"]
}

RULES:
- Explain the underlying concept before the fix
- Use analogies for complex topics
- Link to tutorials, not just reference docs
- Include "relatedConcepts" for learning path`,
    buildUserPrompt: (req) => buildEducationalPrompt(req),
  },

  /** v4 - 安全性聚焦版 */
  'v4-security': {
    name: 'v4-security',
    description: '安全性聚焦版，優先檢測漏洞、注入、認證繞過等風險',
    systemPrompt: `You are a Security Engineer specializing in vulnerability detection. Analyze errors for security implications FIRST.

OUTPUT FORMAT (strict JSON):
{
  "errorType": "string - same categories + SecurityVulnerability | InjectionRisk | AuthBypassRisk | DataExposureRisk",
  "analysis": "string - technical root cause WITH security impact assessment",
  "suggestions": ["string - fixes prioritized by security severity (critical first)"],
  "documentation": ["string - security advisories, CVE links, OWASP guides"],
  "confidence": "number",
  "severity": "string - Critical | High | Medium | Low | Info",
  "cwe": ["string - relevant CWE IDs if applicable"]
}

RULES:
- Always assess: Could this error leak sensitive data? Enable injection? Bypass auth?
- Flag even non-exploitable info disclosure
- Reference OWASP Top 10, CWE, CVE where relevant
- Severity: Critical=RCE/Auth bypass, High=Injection/Data leak, Medium=Info disclosure, Low=DoS`,
    buildUserPrompt: (req) => buildSecurityPrompt(req),
  },

  /** v5 - 簡潔版（低 token、快速回應） */
  'v5-concise': {
    name: 'v5-concise',
    description: '簡潔版，Token 省 50%，適合高頻率/即時場景',
    systemPrompt: `Expert error analyzer. Output ONLY valid JSON:
{"errorType":"category","analysis":"root cause in 1 sentence","suggestions":["fix1","fix2"],"documentation":["url1"],"confidence":0.0-1.0}
Categories: Auth|RateLimit|Validation|Network|Server|Client|DB|Compile|Runtime|Config|Unknown
Be specific. No fluff.`,
    buildUserPrompt: (req) => buildConcisePrompt(req),
  },
};

/** 取得當前啟用的 Prompt */
export function getActivePrompt(): PromptVariant {
  return PROMPT_VERSIONS[ACTIVE_PROMPT_VERSION];
}

/** 取得指定版本的 Prompt */
export function getPrompt(version: string): PromptVariant | undefined {
  return PROMPT_VERSIONS[version];
}

/** 列出所有可用版本 */
export function listPromptVersions(): { version: string; name: string; description: string }[] {
  return Object.values(PROMPT_VERSIONS).map((p) => ({
    version: p.name,
    name: p.name,
    description: p.description,
  }));
}

/* ==================== Prompt Builders ==================== */

function buildSimplePrompt(req: PromptRequest): string {
  const parts = [
    `Error: ${req.errorMessage}`,
    req.stackTrace ? `Stack Trace:\n${req.stackTrace}` : '',
    req.context ? `Context: ${req.context}` : '',
  ].filter(Boolean);

  return `${parts.join('\n\n')}\n\nReturn JSON with: errorType, analysis, suggestions[], confidence (0-1)`;
}

function buildStructuredPrompt(req: PromptRequest): string {
  const lang = req.language ? `\nLanguage: ${req.language}` : '';
  const fw = req.framework ? `\nFramework: ${req.framework}` : '';
  
  const parts = [
    `Error Message: ${req.errorMessage}`,
    req.stackTrace ? `Stack Trace:\n${req.stackTrace}` : '',
    req.context ? `Context: ${req.context}` : '',
    lang,
    fw,
  ].filter(Boolean);

  return `${parts.join('\n')}\n\nProvide analysis in the specified JSON format.`;
}

function buildEducationalPrompt(req: PromptRequest): string {
  const lang = req.language ? `\nLanguage: ${req.language}` : '';
  const fw = req.framework ? `\nFramework: ${req.framework}` : '';
  
  const parts = [
    `Error Message: ${req.errorMessage}`,
    req.stackTrace ? `Stack Trace:\n${req.stackTrace}` : '',
    req.context ? `Context: ${req.context}` : '',
    lang,
    fw,
  ].filter(Boolean);

  return `${parts.join('\n')}\n\nExplain the concept behind this error, then provide step-by-step fixes with learning resources. Include "relatedConcepts" array.`;
}

function buildSecurityPrompt(req: PromptRequest): string {
  const lang = req.language ? `\nLanguage: ${req.language}` : '';
  const fw = req.framework ? `\nFramework: ${req.framework}` : '';
  
  const parts = [
    `Error Message: ${req.errorMessage}`,
    req.stackTrace ? `Stack Trace:\n${req.stackTrace}` : '',
    req.context ? `Context: ${req.context}` : '',
    lang,
    fw,
  ].filter(Boolean);

  return `${parts.join('\n')}\n\nAnalyze for security implications first. Include severity (Critical/High/Medium/Low/Info) and CWE IDs if applicable.`;
}

function buildConcisePrompt(req: PromptRequest): string {
  const parts = [
    `Error: ${req.errorMessage}`,
    req.stackTrace ? `Stack: ${req.stackTrace.slice(0, 500)}` : '',
    req.context ? `Ctx: ${req.context.slice(0, 200)}` : '',
  ].filter(Boolean);

  return parts.join(' | ');
}

/* ==================== 測試用範例 ==================== */

export const TEST_CASES: { name: string; request: PromptRequest }[] = [
  {
    name: 'React TypeError - map of undefined',
    request: {
      errorMessage: "TypeError: Cannot read property 'map' of undefined",
      stackTrace: `at App.render (App.jsx:42:15)
at processChild (react-dom.development.js:3245:12)
at mountChildFibers (react-dom.development.js:3290:9)`,
      language: 'javascript',
      framework: 'react',
    },
  },
  {
    name: 'Python KeyError',
    request: {
      errorMessage: "KeyError: 'user'",
      stackTrace: `Traceback (most recent call last):
  File "main.py", line 23, in <module>
    print(data['user']['name'])
KeyError: 'user'`,
      language: 'python',
    },
  },
  {
    name: 'SQL Injection Attempt Error',
    request: {
      errorMessage: "SQLSTATE[42000]: Syntax error or access violation: 1064 You have an error in your SQL syntax",
      stackTrace: `PDOException: SQLSTATE[42000] at Connection.php:458`,
      context: 'User input: \' OR 1=1 --',
      language: 'php',
      framework: 'laravel',
    },
  },
  {
    name: 'HTTP 429 Rate Limit',
    request: {
      errorMessage: "HTTP 429 Too Many Requests",
      context: `Response: {"error": "rate_limit_exceeded", "retry_after": 60}`,
      language: 'typescript',
      framework: 'nextjs',
    },
  },
];

/* ==================== Prompt 實驗追蹤 ==================== */

export interface PromptExperiment {
  version: string;
  testCase: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  qualityScore?: number; // 1-5 人工評分
  notes?: string;
}

export const EXPERIMENT_LOG: PromptExperiment[] = [];