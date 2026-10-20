export class ApiError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }

  static badRequest(message: string, code: string = 'BAD_REQUEST') {
    return new ApiError(message, 400, code);
  }

  static unauthorized(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    return new ApiError(message, 401, code);
  }

  static forbidden(message: string = 'Forbidden', code: string = 'FORBIDDEN') {
    return new ApiError(message, 403, code);
  }

  static notFound(message: string = 'Not found', code: string = 'NOT_FOUND') {
    return new ApiError(message, 404, code);
  }

  static tooManyRequests(message: string = 'Too many requests', code: string = 'RATE_LIMIT_EXCEEDED') {
    return new ApiError(message, 429, code);
  }

  static internal(message: string = 'Internal server error', code: string = 'INTERNAL_ERROR') {
    return new ApiError(message, 500, code);
  }
}

export function handleApiError(error: unknown): { error: string; code: string; statusCode: number } {
  if (error instanceof ApiError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    };
  }

  return {
    error: 'Unknown error',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  };
}

export function createApiResponse<T>(data: T, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createErrorResponse(error: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
  return new Response(JSON.stringify({ error, code }), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}