#!/usr/bin/env node
/**
 * Test Environment Setup & Verification Script
 * Validates that all testing dependencies are properly configured
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { spawnSync } from 'node:child_process'

const PROJECT_ROOT = 'C:/Users/aka21009lkk/Documents/deepseek-harness/default-workspace/pstack-project/api-error-lookup'

interface CheckResult {
  name: string
  passed: boolean
  message: string
  details?: string
}

async function runCheck(name: string, checkFn: () => Promise<CheckResult>): Promise<CheckResult> {
  process.stdout.write(`  Checking ${name}... `)
  try {
    const result = await checkFn()
    if (result.passed) {
      console.log('✅')
    } else {
      console.log('❌')
      if (result.details) console.log(`    ${result.details}`)
    }
    return result
  } catch (error) {
    console.log('❌')
    console.log(`    Error: ${error}`)
    return { name, passed: false, message: String(error) }
  }
}

async function checkPackageJson() {
  const pkgPath = join(PROJECT_ROOT, 'package.json')
  if (!existsSync(pkgPath)) {
    return { name: 'package.json', passed: false, message: 'package.json not found' }
  }
  
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  const requiredScripts = ['test', 'test:unit', 'test:integration', 'test:e2e', 'test:coverage']
  const missingScripts = requiredScripts.filter(s => !pkg.scripts?.[s])
  
  if (missingScripts.length > 0) {
    return { 
      name: 'package.json scripts', 
      passed: false, 
      message: `Missing scripts: ${missingScripts.join(', ')}` 
    }
  }
  
  const requiredDeps = ['vitest', '@playwright/test', '@testing-library/react']
  const missingDeps = requiredDeps.filter(d => !pkg.devDependencies?.[d] && !pkg.dependencies?.[d])
  
  if (missingDeps.length > 0) {
    return { 
      name: 'package.json dependencies', 
      passed: false, 
      message: `Missing dependencies: ${missingDeps.join(', ')}` 
    }
  }
  
  return { name: 'package.json', passed: true, message: 'All required scripts and dependencies present' }
}

async function checkVitestConfig() {
  const configPath = join(PROJECT_ROOT, 'vitest.config.ts')
  if (!existsSync(configPath)) {
    return { name: 'vitest.config.ts', passed: false, message: 'vitest.config.ts not found' }
  }
  
  const config = readFileSync(configPath, 'utf-8')
  const required = ['collectCoverageFrom', 'coverageThreshold', 'moduleNameMapper', 'setupFilesAfterEnv']
  // vitest.config.ts uses different config keys
  const vitestRequired = ['environment', 'setupFiles', 'include', 'coverage', 'globals', 'alias']
  const missing = vitestRequired.filter(r => !config.includes(r))
  
  if (missing.length > 0) {
    return { 
      name: 'vitest.config.ts', 
      passed: false, 
      message: `Missing config: ${missing.join(', ')}` 
    }
  }
  
  return { name: 'vitest.config.ts', passed: true, message: 'Configuration valid' }
}

async function checkPlaywrightConfig() {
  const configPath = join(PROJECT_ROOT, 'playwright.config.ts')
  if (!existsSync(configPath)) {
    return { name: 'playwright.config.ts', passed: false, message: 'playwright.config.ts not found' }
  }
  
  const config = readFileSync(configPath, 'utf-8')
  const required = ['testDir', 'projects', 'webServer']
  const missing = required.filter(r => !config.includes(r))
  
  if (missing.length > 0) {
    return { 
      name: 'playwright.config.ts', 
      passed: false, 
      message: `Missing config: ${missing.join(', ')}` 
    }
  }
  
  return { name: 'playwright.config.ts', passed: true, message: 'Configuration valid' }
}

async function checkTestDirectories() {
  const dirs = [
    'tests/unit/services',
    'tests/unit/models',
    'tests/integration/api',
    'tests/e2e',
    'tests/fixtures',
    'tests/helpers',
    'tests/setup',
    'tests/__mocks__/@prisma',
  ]
  
  const missing = dirs.filter(d => !existsSync(join(PROJECT_ROOT, d)))
  
  if (missing.length > 0) {
    return { 
      name: 'Test directories', 
      passed: false, 
      message: `Missing directories: ${missing.join(', ')}` 
    }
  }
  
  return { name: 'Test directories', passed: true, message: 'All test directories exist' }
}

async function checkTestFiles() {
  const files = [
    'tests/unit/services/aiAnalysis.test.ts',
    'tests/unit/services/stripe.test.ts',
    'tests/unit/services/rateLimiter.test.ts',
    'tests/unit/models/prisma.test.ts',
    'tests/integration/api/analyze.test.ts',
    'tests/integration/api/auth.test.ts',
    'tests/integration/api/stripe.test.ts',
    'tests/e2e/auth.spec.ts',
    'tests/e2e/analyze.spec.ts',
    'tests/e2e/subscription.spec.ts',
    'tests/fixtures/data.ts',
    'tests/helpers/api.ts',
    'tests/helpers/auth.ts',
    'tests/setup/vitest.setup.tsx',
    'tests/setup/msw.setup.ts',
    'tests/__mocks__/@prisma/client.ts',
  ]
  
  const missing = files.filter(f => !existsSync(join(PROJECT_ROOT, f)))
  
  if (missing.length > 0) {
    return { 
      name: 'Test files', 
      passed: false, 
      message: `Missing files: ${missing.join(', ')}` 
    }
  }
  
  return { name: 'Test files', passed: true, message: 'All test files present' }
}

async function checkPrismaSchema() {
  const schemaPath = join(PROJECT_ROOT, 'prisma/schema.prisma')
  if (!existsSync(schemaPath)) {
    return { name: 'Prisma schema', passed: false, message: 'prisma/schema.prisma not found' }
  }
  
  const schema = readFileSync(schemaPath, 'utf-8')
  const requiredModels = ['User', 'Analysis', 'Plan', 'Subscription', 'Account', 'Session']
  const missingModels = requiredModels.filter(m => !schema.includes(`model ${m}`))
  
  if (missingModels.length > 0) {
    return { 
      name: 'Prisma schema models', 
      passed: false, 
      message: `Missing models: ${missingModels.join(', ')}` 
    }
  }
  
  return { name: 'Prisma schema', passed: true, message: 'All required models defined' }
}

async function checkSourceFiles() {
  const files = [
    'src/services/aiAnalysis.ts',
    'src/services/stripe.ts',
    'src/services/rateLimiter.ts',
    'src/lib/prisma.ts',
    'src/lib/auth.ts',
    'src/app/api/analyze/route.ts',
    'src/app/api/auth/[...nextauth]/route.ts',
    'src/app/api/stripe/checkout/route.ts',
    'src/app/api/stripe/portal/route.ts',
    'src/app/api/stripe/webhook/route.ts',
  ]
  
  const missing = files.filter(f => !existsSync(join(PROJECT_ROOT, f)))
  
  if (missing.length > 0) {
    return { 
      name: 'Source files', 
      passed: false, 
      message: `Missing source files: ${missing.join(', ')}` 
    }
  }
  
  return { name: 'Source files', passed: true, message: 'All source files present' }
}

async function checkNodeModules() {
  const nodeModules = join(PROJECT_ROOT, 'node_modules')
  if (!existsSync(nodeModules)) {
    return { name: 'node_modules', passed: false, message: 'Dependencies not installed. Run: npm install' }
  }
  
  // Check key packages
  const keyPackages = ['vitest', 'playwright', '@prisma/client', '@testing-library/react']
  const missing = keyPackages.filter(p => !existsSync(join(nodeModules, p)))
  
  if (missing.length > 0) {
    return { 
      name: 'node_modules', 
      passed: false, 
      message: `Missing packages: ${missing.join(', ')}` 
    }
  }
  
  return { name: 'node_modules', passed: true, message: 'Dependencies installed' }
}

async function runQuickTest() {
  try {
    // Run a quick unit test to verify Vitest works
    const result = spawnSync('npx', ['vitest', 'run', 'tests/unit/services/aiAnalysis.test.ts', '-t', 'validateAnalysisRequest'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: 'pipe',
      shell: true
    })
    
    const output = result.stdout + result.stderr
    if (result.status === 0 && (output.includes('PASS') || output.includes('✓') || output.includes('Test Files'))) {
      return { name: 'Quick test run', passed: true, message: 'Vitest executes tests correctly' }
    }
    return { name: 'Quick test run', passed: false, message: 'Test execution failed', details: output }
  } catch (error) {
    return { name: 'Quick test run', passed: false, message: 'Test execution error', details: String(error) }
  }
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         api-error-lookup Test Environment Checker            ║
╚═══════════════════════════════════════════════════════════════╝
`)

  const checks = [
    checkPackageJson(),
    checkVitestConfig(),
    checkPlaywrightConfig(),
    checkTestDirectories(),
    checkTestFiles(),
    checkPrismaSchema(),
    checkSourceFiles(),
    checkNodeModules(),
    runQuickTest(),
  ]

  const results = await Promise.all(checks)
  
  console.log('\n' + '='.repeat(60))
  console.log('📋 Summary')
  console.log('='.repeat(60))
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  
  results.forEach(r => {
    const status = r.passed ? '✅' : '❌'
    console.log(`${status} ${r.name}: ${r.message}`)
  })
  
  console.log('\n' + '='.repeat(60))
  console.log(`Total: ${passed}/${results.length} checks passed`)
  
  if (failed === 0) {
    console.log('\n🎉 All checks passed! Test environment is ready.')
    console.log('\nRun tests with:')
    console.log('  npm test                    # All tests')
    console.log('  npm run test:unit           # Unit tests only')
    console.log('  npm run test:integration    # Integration tests only')
    console.log('  npm run test:e2e            # E2E tests (requires dev server)')
    console.log('  npm run test:coverage       # With coverage report')
    console.log('  npx tsx scripts/run-tests.ts --help  # Custom test runner')
    process.exit(0)
  } else {
    console.log(`\n⚠️  ${failed} check(s) failed. Please fix the issues above.`)
    process.exit(1)
  }
}

main().catch(console.error)