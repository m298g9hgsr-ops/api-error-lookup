const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    // Check new tables
    const errorPattern = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "ErrorPattern"`;
    console.log('ErrorPattern count:', errorPattern[0].count);
    
    const experimentRun = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "ExperimentRun"`;
    console.log('ExperimentRun count:', experimentRun[0].count);
    
    const experimentSummary = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "ExperimentSummary"`;
    console.log('ExperimentSummary count:', experimentSummary[0].count);
    
    const quotaUsage = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "QuotaUsage"`;
    console.log('QuotaUsage count:', quotaUsage[0].count);
    
    // Test inserting a record
    const testId = 'test-' + Date.now();
    await prisma.$executeRaw`
      INSERT INTO "ErrorPattern" (id, pattern, "errorType", "rootCause", "fixTemplate")
      VALUES (${testId}, 'test pattern', 'TestError', 'test cause', 'test fix')
    `;
    console.log('Test insert successful');
    
    // Clean up test record
    await prisma.$executeRaw`DELETE FROM "ErrorPattern" WHERE id = ${testId}`;
    console.log('Test cleanup successful');
    
    console.log('All verifications passed!');
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

verify();