import { NextResponse } from 'next/server';
import { pool } from '@/lib/db/postgres';

/**
 * GET /api/health
 * Health check endpoint for Docker and monitoring
 */
export async function GET() {
  try {
    // Simple database connectivity check
    const result = await pool.query('SELECT 1 as test');

    if (result.rows[0]?.test === 1) {
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          board: 'running',
          database: 'connected',
        },
      });
    }

    throw new Error('Database check failed');
  } catch (error: any) {
    // Don't fail health check for table-specific errors
    if (error.message.includes('does not exist')) {
      // Tables not fully initialized, but app is healthy
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          board: 'running',
          database: 'connected',
          tables: 'initializing',
        },
      });
    }

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message
      },
      { status: 500 }
    );
  }
}

