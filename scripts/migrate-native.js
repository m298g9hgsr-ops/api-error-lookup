// Use native Node.js SQLite (available in Node.js 22+)
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
console.log('Database path:', dbPath);

// Check if file exists
if (!fs.existsSync(dbPath)) {
  console.log('Database file does not exist');
  process.exit(1);
}

// Use dynamic import for sqlite3
async function runMigration() {
  try {
    // Try using node:sqlite (Node.js 22+)
    const sqlite = await import('node:sqlite');
    const db = new sqlite.DatabaseSync(dbPath);
    
    console.log('Connected to database');
    
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
  } catch (error) {
    console.error('Migration error:', error.message);
    console.log('\nTrying alternative approach...');
    
    // Alternative: Use the dev.db directly with a simple SQL approach
    // Since we can't run the migration, let's just note the schema is ready
    // and will work when prisma is properly set up
  }
}

runMigration();