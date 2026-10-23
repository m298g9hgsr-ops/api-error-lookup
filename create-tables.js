const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTables() {
  try {
    // Create ErrorPattern table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ErrorPattern" (
        id TEXT PRIMARY KEY,
        pattern TEXT UNIQUE NOT NULL,
        "errorType" TEXT NOT NULL,
        language TEXT,
        framework TEXT,
        "rootCause" TEXT NOT NULL,
        "fixTemplate" TEXT NOT NULL,
        "docLinks" TEXT NOT NULL DEFAULT '[]',
        tags TEXT NOT NULL DEFAULT '[]',
        frequency INTEGER NOT NULL DEFAULT 0,
        confidence REAL NOT NULL DEFAULT 0.8,
        "isVerified" BOOLEAN NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('ErrorPattern table created');
    
    // Create indexes for ErrorPattern
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ErrorPattern_errorType_idx" ON "ErrorPattern"("errorType")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ErrorPattern_language_idx" ON "ErrorPattern"(language)`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ErrorPattern_framework_idx" ON "ErrorPattern"(framework)`;
    console.log('ErrorPattern indexes created');
    
    // Create ExperimentRun table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ExperimentRun" (
        id TEXT PRIMARY KEY,
        "promptVersion" TEXT NOT NULL,
        "testCase" TEXT NOT NULL,
        "inputTokens" INTEGER NOT NULL,
        "outputTokens" INTEGER NOT NULL,
        "totalTokens" INTEGER NOT NULL,
        "latencyMs" INTEGER NOT NULL,
        model TEXT NOT NULL,
        "errorInput" TEXT NOT NULL,
        "aiResponse" TEXT NOT NULL,
        "qualityScore" REAL,
        notes TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('ExperimentRun table created');
    
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ExperimentRun_promptVersion_idx" ON "ExperimentRun"("promptVersion")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ExperimentRun_testCase_idx" ON "ExperimentRun"("testCase")`;
    console.log('ExperimentRun indexes created');
    
    // Create ExperimentSummary table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ExperimentSummary" (
        id TEXT PRIMARY KEY,
        "promptVersion" TEXT UNIQUE NOT NULL,
        "totalRuns" INTEGER NOT NULL DEFAULT 0,
        "avgInputTokens" REAL NOT NULL,
        "avgOutputTokens" REAL NOT NULL,
        "avgTotalTokens" REAL NOT NULL,
        "avgLatencyMs" REAL NOT NULL,
        "avgQualityScore" REAL,
        "lastRunAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('ExperimentSummary table created');
    
    // Create QuotaUsage table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "QuotaUsage" (
        id TEXT PRIMARY KEY,
        "userId" TEXT UNIQUE NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        "resetAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('QuotaUsage table created');
    
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "QuotaUsage_resetAt_idx" ON "QuotaUsage"("resetAt")`;
    console.log('QuotaUsage indexes created');
    
    console.log('All tables created successfully!');
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTables();