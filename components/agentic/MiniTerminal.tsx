'use client';

/**
 * MiniTerminal Component
 * Displays real-time streaming logs in a terminal-like mini view
 * Follows TDD - implemented to pass the test suite
 */

import React, { useEffect, useRef, useState } from 'react';
import { AgenticLog } from '@/types/agentic-task';
import { cn } from '@/lib/utils/cn';

interface MiniTerminalProps {
  logs: AgenticLog[];
  maxLines?: number;
  maxChars?: number;
  isStreaming?: boolean;
  showHeader?: boolean;
  phase?: string;
  onClick?: (e?: React.MouseEvent) => void;
  className?: string;
}

export function MiniTerminal({
  logs,
  maxLines = 5,
  maxChars = 80,
  isStreaming = false,
  showHeader = false,
  phase,
  onClick,
  className,
}: MiniTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [prevLogCount, setPrevLogCount] = useState(logs.length);

  // Get last N logs
  const visibleLogs = logs.slice(-maxLines);

  // Track new logs for animation
  const newLogsStartIndex = Math.max(0, logs.length - prevLogCount);

  useEffect(() => {
    setPrevLogCount(logs.length);
  }, [logs.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLevelColor = (level: AgenticLog['level']): string => {
    switch (level) {
      case 'info':
        return 'text-[hsl(var(--muted-foreground))]';
      case 'success':
        return 'text-[hsl(var(--primary))]';
      case 'error':
        return 'text-[hsl(var(--destructive))]';
      case 'warning':
        return 'text-[hsl(var(--chart-4))]';
      case 'progress':
        return 'text-[hsl(var(--chart-1))]';
      case 'debug':
        return 'text-[hsl(var(--muted-foreground))]/60';
      default:
        return 'text-[hsl(var(--muted-foreground))]';
    }
  };

  const getLevelPrefix = (level: AgenticLog['level']): string => {
    switch (level) {
      case 'info':
        return '>';
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '!';
      case 'progress':
        return '▸';
      case 'debug':
        return '·';
      default:
        return '>';
    }
  };

  const truncateMessage = (message: string): string => {
    if (message.length <= maxChars) return message;
    return message.slice(0, maxChars - 3) + '...';
  };

  return (
    <div
      data-testid="mini-terminal"
      onClick={onClick}
      className={cn(
        'bg-black/90 rounded-[2px] overflow-hidden font-mono',
        onClick && 'cursor-pointer hover:bg-black',
        className
      )}
    >
      {/* Header */}
      {showHeader && (
        <div
          data-testid="terminal-header"
          className="flex items-center gap-2 px-2 py-1 bg-[hsl(var(--muted))]/20 border-b border-[hsl(var(--border))]/20"
        >
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--destructive))]" />
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--chart-4))]" />
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />
          </div>
          {phase && (
            <span className="text-[8px] text-[hsl(var(--muted-foreground))] uppercase">
              {phase}
            </span>
          )}
        </div>
      )}

      {/* Log Lines */}
      <div
        ref={containerRef}
        className="p-2 space-y-0.5 max-h-24 overflow-y-auto scrollbar-thin"
      >
        {visibleLogs.length === 0 ? (
          <div className="text-[10px] text-[hsl(var(--muted-foreground))]/50 italic">
            Waiting for output...
          </div>
        ) : (
          visibleLogs.map((log, index) => {
            const globalIndex = logs.length - visibleLogs.length + index;
            const isNew = globalIndex >= logs.length - newLogsStartIndex - 1 && newLogsStartIndex > 0;
            
            return (
              <div
                key={log.id}
                data-testid="log-line"
                className={cn(
                  'text-[10px] leading-tight whitespace-nowrap overflow-hidden',
                  getLevelColor(log.level),
                  isNew && 'animate-slide-in'
                )}
              >
                <span className="opacity-50 mr-1">{getLevelPrefix(log.level)}</span>
                {truncateMessage(log.message)}
              </div>
            );
          })
        )}
        
        {/* Blinking Cursor */}
        {isStreaming && (
          <div className="flex items-center h-3">
            <span
              data-testid="blink-cursor"
              className="w-1.5 h-3 bg-[hsl(var(--primary))] animate-blink"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default MiniTerminal;

