const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// Check if Analysis table exists
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Analysis'").all();
console.log('Analysis table check:', tables);

if (!tables || tables.length === 0) {
  console.log('Creating Analysis table...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS "Analysis" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT,
      "errorInput" TEXT NOT NULL,
      "stackTrace" TEXT,
      "context" TEXT,
      "model" TEXT NOT NULL DEFAULT 'deepseek-coder',
      "errorType" TEXT NOT NULL,
      "analysis" TEXT NOT NULL,
      "suggestions" TEXT NOT NULL,
      "documentation" TEXT,
      "confidence" REAL NOT NULL,
      "tokensUsed" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
  
  console.log('Analysis table created successfully');
} else {
  console.log('Analysis table already exists');
}

// Verify
const newTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Analysis'").all();
console.log('Verification:', newTables);

db.close();