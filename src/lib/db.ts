import { prisma } from './prisma';

export { prisma };

export const handleError = async (error: any) => {
  try {
    // Create error analysis record
    await prisma.analysis.create({
      data: {
        userId: error.userId || 'unknown',
        errorInput: error.message || error.toString(),
        stackTrace: error.stack,
        errorType: error.status?.toString() || 'unknown',
        analysis: '',
        suggestions: '',
        confidence: 0,
        tokensUsed: 0,
      },
    });
  } catch (e) {
    console.error('Failed to log error:', e);
  }
};