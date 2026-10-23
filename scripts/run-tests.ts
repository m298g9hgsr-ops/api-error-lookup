#!/usr/bin/env node
/**
 * Test Runner Script for api-error-lookup
 * Provides a convenient CLI to run different test suites
 */

import { parseArgs } from 'node:util'
import { spawnSync } from 'node:child_process'

interface TestOptions {
  unit?: boolean
  integration?: boolean
  e2e?: boolean
  coverage?: boolean
  watch?: boolean
  verbose?: boolean
  file?: string
  help?: boolean
}

const args = parseArgs({
  args: process.argv.slice(2),
  options: {
    unit: { type: 'boolean', short: 'u' },
    integration: { type: 'boolean', short: 'i' },
    e2e: { type: 'boolean', short: 'e' },
    coverage: { type: 'boolean', short: 'c' },
    watch: { type: 'boolean', short: 'w' },
    verbose: { type: 'boolean', short: 'v' },
    file: { type: 'string', short: 'f' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
}) as { values: TestOptions; positionals: string[] }

const { values, positionals } = args

function showHelp() {
  console.log(`
🧪 api-error-lookup Test Runner

Usage: npx tsx scripts/run-tests.ts [options]

Options:
  -u, --unit           Run unit tests only
  -i, --integration    Run integration tests only
  -e, --e2e            Run E2E tests only (requires dev server)
  -c, --coverage       Generate coverage report
  -w, --watch          Watch mode for development
  -v, --verbose        Verbose output
  -f, --file <path>    Run specific test file
  -h, --help           Show this help

Examples:
  npx tsx scripts/run-tests.ts                    # Run all tests
  npx tsx scripts/run-tests.ts --unit             # Unit tests only
  npx tsx scripts/run-tests.ts --integration      # Integration tests only
  npx tsx scripts/run-tests.ts --e2e              # E2E tests only
  npx tsx scripts/run-tests.ts --coverage         # With coverage report
  npx tsx scripts/run-tests.ts --watch            # Watch mode
  npx tsx scripts/run-tests.ts -f tests/unit/services/aiAnalysis.test.ts
  npx tsx scripts/run-tests.ts --unit --coverage  # Unit tests with coverage

Test Suites:
  Unit Tests (80% target):        tests/unit/
  Integration Tests (70% target): tests/integration/
  E2E Tests (100% core paths):   tests/e2e/
`)
}

function runCommand(cmd: string, cmdArgs: string[], description: string): { success: boolean; output?: string; error?: Error } {
  console.log(`\n📋 ${description}`)
  console.log(`   Command: ${cmd} ${cmdArgs.join(' ')}`)
  console.log('─'.repeat(60))
  
  try {
    const result = spawnSync(cmd, cmdArgs, { 
      encoding: 'utf-8',
      stdio: 'inherit',
      shell: true 
    })
    
    if (result.status === 0) {
      return { success: true }
    } else {
      return { success: false, error: new Error(`Command failed with exit code ${result.status}`) }
    }
  } catch (error) {
    console.error(`❌ Failed: ${error}`)
    return { success: false, error: error as Error }
  }
}

async function main() {
  if (values.help) {
    showHelp()
    process.exit(0)
  }

  const isCI = process.env.CI === 'true'
  let testPath = ''
  let extraFlags = ''

  // Determine test path
  if (values.file) {
    testPath = values.file
  } else if (values.unit) {
    testPath = 'tests/unit'
  } else if (values.integration) {
    testPath = 'tests/integration'
  } else if (values.e2e) {
    testPath = 'tests/e2e'
  } else {
    testPath = 'tests'
  }

  // Build flags
  if (values.coverage) extraFlags += ' --coverage'
  if (values.watch) extraFlags += ' --watch'
  if (values.verbose) extraFlags += ' --reporter=verbose'
  if (isCI) extraFlags += ' --ci'

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    api-error-lookup Test Runner               ║
║                                                              ║
║  Test Suite: ${testPath.padEnd(45)}║
║  Coverage:   ${values.coverage ? 'Enabled' : 'Disabled'.padEnd(45)}║
║  Watch Mode: ${values.watch ? 'Enabled' : 'Disabled'.padEnd(45)}║
╚═══════════════════════════════════════════════════════════════╝
`)

  // Check if we're in the right directory
  const cwd = process.cwd()
  if (!cwd.includes('api-error-lookup')) {
    console.log('⚠️  Changing to api-error-lookup directory...')
    process.chdir('C:/Users/aka21009lkk/Documents/deepseek-harness/default-workspace/pstack-project/api-error-lookup')
  }

  // For E2E tests, check if dev server is running
  if (values.e2e || testPath.includes('e2e')) {
    console.log('🔍 Checking for dev server...')
    try {
      const response = await fetch('http://localhost:3000')
      if (response.ok) {
        console.log('✅ Dev server is running on http://localhost:3000')
      }
    } catch {
      console.log('⚠️  Dev server not detected. Starting...')
      if (!isCI) {
        console.log('   Run "npm run dev" in another terminal, then run E2E tests')
      }
    }
  }

  // Run unit/integration tests with vitest
  if (testPath === 'tests' || testPath.startsWith('tests/unit') || testPath.startsWith('tests/integration')) {
    const result = runCommand('npx', ['vitest', 'run', testPath, ...extraFlags.split(' ').filter(Boolean)], `Running ${testPath} tests`)
    
    if (result.success) {
      console.log('\n✅ All tests passed!')
      if (values.coverage) {
        console.log('\n📊 Coverage report generated in ./coverage/')
        console.log('   Open coverage/lcov-report/index.html for detailed report')
      }
    } else {
      console.log('\n❌ Some tests failed')
      process.exit(1)
    }
  }
  // Run E2E tests with Playwright
  else if (testPath.startsWith('tests/e2e')) {
    const result = runCommand('npx', ['playwright', 'test', testPath, ...extraFlags.split(' ').filter(Boolean)], `Running E2E tests`)
    
    if (result.success) {
      console.log('\n✅ All E2E tests passed!')
    } else {
      console.log('\n❌ Some E2E tests failed')
      process.exit(1)
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})