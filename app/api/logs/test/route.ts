import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/logs/test
 * Generate test log entries to verify logging is working
 */
export async function POST() {
  try {
    logger.info('🧪 Test log entry - INFO level', { 
      timestamp: new Date().toISOString(),
      level: 'info',
      testId: Math.random().toString(36).substring(7),
    });

    logger.warn('⚠️ Test log entry - WARN level', { 
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'This is a warning message for testing',
    });

    logger.error('❌ Test log entry - ERROR level', { 
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'This is an error message for testing',
      stack: 'Test stack trace',
    });

    logger.debug('🔍 Test log entry - DEBUG level', { 
      timestamp: new Date().toISOString(),
      level: 'debug',
      details: {
        nested: 'object',
        array: [1, 2, 3],
        boolean: true,
      },
    });

    // Also test console methods (which should be captured)
    console.log('📝 Console.log test - should appear in logs');
    console.warn('⚠️ Console.warn test - should appear in logs');
    console.error('❌ Console.error test - should appear in logs');
    console.debug('🔍 Console.debug test - should appear in logs');

    return NextResponse.json({
      success: true,
      message: 'Test log entries generated successfully',
      entriesCreated: 8,
      tip: 'Check the Server Logs page or /logs to see the entries',
    });
  } catch (error: any) {
    logger.error('Error generating test logs', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to generate test logs' },
      { status: 500 }
    );
  }
}

