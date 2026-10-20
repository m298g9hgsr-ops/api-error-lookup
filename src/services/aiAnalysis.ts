import { 
  getActivePrompt, 
  getPrompt, 
  listPromptVersions, 
  PromptRequest, 
  PromptResponse,
  TEST_CASES 
} from '@/lib/prompts';

export interface AIAnalysisRequest {
  errorMessage: string;
  stackTrace?: string;
  context?: string;
  model?: string;
  promptVersion?: string;
  language?: string;
  framework?: string;
  trackExperiment?: boolean;
  testCase?: string;
}

export interface AIAnalysisResponse {
  analysis: string;
  errorType: string;
  suggestions: string[];
  confidence: number;
  tokensUsed: number;
  model: string;
  documentation: string[];
  severity?: string;
  cwe?: string[];
  relatedConcepts?: string[];
  latencyMs?: number;
}

export interface AIAnalysisError {
  error: string;
  code: string;
}

export interface ExperimentRecord {
  promptVersion: string;
  testCase: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  model: string;
  errorInput: string;
  aiResponse: string;
  qualityScore?: number;
  notes?: string;
}

// Use OpenAI-compatible API endpoint for Ollama
const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ||
  (process.env.OLLAMA_HOST ? `${process.env.OLLAMA_HOST.replace(/\/$/, '')}/v1` : 'http://localhost:11434/v1');
const DEFAULT_MODEL = process.env.DEFAULT_AI_MODEL || 'deepseek-coder:6.7b';

async function callOllama(
  systemPrompt: string, 
  userPrompt: string, 
  model: string = DEFAULT_MODEL
): Promise<{ response: string; tokensUsed: number; inputTokens: number; outputTokens: number }> {
  const startTime = Date.now();
  const response = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      temperature: 0.3,
      top_p: 0.9,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const inputTokens = data.usage?.prompt_tokens || 0;
  const outputTokens = data.usage?.completion_tokens || 0;
  const totalTokens = data.usage?.total_tokens || inputTokens + outputTokens;

  return { response: content, tokensUsed: totalTokens, inputTokens, outputTokens };
}

function parseAIResponse(response: string): Partial<AIAnalysisResponse> {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  } catch {
    return {
      errorType: 'UnknownError',
      analysis: 'Failed to parse AI response',
      suggestions: ['Please try again or contact support'],
      documentation: [],
      confidence: 0.1,
    };
  }
}

/** 記錄實驗數據到資料庫 */
async function recordExperiment(record: ExperimentRecord): Promise<void> {
  try {
    // Skip experiment recording during build (node:sqlite not available)
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return;
    }
    // Use dynamic import for node:sqlite
    // @ts-ignore - node:sqlite only available at runtime
    const sqlite = await import('node:sqlite');
    const path = await import('path');
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const db = new sqlite.DatabaseSync(dbPath);
    
    const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    db.prepare(`
      INSERT INTO "ExperimentRun" (
        "id", "promptVersion", "testCase", "inputTokens", "outputTokens", 
        "totalTokens", "latencyMs", "model", "errorInput", "aiResponse",
        "qualityScore", "notes", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      record.promptVersion,
      record.testCase,
      record.inputTokens,
      record.outputTokens,
      record.totalTokens,
      record.latencyMs,
      record.model,
      record.errorInput.slice(0, 5000), // Limit size
      record.aiResponse.slice(0, 10000),
      record.qualityScore || null,
      record.notes || null
    );
    
    // Update summary
    const summary = db.prepare('SELECT * FROM "ExperimentSummary" WHERE "promptVersion" = ?').get(record.promptVersion);
    if (summary) {
      const newTotalRuns = summary.totalRuns + 1;
      db.prepare(`
        UPDATE "ExperimentSummary" SET
          "totalRuns" = ?,
          "avgInputTokens" = (("avgInputTokens" * "totalRuns") + ?) / ?,
          "avgOutputTokens" = (("avgOutputTokens" * "totalRuns") + ?) / ?,
          "avgTotalTokens" = (("avgTotalTokens" * "totalRuns") + ?) / ?,
          "avgLatencyMs" = (("avgLatencyMs" * "totalRuns") + ?) / ?,
          "avgQualityScore" = (("avgQualityScore" * "totalRuns") + ?) / ?,
          "lastRunAt" = datetime('now'),
          "updatedAt" = datetime('now')
        WHERE "promptVersion" = ?
      `).run(
        newTotalRuns,
        record.inputTokens, newTotalRuns,
        record.outputTokens, newTotalRuns,
        record.totalTokens, newTotalRuns,
        record.latencyMs, newTotalRuns,
        record.qualityScore || 0, newTotalRuns,
        record.promptVersion
      );
    } else {
      db.prepare(`
        INSERT INTO "ExperimentSummary" (
          "id", "promptVersion", "totalRuns", "avgInputTokens", "avgOutputTokens",
          "avgTotalTokens", "avgLatencyMs", "avgQualityScore", "lastRunAt", "updatedAt"
        ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        `sum_${record.promptVersion}`,
        record.promptVersion,
        record.inputTokens,
        record.outputTokens,
        record.totalTokens,
        record.latencyMs,
        record.qualityScore || 0
      );
    }
    
    db.close();
  } catch (error) {
    console.error('Failed to record experiment:', error);
    // Don't throw - experiment tracking shouldn't break the main flow
  }
}

/** 使用指定版本的 Prompt 進行分析 */
export async function analyzeError(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  const startTime = Date.now();
  const model = request.model || DEFAULT_MODEL;
  const promptVersion = request.promptVersion || 'v2-structured';
  const prompt = getPrompt(promptVersion) || getActivePrompt();

  const promptRequest: PromptRequest = {
    errorMessage: request.errorMessage,
    stackTrace: request.stackTrace,
    context: request.context,
    language: request.language,
    framework: request.framework,
  };

  const userPrompt = prompt.buildUserPrompt(promptRequest);

  try {
    const { response, tokensUsed, inputTokens, outputTokens } = await callOllama(prompt.systemPrompt, userPrompt, model);
    const parsed = parseAIResponse(response);
    const latencyMs = Date.now() - startTime;

    const result = {
      ...parsed,
      tokensUsed,
      model,
      latencyMs,
    } as AIAnalysisResponse;

    // Record experiment if requested
    if (request.trackExperiment) {
      await recordExperiment({
        promptVersion,
        testCase: request.testCase || 'manual',
        inputTokens,
        outputTokens,
        totalTokens: tokensUsed,
        latencyMs,
        model,
        errorInput: request.errorMessage,
        aiResponse: response,
      });
    }

    return result;
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    
    // Record failed experiment
    if (request.trackExperiment) {
      await recordExperiment({
        promptVersion,
        testCase: request.testCase || 'manual',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        latencyMs,
        model,
        errorInput: request.errorMessage,
        aiResponse: `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
        notes: 'Failed',
      });
    }

    throw {
      error: error instanceof Error ? error.message : 'AI analysis failed',
      code: 'AI_ANALYSIS_ERROR',
    } as AIAnalysisError;
  }
}

/** 批次測試多個 Prompt 版本（用於 A/B 測試） */
export async function analyzeWithAllVersions(request: AIAnalysisRequest): Promise<Record<string, AIAnalysisResponse>> {
  const versions = listPromptVersions();
  const results: Record<string, AIAnalysisResponse> = {};

  for (const v of versions) {
    try {
      results[v.version] = await analyzeError({ 
        ...request, 
        promptVersion: v.version,
        trackExperiment: true,
        testCase: request.testCase || 'ab_test',
      });
    } catch (error) {
      results[v.version] = {
        errorType: 'Error',
        analysis: error instanceof Error ? error.message : 'Failed',
        suggestions: [],
        confidence: 0,
        tokensUsed: 0,
        model: request.model || DEFAULT_MODEL,
        documentation: [],
        latencyMs: 0,
      };
    }
  }

  return results;
}

/** 取得可用的 Prompt 版本列表 */
export function getAvailablePromptVersions() {
  return listPromptVersions();
}

/** 取得實驗統計摘要 */
export async function getExperimentSummary(): Promise<any[]> {
  try {
    // Skip during build (node:sqlite not available)
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return [];
    }
    // @ts-ignore - node:sqlite only available at runtime
    const sqlite = await import('node:sqlite');
    const path = await import('path');
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const db = new sqlite.DatabaseSync(dbPath);
    
    const summaries = db.prepare('SELECT * FROM "ExperimentSummary" ORDER BY "totalRuns" DESC').all();
    db.close();
    return summaries;
  } catch (error) {
    console.error('Failed to get experiment summary:', error);
    return [];
  }
}

/** 取得特定版本的詳細實驗記錄 */
export async function getExperimentRuns(promptVersion: string, limit: number = 50): Promise<any[]> {
  try {
    // Skip during build (node:sqlite not available)
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return [];
    }
    // @ts-ignore - node:sqlite only available at runtime
    const sqlite = await import('node:sqlite');
    const path = await import('path');
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const db = new sqlite.DatabaseSync(dbPath);
    
    const runs = db.prepare(
      'SELECT * FROM "ExperimentRun" WHERE "promptVersion" = ? ORDER BY "createdAt" DESC LIMIT ?'
    ).all(promptVersion, limit);
    db.close();
    return runs;
  } catch (error) {
    console.error('Failed to get experiment runs:', error);
    return [];
  }
}

/** 驗證請求格式 */
export function validateAnalysisRequest(request: unknown): request is AIAnalysisRequest {
  if (!request || typeof request !== 'object') return false;
  const req = request as Record<string, unknown>;
  const message =
    typeof req.errorMessage === 'string'
      ? req.errorMessage
      : typeof req.errorInput === 'string'
        ? req.errorInput
        : '';
  return message.trim().length > 0;
}

/** 測試用範例 */
export { TEST_CASES } from '@/lib/prompts';