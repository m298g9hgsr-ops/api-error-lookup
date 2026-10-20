#!/usr/bin/env bun
/**
 * Test Runner Script for api-error-lookup
 * Provides a convenient CLI to run different test suites
 */

import { $ } from 'bun'
import { parseArgs } from 'node:util'

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
  args: Bun.argv.slice(2),
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

Usage: bun run scripts/run-tests.ts [options]

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
  bun run scripts/run-tests.ts                    # Run all tests
  bun run scripts/run-tests.ts --unit             # Unit tests only
  bun run scripts/run-tests.ts --integration      # Integration tests only
  bun run scripts/run-tests.ts --e2e              # E2E tests only
  bun run scripts/run-tests.ts --coverage         # With coverage report
  bun run scripts/run-tests.ts --watch            # Watch mode
  bun run scripts/run-tests.ts -f tests/unit/services/aiAnalysis.test.ts
  bun run scripts/run-tests.ts --unit --coverage  # Unit tests with coverage

Test Suites:
  Unit Tests (80% target):        tests/unit/
  Integration Tests (70% target): tests/integration/
  E2E Tests (100% core paths):   tests/e2e/
`)
}

async function runCommand(cmd: string, description: string) {
  console.log(`\n📋 ${description}`)
  console.log(`   Command: ${cmd}`)
  console.log('─'.repeat(60))
  
  try {
    const result = await $`${cmd}`.text()
    console.log(result)
    return { success: true, output: result }
  } catch (error) {
    console.error(`❌ Failed: ${error}`)
    return { success: false, error }
  }
}

async function main() {
  if (values.help) {
    showHelp()
    process.exit(0)
  }

  const isCI = process.env.CI === 'true'
  const baseCmd = 'bun test'
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
  if (values.verbose) extraFlags += ' --verbose'
  if (isCI) extraFlags += ' --ci'

  const fullCmd = `${baseCmd} ${testPath}${extraFlags}`

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    api-error-lookup Test Runner               ║
║                                                              ║
║  Test Suite: ${testPath.padEnd(45)}║
║  Coverage:   ${values.coverage ? 'Enabled' : 'Disabled'.padEnd(45)}║
║  Watch Mode: ${values.watch ? 'Enabled' : 'Disabled'.padEnd(45)}║
╚══════════════════════════════════════════════════════════════╝
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
      await $`curl -s http://localhost:3000 > /dev/null`.quiet()
      console.log('✅ Dev server is running on http://localhost:3000')
    } catch {
      console.log('⚠️  Dev server not detected. Starting...')
      if (!isCI) {
        console.log('   Run "bun run dev" in another terminal, then run E2E tests')
      }
    }
  }

  const result = await runCommand(fullCmd, `Running ${testPath} tests`)

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

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})