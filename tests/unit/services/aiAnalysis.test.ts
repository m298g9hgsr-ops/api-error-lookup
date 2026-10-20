import { jest } from '@jest/globals'

// Mock fetch for Ollama API
const mockFetch = global.fetch as jest.Mock

describe('AI Analysis Service', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    jest.resetModules()
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434/v1'
    process.env.DEFAULT_AI_MODEL = 'deepseek-coder:6.7b'
  })

  // Mock the prompts library before importing the service
  beforeAll(() => {
    jest.mock('@/lib/prompts', () => ({
      getActivePrompt: jest.fn(() => ({
        systemPrompt: 'Test system prompt',
        buildUserPrompt: (req: any) => `Error: ${req.errorMessage}\nStack: ${req.stackTrace || ''}\nContext: ${req.context || ''}\nLanguage: ${req.language || ''}\nFramework: ${req.framework || ''}`,
        version: 'v2-structured',
      })),
      getPrompt: jest.fn(() => ({
        systemPrompt: 'Test system prompt',
        buildUserPrompt: (req: any) => `Error: ${req.errorMessage}\nStack: ${req.stackTrace || ''}\nContext: ${req.context || ''}\nLanguage: ${req.language || ''}\nFramework: ${req.framework || ''}`,
        version: 'v2-structured',
      })),
      listPromptVersions: jest.fn(() => [
        { version: 'v1-basic', description: 'Basic' },
        { version: 'v2-structured', description: 'Structured' },
        { version: 'v3-detailed', description: 'Detailed' },
      ]),
      TEST_CASES: [],
    }))
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
    it('should successfully analyze error and return structured response', async () => {
      const { analyzeError } = await importService()
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              errorType: 'AuthenticationError',
              analysis: 'Invalid API key provided',
              suggestions: ['Check API key', 'Regenerate key'],
              confidence: 0.95,
              documentation: ['https://example.com/docs'],
              severity: 'high',
              cwe: ['CWE-306'],
            })
          }
        }],
        usage: { total_tokens: 150 },
      }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await analyzeError({
        errorMessage: '401 Unauthorized: Invalid API key',
        model: 'deepseek-coder:6.7b',
      })

      expect(result.errorType).toBe('AuthenticationError')
      expect(result.analysis).toBe('Invalid API key provided')
      expect(result.suggestions).toEqual(['Check API key', 'Regenerate key'])
      expect(result.confidence).toBe(0.95)
      expect(result.tokensUsed).toBe(150)
      expect(result.model).toBe('deepseek-coder:6.7b')
      expect(result.documentation).toEqual(['https://example.com/docs'])
      expect(result.severity).toBe('high')
      expect(result.cwe).toEqual(['CWE-306'])
      expect(result.latencyMs).toBeDefined()
    })

    it('should use default model when not specified', async () => {
      const { analyzeError } = await importService()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                errorType: 'TestError',
                analysis: 'Test analysis',
                suggestions: ['Test suggestion'],
                confidence: 0.5,
              })
            }
          }],
          usage: { total_tokens: 100 },
        }),
      })

      await analyzeError({ errorMessage: 'Test error' })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/chat/completions',
        expect.objectContaining({
          body: expect.stringContaining('"model":"deepseek-coder:6.7b"'),
        })
      )
    })

    it('should throw AI_ANALYSIS_ERROR on Ollama API failure', async () => {
      const { analyzeError } = await importService()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      })

      await expect(analyzeError({ errorMessage: 'Test error' }))
        .rejects.toMatchObject({
          code: 'AI_ANALYSIS_ERROR',
          error: expect.stringContaining('Ollama API error'),
        })
    })

    it('should throw AI_ANALYSIS_ERROR on network failure', async () => {
      const { analyzeError } = await importService()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(analyzeError({ errorMessage: 'Test error' }))
        .rejects.toMatchObject({
          code: 'AI_ANALYSIS_ERROR',
          error: 'Network error',
        })
    })

    it('should include stackTrace and context in user prompt', async () => {
      const { analyzeError } = await importService()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                errorType: 'TestError',
                analysis: 'Test',
                suggestions: [],
                confidence: 0.5,
              })
            }
          }],
          usage: { total_tokens: 50 },
        }),
      })

      await analyzeError({
        errorMessage: 'Test error',
        stackTrace: 'at line 10',
        context: 'Production environment',
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.messages[1].content).toContain('at line 10')
      expect(callBody.messages[1].content).toContain('Production environment')
    })

    it('should include language and framework in request', async () => {
      const { analyzeError } = await importService()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                errorType: 'TestError',
                analysis: 'Test',
                suggestions: [],
                confidence: 0.5,
              })
            }
          }],
          usage: { total_tokens: 50 },
        }),
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
  })
})