const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // Check existing tables
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'`;
    console.log('Existing tables:', tables);
    
    // Check if new tables exist
    const errorPattern = await prisma.$queryRaw`SELECT 1 FROM ErrorPattern LIMIT 1`;
    console.log('ErrorPattern exists:', errorPattern.length > 0);
    
    const experimentRun = await prisma.$queryRaw`SELECT 1 FROM ExperimentRun LIMIT 1`;
    console.log('ExperimentRun exists:', experimentRun.length > 0);
    
    const experimentSummary = await prisma.$queryRaw`SELECT 1 FROM ExperimentSummary LIMIT 1`;
    console.log('ExperimentSummary exists:', experimentSummary.length > 0);
    
    const quotaUsage = await prisma.$queryRaw`SELECT 1 FROM QuotaUsage LIMIT 1`;
    console.log('QuotaUsage exists:', quotaUsage.length > 0);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();