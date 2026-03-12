import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/logs/[date]
 * Get log content for a specific date
 * Date format: YYYY-MM-DD
 */
export async function GET(
  request: Request,
  { params }: { params: { date: string } }
) {
  try {
    const { date } = params;

    logger.debug('Fetching log content for date', { date });

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      logger.warn('Invalid date format requested', { date });
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const content = logger.getLogContent(date);

    if (!content) {
      logger.warn('Log file not found', { date });
      return NextResponse.json(
        { error: 'Log file not found for this date' },
        { status: 404 }
      );
    }

    const lineCount = content.split('\n').length - 1;
    logger.info('Log content retrieved', { date, lines: lineCount });

    return NextResponse.json({
      success: true,
      date,
      content,
      lines: lineCount,
    });
  } catch (error: any) {
    logger.error('Error fetching log content', { error: error.message, date: params.date });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch log content' },
      { status: 500 }
    );
  }
}

