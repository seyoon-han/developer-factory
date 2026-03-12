/**
 * API Request Logger
 * Helper to log API requests and responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

interface LogContext {
  method: string;
  path: string;
  params?: Record<string, any>;
  query?: Record<string, any>;
  body?: any;
  userId?: string;
  requestId?: string;
}

/**
 * Log incoming API request
 */
export function logRequest(request: NextRequest, context?: Partial<LogContext>) {
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;
  const query = Object.fromEntries(url.searchParams);
  
  logger.info(`${method} ${path}`, {
    method,
    path,
    query: Object.keys(query).length > 0 ? query : undefined,
    userAgent: request.headers.get('user-agent'),
    requestId: request.headers.get('x-request-id'),
    ...context,
  });
}

/**
 * Log API response
 */
export function logResponse(
  request: NextRequest,
  response: NextResponse | Response,
  startTime: number,
  context?: Partial<LogContext>
) {
  const duration = Date.now() - startTime;
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;
  const status = response.status;
  
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
  
  logger[level](`${method} ${path} ${status}`, {
    method,
    path,
    status,
    duration: `${duration}ms`,
    requestId: request.headers.get('x-request-id'),
    ...context,
  });
}

/**
 * Log API error
 */
export function logError(
  request: NextRequest,
  error: Error | any,
  context?: Partial<LogContext>
) {
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;
  
  logger.error(`${method} ${path} ERROR`, {
    method,
    path,
    error: error?.message || String(error),
    stack: error?.stack,
    requestId: request.headers.get('x-request-id'),
    ...context,
  });
}

/**
 * Wrap API route handler with logging
 */
export function withLogging<T extends (...args: any[]) => Promise<NextResponse | Response>>(
  handler: T,
  routeName?: string
): T {
  return (async (...args: any[]) => {
    const request = args[0] as NextRequest;
    const startTime = Date.now();
    
    try {
      logRequest(request, { path: routeName });
      const response = await handler(...args);
      logResponse(request, response, startTime, { path: routeName });
      return response;
    } catch (error) {
      logError(request, error, { path: routeName });
      throw error;
    }
  }) as T;
}

