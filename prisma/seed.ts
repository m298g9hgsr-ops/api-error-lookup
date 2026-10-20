import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default plans
  const freePlan = await prisma.plan.upsert({
    where: { name: 'free' },
    update: {},
    create: {
      name: 'free',
      description: 'Free tier for occasional use',
      priceMonthly: 0,
      priceYearly: 0,
      maxRequestsPerDay: 10,
      features: JSON.stringify({
        maxRequestsPerDay: 10,
        aiAnalysis: true,
        errorHistory: 7, // days
        prioritySupport: false,
      }),
      isActive: true,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { name: 'pro' },
    update: {},
    create: {
      name: 'pro',
      description: 'For developers who need more',
      priceMonthly: 1900, // $19.00
      priceYearly: 19000, // $190.00/year
      maxRequestsPerDay: -1, // unlimited
      features: JSON.stringify({
        maxRequestsPerDay: -1,
        aiAnalysis: true,
        errorHistory: 90, // days
        prioritySupport: true,
        advancedAnalytics: true,
      }),
      isActive: true,
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { name: 'enterprise' },
    update: {},
    create: {
      name: 'enterprise',
      description: 'For teams and organizations',
      priceMonthly: 9900, // $99.00
      priceYearly: 99000, // $990.00/year
      maxRequestsPerDay: -1, // unlimited
      features: JSON.stringify({
        maxRequestsPerDay: -1,
        aiAnalysis: true,
        errorHistory: 365, // days
        prioritySupport: true,
        advancedAnalytics: true,
        teamManagement: true,
        sso: true,
        customIntegrations: true,
      }),
      isActive: true,
    },
  });

  console.log('Created plans:', { freePlan, proPlan, enterprisePlan });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });