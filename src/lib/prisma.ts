import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// During `next build` there is no database to talk to, and instantiating the
// client eagerly makes the build fail. `getPrismaClient()` from the Prisma
// runtime returns a lazy proxy that only connects on first query, which is
// safe at build time.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

function createPrismaClient(): PrismaClient {
  if (isBuildPhase) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const runtime = require('@prisma/client/runtime/library');
      return runtime.getPrismaClient();
    } catch {
      // fall through to the regular client
    }
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;