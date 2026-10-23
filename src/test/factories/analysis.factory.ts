import { faker } from '@faker-js/faker'
import { Analysis } from '@prisma/client'

export interface AnalysisFactoryOptions {
  id?: string
  userId?: string
  errorInput?: string
  errorType?: string
  /** Pass `true` to auto-generate a realistic stack trace. */
  stackTrace?: string | null | true
  context?: string | null
  analysis?: string
  model?: string
  tokensUsed?: number
  confidence?: number
  suggestions?: string
  documentation?: string | null
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Create a single test analysis with faker data
 */
export function createAnalysis(overrides: AnalysisFactoryOptions = {}): Analysis {
  const now = new Date()
  const errorMessages = [
    'TypeError: Cannot read properties of undefined (reading \'map\')',
    'ReferenceError: process is not defined',
    'Error: Request failed with status code 401',
    'SyntaxError: Unexpected token \'<\'',
    'RangeError: Invalid array length',
    'TypeError: Cannot read property \'length\' of null',
    'ReferenceError: window is not defined',
    'Error: connect ECONNREFUSED 127.0.0.1:5432',
    'TypeError: Cannot read properties of undefined (reading \'subscribe\')',
    'Error: ENOENT: no such file or directory',
  ]
  
  const errorTypes = [
    'TypeError',
    'ReferenceError',
    'SyntaxError',
    'RangeError',
    'AuthenticationError',
    'NetworkError',
    'DatabaseError',
    'FileSystemError',
    'ValidationError',
    'UnknownError',
  ]
  
  const aiModels = [
    'deepseek-coder:6.7b',
    'codellama:13b',
    'mistral:7b',
    'llama3:8b',
  ]
  
  const errorInput = overrides.errorInput || faker.helpers.arrayElement(errorMessages)
  const errorType = overrides.errorType || faker.helpers.arrayElement(errorTypes)
  const model = overrides.model || faker.helpers.arrayElement(aiModels)

  // `stackTrace: true` means "generate one for me"
  let stackTrace: string | null
  if (overrides.stackTrace === true) {
    stackTrace = generateStackTrace()
  } else if (overrides.stackTrace === null) {
    stackTrace = null
  } else if (typeof overrides.stackTrace === 'string') {
    stackTrace = overrides.stackTrace
  } else {
    stackTrace = faker.datatype.boolean() ? generateStackTrace() : null
  }

  // Generate appropriate AI response based on error type
  const aiResponses: Record<string, string> = {
    TypeError: 'The variable is undefined. Check initialization before accessing properties.',
    ReferenceError: 'A variable or function is being used before it is declared.',
    SyntaxError: 'There is a syntax error in your code. Check for missing brackets or typos.',
    RangeError: 'A value is outside the valid range for this operation.',
    AuthenticationError: 'The provided credentials are invalid or expired.',
    NetworkError: 'A network error occurred. Check your connection and endpoint.',
    DatabaseError: 'A database operation failed. Check connection and query syntax.',
    FileSystemError: 'File system operation failed. Check permissions and paths.',
    ValidationError: 'Input validation failed. Check required fields and formats.',
    UnknownError: 'An unexpected error occurred. Review the error details.',
  }
  
  return {
    id: overrides.id || `analysis_${faker.string.uuid()}`,
    userId: overrides.userId || faker.string.uuid(),
    errorInput,
    errorType,
    stackTrace,
    context: overrides.context ?? null,
    analysis: overrides.analysis || aiResponses[errorType] || aiResponses.UnknownError,
    model,
    tokensUsed: overrides.tokensUsed || faker.number.int({ min: 80, max: 300 }),
    confidence: overrides.confidence ?? faker.number.float({ min: 0.5, max: 0.99, precision: 0.01 }),
    suggestions: overrides.suggestions || JSON.stringify([
      'Check the error message for specific details',
      'Review the stack trace for the source of the error',
      'Search for the error message online',
    ]),
    documentation: overrides.documentation ?? (faker.datatype.boolean() ? 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors' : null),
    createdAt: overrides.createdAt || faker.date.recent({ days: 30 }),
    updatedAt: overrides.updatedAt || faker.date.recent({ days: 30 }),
    deletedAt: null,
  }
}

/**
 * Generate a realistic stack trace
 */
function generateStackTrace(): string {
  const frameworks = ['react', 'next', 'webpack', 'vite', 'node']
  const files = [
    'Component.jsx',
    'api/route.ts',
    'utils/helpers.ts',
    'hooks/useData.ts',
    'pages/index.tsx',
    'components/Button.tsx',
    'lib/api.ts',
    'middleware.ts',
  ]
  
  const numFrames = faker.number.int({ min: 3, max: 8 })
  const traces: string[] = []
  
  for (let i = 0; i < numFrames; i++) {
    const file = faker.helpers.arrayElement(files)
    const line = faker.number.int({ min: 1, max: 500 })
    const col = faker.number.int({ min: 1, max: 80 })
    const framework = faker.helpers.arrayElement(frameworks)
    traces.push(`    at ${file} (${framework}://${file}:${line}:${col})`)
  }
  
  return traces.join('\n')
}

/**
 * Create multiple test analyses
 */
export function createAnalyses(count: number, baseOverrides: AnalysisFactoryOptions = {}): Analysis[] {
  return Array.from({ length: count }, () => createAnalysis(baseOverrides))
}

/**
 * Create `count` analyses owned by `userId`
 */
export function createAnalysesForUser(userId: string, count: number = 20): Analysis[] {
  return createAnalyses(count, { userId })
}

/**
 * Analysis fixtures for common test scenarios
 */
export const analysisFixtures = {
  // Single analyses by error type
  typeError: (userId: string) => createAnalysis({
    userId,
    errorInput: 'TypeError: Cannot read properties of undefined (reading \'map\')',
    errorType: 'TypeError',
    model: 'deepseek-coder:6.7b',
    confidence: 0.95,
    tokensUsed: 180,
  }),
  
  referenceError: (userId: string) => createAnalysis({
    userId,
    errorInput: 'ReferenceError: process is not defined',
    errorType: 'ReferenceError',
    model: 'deepseek-coder:6.7b',
    confidence: 0.92,
    tokensUsed: 170,
  }),
  
  authError: (userId: string) => createAnalysis({
    userId,
    errorInput: 'Error: Request failed with status code 401',
    errorType: 'AuthenticationError',
    model: 'deepseek-coder:6.7b',
    confidence: 0.98,
    tokensUsed: 160,
  }),
  
  syntaxError: (userId: string) => createAnalysis({
    userId,
    errorInput: 'SyntaxError: Unexpected token \'<\'',
    errorType: 'SyntaxError',
    model: 'deepseek-coder:6.7b',
    confidence: 0.9,
    tokensUsed: 150,
  }),
  
  networkError: (userId: string) => createAnalysis({
    userId,
    errorInput: 'Error: connect ECONNREFUSED 127.0.0.1:5432',
    errorType: 'NetworkError',
    model: 'deepseek-coder:6.7b',
    confidence: 0.85,
    tokensUsed: 140,
  }),
  
  // With stack trace
  withStackTrace: (userId: string) => createAnalysis({
    userId,
    errorInput: 'TypeError: Cannot read properties of undefined (reading \'map\')',
    errorType: 'TypeError',
    stackTrace: 'TypeError: Cannot read properties of undefined (reading \'map\')\n    at Component.jsx (webpack://Component.jsx:42:20)\n    at processChild (react-reconciler.js:123:5)\n    at reconcileChildren (react-reconciler.js:89:12)\n    at updateHostComponent (react-reconciler.js:234:7)',
  }),
  
  // High severity
  highSeverity: (userId: string) => createAnalysis({
    userId,
    errorInput: 'Error: Database connection lost',
    errorType: 'DatabaseError',
    stackTrace: 'at Pool.query (pg-pool.js:45:12)',
  }),
  
  // Low token usage (simple error)
  simpleError: (userId: string) => createAnalysis({
    userId,
    errorInput: 'SyntaxError: Unexpected token',
    errorType: 'SyntaxError',
    tokensUsed: 80,
  }),
  
  // Complex error with many tokens
  complexError: (userId: string) => createAnalysis({
    userId,
    errorInput: 'Complex multi-line error with extensive context...',
    errorType: 'UnknownError',
    tokensUsed: 800,
  }),
  
  // Batch of analyses
  userHistory: (userId: string, count: number = 20): Analysis[] => createAnalyses(count, { userId }),
  
  // Create analyses for user (alias for userHistory)
  createAnalysesForUser: (userId: string, count: number): Analysis[] => createAnalyses(count, { userId }),

  // Mixed error types
  mixedTypes: (userId: string): Analysis[] => [
    createAnalysis({ userId, errorInput: 'TypeError: Cannot read properties of undefined', errorType: 'TypeError' }),
    createAnalysis({ userId, errorInput: 'ReferenceError: foo is not defined', errorType: 'ReferenceError' }),
    createAnalysis({ userId, errorInput: 'Error: 401 Unauthorized', errorType: 'AuthenticationError' }),
    createAnalysis({ userId, errorInput: 'SyntaxError: Unexpected token', errorType: 'SyntaxError' }),
    createAnalysis({ userId, errorInput: 'Error: ECONNREFUSED', errorType: 'NetworkError' }),
  ],
}