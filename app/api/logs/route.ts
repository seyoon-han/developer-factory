import { NextResponse } from 'next/server';
import { logger, LOG_FOLDER_PATH } from '@/lib/utils/logger';
import path from 'path';

/**
 * GET /api/logs
 * Get list of available log files and info
 */
export async function GET(request: Request) {
  try {
    logger.debug('Fetching log files list');
    const logFiles = logger.getLogFiles();
    
    // Parse file names to get dates
    const logs = logFiles.map(file => {
      const match = file.match(/server-(\d{4}-\d{2}-\d{2})\.log/);
      const date = match ? match[1] : '';
      
      return {
        filename: file,
        date,
        path: path.join(LOG_FOLDER_PATH, file),
      };
    });

    // Get absolute path for logs folder
    const absolutePath = path.resolve(LOG_FOLDER_PATH);
    const hostPath = process.env.HOST_LOGS_PATH || absolutePath;

    logger.info(`Log files list retrieved`, { count: logs.length });

    return NextResponse.json({
      success: true,
      logs,
      logFolderPath: absolutePath,
      hostLogFolderPath: hostPath,
      totalFiles: logs.length,
    });
  } catch (error: any) {
    logger.error('Error fetching log files', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch log files' },
      { status: 500 }
    );
  }
}

