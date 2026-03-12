import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/logs/tail
 * Get the last N lines of the current log file
 * Query param: lines (default: 100)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lines = parseInt(searchParams.get('lines') || '100', 10);

    logger.debug('Fetching log tail', { requestedLines: lines });

    if (isNaN(lines) || lines < 1 || lines > 10000) {
      logger.warn('Invalid tail lines requested', { lines });
      return NextResponse.json(
        { error: 'Lines must be between 1 and 10000' },
        { status: 400 }
      );
    }

    const content = logger.getTail(lines);
    const actualLines = content.split('\n').filter(line => line.trim()).length;

    logger.info('Log tail retrieved', { requestedLines: lines, actualLines });

    return NextResponse.json({
      success: true,
      content,
      lines: actualLines,
      requestedLines: lines,
    });
  } catch (error: any) {
    logger.error('Error fetching log tail', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch log tail' },
      { status: 500 }
    );
  }
}

