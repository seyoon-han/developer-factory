/**
 * Agentic Logs Store
 * In-memory store for real-time log streaming with database persistence
 */

import { statements } from '@/lib/db/postgres';
import { AgenticLogEntry, AgenticLogEntryRow, AgenticLogType } from '@/types/agentic-task';

const MAX_LOGS_IN_MEMORY = 500;

export class AgenticLogsStore {
  private logs: Map<number, AgenticLogEntry[]> = new Map();

  /**
   * Add a log entry
   */
  async addLog(
    taskId: number,
    phase: string,
    logType: AgenticLogType,
    message: string,
    stepId?: number,
    metadata?: Record<string, unknown>
  ): Promise<AgenticLogEntry> {
    // Save to database
    const result = await statements.createAgenticLog.run(
      taskId,
      phase,
      stepId || null,
      logType,
      message,
      metadata ? JSON.stringify(metadata) : null
    );

    const logEntry: AgenticLogEntry = {
      id: Number(result.lastInsertRowid),
      taskId,
      phase,
      stepId,
      logType,
      message,
      metadata,
      createdAt: new Date().toISOString(),
    };

    // Add to in-memory cache
    if (!this.logs.has(taskId)) {
      this.logs.set(taskId, []);
    }

    const taskLogs = this.logs.get(taskId)!;
    taskLogs.push(logEntry);

    // Limit memory usage
    if (taskLogs.length > MAX_LOGS_IN_MEMORY) {
      taskLogs.shift();
    }

    return logEntry;
  }

  /**
   * Add info log
   */
  async info(taskId: number, phase: string, message: string, stepId?: number): Promise<void> {
    await this.addLog(taskId, phase, 'info', message, stepId);
  }

  /**
   * Add progress log
   */
  async progress(taskId: number, phase: string, message: string, stepId?: number): Promise<void> {
    await this.addLog(taskId, phase, 'progress', message, stepId);
  }

  /**
   * Add tool log
   */
  async tool(taskId: number, phase: string, message: string, stepId?: number, metadata?: Record<string, unknown>): Promise<void> {
    await this.addLog(taskId, phase, 'tool', message, stepId, metadata);
  }

  /**
   * Add error log
   */
  async error(taskId: number, phase: string, message: string, stepId?: number, metadata?: Record<string, unknown>): Promise<void> {
    await this.addLog(taskId, phase, 'error', message, stepId, metadata);
  }

  /**
   * Add success log
   */
  async success(taskId: number, phase: string, message: string, stepId?: number): Promise<void> {
    await this.addLog(taskId, phase, 'success', message, stepId);
  }

  /**
   * Add warning log
   */
  async warning(taskId: number, phase: string, message: string, stepId?: number): Promise<void> {
    await this.addLog(taskId, phase, 'warning', message, stepId);
  }

  /**
   * Get logs from memory cache (fast)
   */
  getLogs(taskId: number): AgenticLogEntry[] {
    return this.logs.get(taskId) || [];
  }

  /**
   * Get recent logs from memory cache
   */
  getRecentLogs(taskId: number, limit: number = 10): AgenticLogEntry[] {
    const taskLogs = this.logs.get(taskId) || [];
    return taskLogs.slice(-limit);
  }

  /**
   * Get all logs from database (complete history)
   */
  async getAllLogsFromDB(taskId: number): Promise<AgenticLogEntry[]> {
    const rows = await statements.getAgenticLogs.all(taskId) as AgenticLogEntryRow[];
    return rows.map(this.rowToLogEntry);
  }

  /**
   * Get logs by phase from database
   */
  async getLogsByPhaseFromDB(taskId: number, phase: string): Promise<AgenticLogEntry[]> {
    const rows = await statements.getAgenticLogsByPhase.all(taskId, phase) as AgenticLogEntryRow[];
    return rows.map(this.rowToLogEntry);
  }

  /**
   * Get recent logs from database
   */
  async getRecentLogsFromDB(taskId: number, limit: number = 50): Promise<AgenticLogEntry[]> {
    const rows = await statements.getRecentAgenticLogs.all(taskId, limit) as AgenticLogEntryRow[];
    return rows.map(this.rowToLogEntry).reverse();
  }

  /**
   * Clear in-memory logs for a task
   */
  clearLogs(taskId: number): void {
    this.logs.delete(taskId);
  }

  /**
   * Clear all in-memory logs
   */
  clearAllLogs(): void {
    this.logs.clear();
  }

  /**
   * Delete logs from database
   */
  async deleteLogsFromDB(taskId: number): Promise<void> {
    await statements.deleteAgenticLogs.run(taskId);
    this.logs.delete(taskId);
  }

  /**
   * Format logs for display
   */
  formatLogsForDisplay(logs: AgenticLogEntry[], maxLines: number = 100): string {
    const lines: string[] = [];

    for (const log of logs.slice(-maxLines)) {
      const timestamp = new Date(log.createdAt).toLocaleTimeString();
      const icon = {
        info: 'ℹ️',
        progress: '🔄',
        tool: '🔧',
        error: '❌',
        success: '✅',
        warning: '⚠️',
      }[log.logType];

      lines.push(`[${timestamp}] ${icon} ${log.message}`);
    }

    return lines.join('\n');
  }

  /**
   * Format logs for terminal-like display (last N lines)
   */
  formatForTerminal(taskId: number, lines: number = 5): string[] {
    const logs = this.getRecentLogs(taskId, lines);
    return logs.map(log => {
      const icon = {
        info: '→',
        progress: '⋯',
        tool: '⚙',
        error: '✗',
        success: '✓',
        warning: '!',
      }[log.logType];

      // Truncate message to fit display
      const maxLen = 60;
      const message = log.message.length > maxLen
        ? log.message.slice(0, maxLen - 3) + '...'
        : log.message;

      return `${icon} ${message}`;
    });
  }

  /**
   * Get log statistics
   */
  async getLogStats(taskId: number): Promise<{
    total: number;
    byType: Record<AgenticLogType, number>;
    byPhase: Record<string, number>;
  }> {
    const logs = await this.getAllLogsFromDB(taskId);
    const byType: Record<AgenticLogType, number> = {
      info: 0,
      progress: 0,
      tool: 0,
      error: 0,
      success: 0,
      warning: 0,
    };
    const byPhase: Record<string, number> = {};

    for (const log of logs) {
      byType[log.logType]++;
      byPhase[log.phase] = (byPhase[log.phase] || 0) + 1;
    }

    return {
      total: logs.length,
      byType,
      byPhase,
    };
  }

  /**
   * Convert database row to AgenticLogEntry
   */
  private rowToLogEntry(row: AgenticLogEntryRow): AgenticLogEntry {
    return {
      id: row.id,
      taskId: row.task_id,
      phase: row.phase,
      stepId: row.step_id || undefined,
      logType: row.log_type,
      message: row.message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
    };
  }
}

// Singleton instance
export const agenticLogsStore = new AgenticLogsStore();
export default agenticLogsStore;
