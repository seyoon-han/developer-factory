/**
 * Implementation Logs Store
 * In-memory storage for implementation progress logs
 */

export interface ImplementationLog {
  taskId: number;
  timestamp: Date;
  type: 'info' | 'progress' | 'tool' | 'error' | 'success';
  message: string;
}

class ImplementationLogsStore {
  private logs: Map<number, ImplementationLog[]> = new Map();

  addLog(taskId: number, type: ImplementationLog['type'], message: string) {
    if (!this.logs.has(taskId)) {
      this.logs.set(taskId, []);
    }

    const log: ImplementationLog = {
      taskId,
      timestamp: new Date(),
      type,
      message,
    };

    this.logs.get(taskId)!.push(log);

    // Keep only last 1000 logs per task to prevent memory issues
    const taskLogs = this.logs.get(taskId)!;
    if (taskLogs.length > 1000) {
      this.logs.set(taskId, taskLogs.slice(-1000));
    }

    console.log(`[Task #${taskId}] ${type.toUpperCase()}: ${message}`);
  }

  getLogs(taskId: number): ImplementationLog[] {
    return this.logs.get(taskId) || [];
  }

  clearLogs(taskId: number) {
    this.logs.delete(taskId);
  }

  clearAllLogs() {
    this.logs.clear();
  }
}

export const implementationLogs = new ImplementationLogsStore();

