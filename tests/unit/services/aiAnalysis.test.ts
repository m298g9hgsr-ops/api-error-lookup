import { vi, describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { server } from '@/test/msw/node'

// This suite asserts on its own `fetch` mock, so the MSW node interceptor
// must be disabled for this file (MSW would otherwise swallow the call and
// return the shared Ollama handler response).
beforeAll(() => {
  server.close()
})

afterAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

// Mock @/lib/prompts at top level (hoisted)
vi.mock('@/lib/prompts', () => ({
  getActivePrompt: vi.fn(() => ({
    systemPrompt: 'Test system prompt',
    buildUserPrompt: (req: any) => `Error: ${req.errorMessage}\nStack: ${req.stackTrace || ''}\nContext: ${req.context || ''}\nLanguage: ${req.language || ''}\nFramework: ${req.framework || ''}`,
    version: 'v2-structured',
  })),
  getPrompt: vi.fn(() => ({
    systemPrompt: 'Test system prompt',
    buildUserPrompt: (req: any) => `Error: ${req.errorMessage}\nStack: ${req.stackTrace || ''}\nContext: ${req.context || ''}\nLanguage: ${req.language || ''}\nFramework: ${req.framework || ''}`,
    version: 'v2-structured',
  })),
  listPromptVersions: vi.fn(() => [
    { version: 'v1-basic', description: 'Basic' },
    { version: 'v2-structured', description: 'Structured' },
    { version: 'v3-detailed', description: 'Detailed' },
  ]),
  TEST_CASES: [],
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock environment
vi.stubGlobal('process', {
  env: {
    NODE_ENV: 'test',
    OLLAMA_BASE_URL: 'http://localhost:11434/v1',
    DEFAULT_AI_MODEL: 'deepseek-coder:6.7b',
    OPENROUTER_API_KEY: '',
    VERCEL: '',
  },
})

describe('AI Analysis Service', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    vi.resetModules()
  })

  // Helper to dynamically import the service after setting env vars
  async function importService() {
    return await import('@/services/aiAnalysis')
  }

  describe('validateAnalysisRequest', () => {
    it('should return true for valid request with errorMessage', async () => {
      const { validateAnalysisRequest } = await importService()
      const request = { errorMessage: 'TypeError: Cannot read property of undefined' }
      expect(validateAnalysisRequest(request)).toBe(true)
    })

    it('should return true for valid request with errorInput', async () => {
      const { validateAnalysisRequest } = await importService()
      const request = { errorInput: 'TypeError: Cannot read property of undefined' }
      expect(validateAnalysisRequest(request)).toBe(true)
    })

    it('should return false for missing errorMessage', async () => {
      const { validateAnalysisRequest } = await importService()
      const request = { stackTrace: 'at line 1' }
      expect(validateAnalysisRequest(request)).toBe(false)
    })

    it('should return false for empty errorMessage', async () => {
      const { validateAnalysisRequest } = await importService()
      const request = { errorMessage: '' }
      expect(validateAnalysisRequest(request)).toBe(false)
    })

    it('should return false for non-object input', async () => {
      const { validateAnalysisRequest } = await importService()
      expect(validateAnalysisRequest(null)).toBe(false)
      expect(validateAnalysisRequest('string')).toBe(false)
      expect(validateAnalysisRequest(123)).toBe(false)
    })

    it('should return false for undefined', async () => {
      const { validateAnalysisRequest } = await importService()
      expect(validateAnalysisRequest(undefined)).toBe(false)
    })
  })

  describe('getAvailablePromptVersions', () => {
    it('should return list of prompt versions', async () => {
      const { getAvailablePromptVersions } = await importService()
      const versions = getAvailablePromptVersions()
      expect(versions).toBeDefined()
      expect(Array.isArray(versions)).toBe(true)
      expect(versions.length).toBeGreaterThan(0)
    })
  })

  describe('analyzeError', () => {
    const mockSuccessResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            errorType: 'TypeError',
            analysis: 'Variable is undefined',
            suggestions: ['Initialize variable'],
            confidence: 0.9,
          })
        }
      }],
      usage: { total_tokens: 150 },
    }

    it('should analyze error and return structured result', async () => {
      const { analyzeError } = await importService()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      })

      const result = await analyzeError({
        errorMessage: 'TypeError: Cannot read property of undefined',
      })

      expect(result.errorType).toBe('TypeError')
      expect(result.analysis).toBe('Variable is undefined')
      expect(result.suggestions).toEqual(['Initialize variable'])
      expect(result.confidence).toBe(0.9)
      expect(result.tokensUsed).toBe(150)
      expect(result.model).toBe('deepseek-coder:6.7b')
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    })

    it('should handle stackTrace and context', async () => {
      const { analyzeError } = await importService()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      })

      const result = await analyzeError({
        errorMessage: 'Test error',
        stackTrace: 'at line 10',
        context: 'Production',
      })

      expect(result.errorType).toBe('TypeError')
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.messages[1].content).toContain('at line 10')
      expect(callBody.messages[1].content).toContain('Production')
    })

    it('should return error object when AI returns error response', async () => {
      const { analyzeError } = await importService()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      })

      // The service surfaces upstream failures as a rejected AI_ANALYSIS_ERROR
      await expect(analyzeError({
        errorMessage: 'Test error',
      })).rejects.toMatchObject({
        code: 'AI_ANALYSIS_ERROR',
        error: expect.any(String),
      })
    })

    it('should include language and framework in prompt', async () => {
      const { analyzeError } = await importService()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      })

      await analyzeError({
        errorMessage: 'Test error',
        language: 'TypeScript',
        framework: 'Next.js',
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.messages[1].content).toContain('TypeScript')
      expect(callBody.messages[1].content).toContain('Next.js')
    })

    it('should use default model when not specified', async () => {
      const { analyzeError } = await importService()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      })

      await analyzeError({
        errorMessage: 'Test error',
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe('deepseek-coder:6.7b')
    })

    it('should use custom model when specified', async () => {
      const { analyzeError } = await importService()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      })

      await analyzeError({
        errorMessage: 'Test error',
        model: 'custom-model',
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe('custom-model')
    })
  })
})