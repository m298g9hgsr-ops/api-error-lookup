import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export const aiService = async (userId: string, error: string) => {
  try {
    // 使用 Ollama 或 DeepSeek API 進行 AI 分析
    const response = await axios.post('http://localhost:3000/api/analyze', { userId, error });

    // 將 AI 的結果儲存到資料庫
    await prisma.analysis.create({
      data: {
        userId,
        errorInput: error,
        analysis: response.data.result || '',
        errorType: 'unknown',
        suggestions: '',
        documentation: null,
        confidence: 0,
        tokensUsed: 0,
      },
    });

    return response.data.result;
  } catch (error) {
    throw error;
  }
};

export const getErrorLogs = async (userId: string) => {
  try {
    const errorLogs = await prisma.analysis.findMany({
      where: { userId },
    });

    return errorLogs;
  } catch (error) {
    throw error;
  }
};

export const getErrorLogsByError = async (error: string) => {
  try {
    const errorLogs = await prisma.analysis.findMany({
      where: { errorInput: { contains: error } },
    });

    return errorLogs;
  } catch (error) {
    throw error;
  }
};

export const getUserErrorByError = async (error: string) => {
  try {
    const errorLogs = await prisma.analysis.findMany({
      where: { errorInput: { contains: error } },
    });

    return errorLogs;
  } catch (error) {
    throw error;
  }
};

export const getUserErrorDetailsByError = async (error: string) => {
  try {
    const errorLogs = await getUserErrorByError(error);

    return errorLogs;
  } catch (error) {
    throw error;
  }
};