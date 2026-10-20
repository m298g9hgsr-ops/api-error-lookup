module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['C:/Users/aka21009lkk/Documents/deepseek-harness/default-workspace/pstack-project/api-error-lookup/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': 'C:/Users/aka21009lkk/Documents/deepseek-harness/default-workspace/pstack-project/api-error-lookup/src/$1',
    '^@prisma/client$': 'C:/Users/aka21009lkk/Documents/deepseek-harness/default-workspace/pstack-project/api-error-lookup/tests/__mocks__/@prisma/client.ts',
  },
  setupFilesAfterEnv: ['C:/Users/aka21009lkk/Documents/deepseek-harness/default-workspace/pstack-project/api-error-lookup/tests/setup/jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/app/**/*.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 70,
      statements: 70,
    },
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'C:/Users/aka21009lkk/Documents/deepseek-harness/default-workspace/pstack-project/api-error-lookup/tsconfig.json',
    }],
  },
  testTimeout: 30000,
  verbose: true,
  testPathIgnorePatterns: [
    'C:/Users/aka21009lkk/Documents/deepseek-harness/default-workspace/pstack-project/api-error-lookup/node_modules/',
    'C:/Users/aka21009lkk/Documents/deepseek-harness/default-workspace/pstack-project/api-error-lookup/.next/',
    'C:/Users/aka21009lkk/Documents/deepseek-harness/default-workspace/pstack-project/api-error-lookup/.bun/',
    'C:/Users/aka21009lkk/Documents/deepseek-harness/default-workspace/pstack-project/api-error-lookup/.local/',
  ],
  modulePathIgnorePatterns: [
    'C:/Users/aka21009lkk/Documents/deepseek-harness/default-workspace/.bun/',
    'C:/Users/aka21009lkk/Documents/deepseek-harness/default-workspace/.local/',
  ],
}