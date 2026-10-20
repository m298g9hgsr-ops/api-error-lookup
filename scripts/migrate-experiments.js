// Add experiment tracking tables
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

async function runMigration() {
  try {
    const sqlite = await import('node:sqlite');
    const db = new sqlite.DatabaseSync(dbPath);
    
    console.log('Adding experiment tracking tables...');
    
    // Create ExperimentRun table
    db.exec(`
      CREATE TABLE IF NOT EXISTS "ExperimentRun" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "promptVersion" TEXT NOT NULL,
        "testCase" TEXT NOT NULL,
        "inputTokens" INTEGER NOT NULL,
        "outputTokens" INTEGER NOT NULL,
        "totalTokens" INTEGER NOT NULL,
        "latencyMs" INTEGER NOT NULL,
        "qualityScore" INTEGER,  -- 1-5 human rating
        "notes" TEXT,
        "model" TEXT NOT NULL,
        "errorInput" TEXT NOT NULL,
        "aiResponse" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('ExperimentRun table created');
    
    // Create ExperimentSummary table for aggregated stats
    db.exec(`
      CREATE TABLE IF NOT EXISTS "ExperimentSummary" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "promptVersion" TEXT NOT NULL UNIQUE,
        "totalRuns" INTEGER NOT NULL DEFAULT 0,
        "avgInputTokens" REAL,
        "avgOutputTokens" REAL,
        "avgTotalTokens" REAL,
        "avgLatencyMs" REAL,
        "avgQualityScore" REAL,
        "lastRunAt" DATETIME,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('ExperimentSummary table created');
    
    // Create indexes for performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS "idx_experiment_run_version" ON "ExperimentRun"("promptVersion");
      CREATE INDEX IF NOT EXISTS "idx_experiment_run_testcase" ON "ExperimentRun"("testCase");
      CREATE INDEX IF NOT EXISTS "idx_experiment_run_created" ON "ExperimentRun"("createdAt");
    `);
    console.log('Indexes created');
    
    // Verify
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ExperimentRun', 'ExperimentSummary')").all();
    console.log('Verification:', tables);
    
    db.close();
  } catch (error) {
    console.error('Migration error:', error.message);
  }
}

runMigration();