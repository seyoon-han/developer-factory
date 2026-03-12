/**
 * Agentic Task Logs API
 * GET - Get execution logs for a task
 */

import { NextRequest, NextResponse } from 'next/server';
import { agenticLogsStore } from '@/lib/agentic/logs/agenticLogsStore';
import { AgenticLogEntry, AgenticLog, AgenticLogLevel } from '@/types/agentic-task';

// Map logType to level for UI compatibility
const logTypeToLevel: Record<string, AgenticLogLevel> = {
  info: 'info',
  progress: 'info',
  tool: 'debug',
  error: 'error',
  success: 'success',
  warning: 'warning',
};

// Transform AgenticLogEntry to AgenticLog for UI consumption
function transformLogForUI(entry: AgenticLogEntry): AgenticLog {
  return {
    id: entry.id,
    taskId: entry.taskId,
    phase: entry.phase as any,
    level: logTypeToLevel[entry.logType] || 'info',
    message: entry.message,
    timestamp: entry.createdAt,
    metadata: entry.metadata,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const phase = searchParams.get('phase');
    const fromDb = searchParams.get('fromDb') === 'true';

    let rawLogs: AgenticLogEntry[];

    if (fromDb) {
      if (phase) {
        rawLogs = await agenticLogsStore.getLogsByPhaseFromDB(taskId, phase);
      } else {
        rawLogs = await agenticLogsStore.getRecentLogsFromDB(taskId, limit);
      }
    } else {
      rawLogs = agenticLogsStore.getRecentLogs(taskId, limit);
    }

    // Transform logs to UI format
    const logs = rawLogs.map(transformLogForUI);

    const stats = agenticLogsStore.getLogStats(taskId);
    const terminalOutput = agenticLogsStore.formatForTerminal(taskId, 10);

    return NextResponse.json({
      success: true,
      logs,
      stats,
      terminalOutput,
    });
  } catch (error) {
    console.error('Failed to get logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get logs' },
      { status: 500 }
    );
  }
}
