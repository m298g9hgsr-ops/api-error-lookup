import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Running database migration...');
  
  // Check if Analysis table exists
  try {
    const result = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='Analysis'`;
    console.log('Analysis table check:', result);
    
    if (!result || (result as any[]).length === 0) {
      console.log('Creating Analysis table...');
      await prisma.$executeRaw`
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
          CONSTRAINT "Analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        )
      `;
      console.log('Analysis table created successfully');
    } else {
      console.log('Analysis table already exists');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);