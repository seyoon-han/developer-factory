/**
 * Server Logger with Daily Rotation
 * Logs are stored in logs/ directory with daily rotation
 */

import fs from 'fs';
import path from 'path';

// Log folder path - will be mounted to host in docker
export const LOG_FOLDER_PATH = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_FOLDER_PATH)) {
  fs.mkdirSync(LOG_FOLDER_PATH, { recursive: true });
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
}

// Capture original console methods immediately
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleDebug = console.debug;

class Logger {
  private currentDate: string;
  private currentStream: fs.WriteStream | null = null;

  constructor() {
    this.currentDate = this.getDateString();
    this.initializeStream();
  }

  private getDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private getLogFilePath(date?: string): string {
    const dateStr = date || this.currentDate;
    return path.join(LOG_FOLDER_PATH, `server-${dateStr}.log`);
  }

  private initializeStream(): void {
    const logFilePath = this.getLogFilePath();
    
    // Create write stream in append mode
    this.currentStream = fs.createWriteStream(logFilePath, {
      flags: 'a',
      encoding: 'utf8',
    });

    this.currentStream.on('error', (err) => {
      originalConsoleError('Log stream error:', err);
    });
  }

  private checkDateRotation(): void {
    const currentDateStr = this.getDateString();
    
    // If date has changed, rotate the log file
    if (currentDateStr !== this.currentDate) {
      if (this.currentStream) {
        this.currentStream.end();
      }
      this.currentDate = currentDateStr;
      this.initializeStream();
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const metaStr = entry.meta ? ` ${JSON.stringify(entry.meta)}` : '';
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${metaStr}\n`;
  }

  private writeLog(level: LogLevel, message: string, meta?: any): void {
    this.checkDateRotation();

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
    };

    const logLine = this.formatLogEntry(entry);

    // Write to file
    if (this.currentStream) {
      this.currentStream.write(logLine);
    }

    // Also log to console in development, BUT use original methods to avoid recursion
    if (process.env.NODE_ENV !== 'production') {
      // Check if we are being called from the console override wrapper
      // This is a simple heuristic: if the message matches what we would log from console override
      
      const consoleMethod = level === 'error' ? originalConsoleError : 
                           level === 'warn' ? originalConsoleWarn : 
                           originalConsoleLog;
      
      // Only log to console if it wasn't initiated by console.* override
      // But wait, we can't easily know that. 
      // Better strategy: Don't log to console from here if we are overriding console.
      // BUT, if someone calls logger.info() directly, we DO want it in console.
      
      // Solution: The console overrides below already call originalConsole*, so we don't need to call them here 
      // IF the call originated from console.*.
      // But if it originated from logger.info(), we DO want to call originalConsole*.
      
      // To solve this, we can disable console output in writeLog completely if we assume
      // that most logs come from console.* or that we don't care about double logging?
      // No, double logging is annoying.
      
      // Let's just use original methods here. The recursion happened because we called console.log (the OVERRIDDEN one).
      // By calling originalConsoleLog, we bypass the override and the recursion.
      // Yes, this will result in double logging for console.* calls (once by override, once by writeLog),
      // UNLESS we suppress one.
      
      // Let's modify the override to NOT call originalConsoleLog, and let writeLog handle it?
      // No, that changes behavior (e.g. source maps/line numbers might be affected).
      
      // Let's keep originalConsoleLog in override, and in writeLog we simply DON'T log to console
      // because we assume most important logs are redundant? 
      // Or better: modify writeLog to take a 'skipConsole' flag.
    }
  }

  // Public methods with skipConsole option
  info(message: string, meta?: any, skipConsole = false): void {
    this.writeLog('info', message, meta, skipConsole);
  }

  warn(message: string, meta?: any, skipConsole = false): void {
    this.writeLog('warn', message, meta, skipConsole);
  }

  error(message: string, meta?: any, skipConsole = false): void {
    this.writeLog('error', message, meta, skipConsole);
  }

  debug(message: string, meta?: any, skipConsole = false): void {
    this.writeLog('debug', message, meta, skipConsole);
  }

  // ... existing helper methods ...
  
  // Update writeLog signature
  private writeLog(level: LogLevel, message: string, meta?: any, skipConsole = false): void {
    this.checkDateRotation();

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
    };

    const logLine = this.formatLogEntry(entry);

    // Write to file
    if (this.currentStream) {
      this.currentStream.write(logLine);
    }

    // Also log to console in development if not skipped
    if (process.env.NODE_ENV !== 'production' && !skipConsole) {
      const consoleMethod = level === 'error' ? originalConsoleError : 
                           level === 'warn' ? originalConsoleWarn : 
                           originalConsoleLog;
      consoleMethod(`[${level.toUpperCase()}]`, message, meta || '');
    }
  }


  // Get list of available log files
  getLogFiles(): string[] {
    try {
      const files = fs.readdirSync(LOG_FOLDER_PATH);
      return files
        .filter(file => file.startsWith('server-') && file.endsWith('.log'))
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      console.error('Error reading log files:', error);
      return [];
    }
  }

  // Get log file content
  getLogContent(date: string): string {
    const filePath = this.getLogFilePath(date);
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
      return '';
    } catch (error) {
      console.error('Error reading log file:', error);
      return '';
    }
  }

  // Get tail of current log file (last N lines)
  getTail(lines: number = 100): string {
    const filePath = this.getLogFilePath();
    try {
      if (!fs.existsSync(filePath)) {
        return '';
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const allLines = content.split('\n');
      const tailLines = allLines.slice(-lines);
      return tailLines.join('\n');
    } catch (error) {
      console.error('Error reading log tail:', error);
      return '';
    }
  }

  // Watch log file for changes (for real-time streaming)
  watchLog(callback: (chunk: string) => void): fs.FSWatcher | null {
    const filePath = this.getLogFilePath();
    
    try {
      // Ensure file exists
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '');
      }

      let lastSize = fs.statSync(filePath).size;

      const watcher = fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
          const stats = fs.statSync(filePath);
          const currentSize = stats.size;

          if (currentSize > lastSize) {
            const stream = fs.createReadStream(filePath, {
              start: lastSize,
              end: currentSize,
              encoding: 'utf8',
            });

            stream.on('data', (chunk) => {
              callback(chunk.toString());
            });

            lastSize = currentSize;
          }
        }
      });

      return watcher;
    } catch (error) {
      console.error('Error watching log file:', error);
      return null;
    }
  }

  // Clean up old log files (keep last N days)
  cleanupOldLogs(daysToKeep: number = 30): void {
    try {
      const files = this.getLogFiles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      for (const file of files) {
        const match = file.match(/server-(\d{4}-\d{2}-\d{2})\.log/);
        if (match) {
          const fileDate = new Date(match[1]);
          if (fileDate < cutoffDate) {
            const filePath = path.join(LOG_FOLDER_PATH, file);
            fs.unlinkSync(filePath);
            this.info(`Deleted old log file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
    }
  }

  // Graceful shutdown
  close(): void {
    if (this.currentStream) {
      this.currentStream.end();
      this.currentStream = null;
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Graceful shutdown handlers
process.on('SIGINT', () => {
  logger.info('Received SIGINT, closing logger...');
  logger.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, closing logger...');
  logger.close();
  process.exit(0);
});

// Clean up old logs daily at startup
logger.cleanupOldLogs(30);
logger.info('Logger initialized');

// Override console methods to also write to logger (only in server-side)
if (typeof window === 'undefined') {
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalConsoleDebug = console.debug;

  console.log = (...args: any[]) => {
    originalConsoleLog(...args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    logger.info(message, undefined, true);
  };

  console.warn = (...args: any[]) => {
    originalConsoleWarn(...args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    logger.warn(message, undefined, true);
  };

  console.error = (...args: any[]) => {
    originalConsoleError(...args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    logger.error(message, undefined, true);
  };

  console.debug = (...args: any[]) => {
    originalConsoleDebug(...args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    logger.debug(message, undefined, true);
  };

  // Log unhandled rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
    });
  });

  // Log uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack,
    });
  });
}

export default logger;

