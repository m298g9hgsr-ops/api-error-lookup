// Ollama client for AI-powered error analysis
import { prisma } from './prisma';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-coder';

export interface ErrorAnalysisInput {
  errorMessage: string;
  stackTrace?: string;
  language?: string;
  framework?: string;
  context?: string;
}

export interface ErrorAnalysisResult {
  summary: string;
  rootCause: string;
  suggestedFixes: string[];
  relatedErrors: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  tags: string[];
}

export async function analyzeError(input: ErrorAnalysisInput): Promise<ErrorAnalysisResult> {
  const prompt = buildAnalysisPrompt(input);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: 'system',
            content: getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from Ollama');
    }

    const parsed = JSON.parse(content);
    return validateAndNormalizeAnalysis(parsed);
  } catch (error) {
    console.error('Error analyzing with Ollama:', error);
    // Return a fallback analysis
    return getFallbackAnalysis(input);
  }
}

function getSystemPrompt(): string {
  return `You are an expert software engineer specializing in error diagnosis and debugging. 
Your task is to analyze error messages, stack traces, and code context to provide structured, actionable debugging assistance.

Return a JSON object with the following structure:
{
  "summary": "Brief one-sentence summary of the error",
  "rootCause": "Detailed explanation of the root cause",
  "suggestedFixes": ["Fix 1", "Fix 2", "Fix 3"],
  "relatedErrors": ["Related error 1", "Related error 2"],
  "severity": "low|medium|high|critical",
  "confidence": 0.0-1.0,
  "tags": ["tag1", "tag2"]
}

Guidelines:
- Be specific and actionable in suggested fixes
- Include code snippets or configuration changes when relevant
- Consider the language and framework context
- Severity: low=cosmetic, medium=functional but workaround exists, high=blocks functionality, critical=security/data loss
- Confidence: how certain you are about the diagnosis (0.0-1.0)
- Tags: relevant keywords for categorization (e.g., "null-pointer", "async", "database", "authentication")`;
}

function buildAnalysisPrompt(input: ErrorAnalysisInput): string {
  let prompt = `Error Message: ${input.errorMessage}\n\n`;

  if (input.stackTrace) {
    prompt += `Stack Trace:\n${input.stackTrace}\n\n`;
  }

  if (input.language) {
    prompt += `Language: ${input.language}\n`;
  }

  if (input.framework) {
    prompt += `Framework: ${input.framework}\n`;
  }

  if (input.context) {
    prompt += `Additional Context:\n${input.context}\n`;
  }

  prompt += '\nPlease analyze this error and provide a structured response.';
  return prompt;
}

function validateAndNormalizeAnalysis(parsed: any): ErrorAnalysisResult {
  return {
    summary: parsed.summary || 'Unknown error',
    rootCause: parsed.rootCause || 'Unable to determine root cause',
    suggestedFixes: Array.isArray(parsed.suggestedFixes) ? parsed.suggestedFixes : [],
    relatedErrors: Array.isArray(parsed.relatedErrors) ? parsed.relatedErrors : [],
    severity: ['low', 'medium', 'high', 'critical'].includes(parsed.severity) ? parsed.severity : 'medium',
    confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
  };
}

function getFallbackAnalysis(input: ErrorAnalysisInput): ErrorAnalysisResult {
  return {
    summary: `Error: ${input.errorMessage.substring(0, 100)}`,
    rootCause: 'Unable to analyze - Ollama service unavailable. Please check your Ollama instance is running at http://localhost:11434 with the deepseek-coder model.',
    suggestedFixes: [
      'Ensure Ollama is running: ollama serve',
      'Pull the model: ollama pull deepseek-coder',
      'Check OLLAMA_BASE_URL environment variable',
    ],
    relatedErrors: [],
    severity: 'medium',
    confidence: 0.1,
    tags: ['fallback', 'ollama-unavailable'],
  };
}

// Save error log to database
export async function saveErrorLog(
  userId: string,
  errorInput: string,
  analysis: ErrorAnalysisResult
): Promise<void> {
  await prisma.analysis.create({
    data: {
      userId,
      errorInput,
      errorType: 'unknown',
      analysis: analysis.summary + '\n' + analysis.rootCause,
      suggestions: JSON.stringify(analysis.suggestedFixes),
      documentation: null,
      confidence: analysis.confidence,
      tokensUsed: 0,
    },
  });
}

// Get user's error history
export async function getErrorHistory(userId: string, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.analysis.findMany({
    where: {
      userId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}