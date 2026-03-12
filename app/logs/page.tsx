'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Download, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Terminal, 
  TestTube, 
  Server, 
  Clock, 
  FileText, 
  Wifi, 
  WifiOff 
} from 'lucide-react';

interface LogFile {
  filename: string;
  date: string;
  path: string;
}

interface LogData {
  logs: LogFile[];
  logFolderPath: string;
  hostLogFolderPath: string;
  totalFiles: number;
}

export default function LogsPage() {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [logContent, setLogContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [logFolderPath, setLogFolderPath] = useState<string>('');
  
  // Real-time tail state
  const [isRealTime, setIsRealTime] = useState(true);
  const [realtimeContent, setRealtimeContent] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Load log files list
  useEffect(() => {
    loadLogFiles();
  }, []);

  // Set up real-time streaming when enabled
  useEffect(() => {
    if (isRealTime) {
      connectToStream();
      loadTail(); // Load initial tail
    } else {
      disconnectFromStream();
    }

    return () => {
      disconnectFromStream();
    };
  }, [isRealTime]);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [realtimeContent, logContent, autoScroll]);

  const loadLogFiles = async () => {
    try {
      const response = await fetch('/api/logs');
      const data: LogData = await response.json();
      
      setLogFiles(data.logs);
      setLogFolderPath(data.hostLogFolderPath);
      
      // Auto-select today's date
      if (data.logs.length > 0) {
        setSelectedDate(data.logs[0].date);
      }
    } catch (err: any) {
      setError('Failed to load log files');
      console.error('Error loading log files:', err);
    }
  };

  const loadTail = async () => {
    try {
      const response = await fetch('/api/logs/tail?lines=500');
      const data = await response.json();
      
      setRealtimeContent(data.content);
    } catch (err: any) {
      console.error('Error loading tail:', err);
    }
  };

  const connectToStream = () => {
    if (eventSourceRef.current) return;

    const eventSource = new EventSource('/api/logs/stream');
    
    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('Connected to log stream');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'log') {
          setRealtimeContent(prev => prev + data.content);
        } else if (data.type === 'connected') {
          console.log(data.message);
        }
      } catch (err) {
        console.error('Error parsing stream data:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Stream error:', error);
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;
      
      // Retry connection after 5 seconds if in real-time mode
      if (isRealTime) {
        setTimeout(() => {
          if (isRealTime) {
            connectToStream();
          }
        }, 5000);
      }
    };

    eventSourceRef.current = eventSource;
  };

  const disconnectFromStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  };

  const loadHistoricalLog = async (date: string) => {
    if (!date) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/logs/${date}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load log');
      }
      
      setLogContent(data.content);
      setSelectedDate(date);
    } catch (err: any) {
      setError(err.message || 'Failed to load log');
      console.error('Error loading log:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (!isRealTime) {
      loadHistoricalLog(date);
    }
  };

  const handleToggleRealTime = () => {
    setIsRealTime(!isRealTime);
    if (!isRealTime) {
      // Switching to real-time
      setLogContent('');
      setRealtimeContent('');
    } else {
      // Switching to historical
      if (selectedDate) {
        loadHistoricalLog(selectedDate);
      }
    }
  };

  const handleDownload = () => {
    const content = isRealTime ? realtimeContent : logContent;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server-log-${selectedDate || 'current'}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    if (isRealTime) {
      setRealtimeContent('');
      loadTail();
    } else if (selectedDate) {
      loadHistoricalLog(selectedDate);
    }
  };

  const handleTestLogs = async () => {
    try {
      const response = await fetch('/api/logs/test', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        console.log('Test logs generated:', data.message);
      }
    } catch (err) {
      console.error('Failed to generate test logs:', err);
    }
  };

  const displayContent = isRealTime ? realtimeContent : logContent;
  
  // Helper to colorize log lines
  const getLineColor = (line: string) => {
    const lower = line.toLowerCase();
    if (lower.includes('error') || lower.includes('fail') || lower.includes('exception')) return 'text-red-400';
    if (lower.includes('warn')) return 'text-yellow-400';
    if (lower.includes('info')) return 'text-blue-300';
    if (lower.includes('debug')) return 'text-gray-400';
    if (lower.includes('success') || lower.includes('ready')) return 'text-green-400';
    return 'text-gray-300';
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
      {/* Header Section */}
      <header className="flex-shrink-0 px-6 py-5 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Server className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Server Logs</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Monitor system activities, debug issues, and analyze server performance in real-time or historically.
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
              <FileText className="h-3.5 w-3.5" />
              <span className="font-mono">{logFolderPath || 'Loading path...'}</span>
            </div>
            {isRealTime && (
              <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full transition-colors ${
                isConnected 
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' 
                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
              }`}>
                {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                <span className="font-medium">{isConnected ? 'Live Stream Connected' : 'Stream Disconnected'}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Toolbar Section */}
      <div className="flex-shrink-0 px-6 py-4">
        <div className="flex flex-wrap gap-4 items-center justify-between bg-card border border-border rounded-xl p-2 shadow-sm">
          
          {/* Left Group: View Mode */}
          <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg">
            <button
              onClick={() => !isRealTime && handleToggleRealTime()}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                isRealTime
                  ? 'bg-background shadow-sm text-foreground ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <Terminal className="h-4 w-4" />
              Live Tail
            </button>
            <button
              onClick={() => isRealTime && handleToggleRealTime()}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                !isRealTime
                  ? 'bg-background shadow-sm text-foreground ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <Clock className="h-4 w-4" />
              History
            </button>
          </div>

          {/* Middle Group: Contextual Controls */}
          <div className="flex items-center gap-3 px-2">
            {!isRealTime && (
              <div className="flex items-center gap-2 bg-background border border-input rounded-md px-3 py-1.5 shadow-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="bg-transparent border-none text-sm text-foreground focus:outline-none cursor-pointer min-w-[140px]"
                >
                  <option value="">Select date...</option>
                  {logFiles.map((file) => (
                    <option key={file.date} value={file.date}>
                      {file.date} ({file.filename})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="h-8 w-px bg-border mx-2 hidden sm:block" />

            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                autoScroll 
                  ? 'text-primary bg-primary/10 hover:bg-primary/20' 
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
              title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
            >
              {autoScroll ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span className="hidden sm:inline">Auto-scroll</span>
            </button>
          </div>

          {/* Right Group: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={handleDownload}
              disabled={!displayContent}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
              title="Download Logs"
            >
              <Download className="h-4 w-4" />
            </button>
            
            <button
              onClick={handleTestLogs}
              className="p-2 text-purple-500 hover:text-purple-600 hover:bg-purple-500/10 rounded-md transition-colors"
              title="Generate Test Entry"
            >
              <TestTube className="h-4 w-4" />
            </button>

            <div className="ml-2 text-xs font-mono text-muted-foreground bg-secondary/50 px-2 py-1 rounded border border-border">
              {displayContent ? displayContent.split('\n').filter(l => l.trim()).length : 0} lines
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 text-destructive rounded-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
            {error}
          </div>
        )}
      </div>

      {/* Log Viewer Area */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="h-full bg-[#0c0c0c] border border-border rounded-xl overflow-hidden shadow-inner flex flex-col relative group">
          
          {/* Viewer Header (Mac window style dots just for visual flair or status) */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-white/10">
             <div className="flex gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
               <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
               <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
             </div>
             <span className="text-[10px] text-white/30 font-mono uppercase tracking-wider">
               {isRealTime ? 'Live Output' : `Archive: ${selectedDate}`}
             </span>
          </div>

          {/* Log Content */}
          <div
            ref={logContainerRef}
            className="flex-1 overflow-auto p-4 font-mono text-xs leading-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-white/30 gap-3">
                <RefreshCw className="h-8 w-8 animate-spin opacity-50" />
                <p>Loading log data...</p>
              </div>
            ) : displayContent ? (
              <div className="space-y-0.5">
                {displayContent.split('\n').map((line, i) => (
                  line.trim() && (
                    <div key={i} className={`group/line hover:bg-white/5 px-2 -mx-2 rounded flex items-start gap-3 ${getLineColor(line)}`}>
                      <span className="text-white/10 select-none w-8 text-right shrink-0 text-[10px] pt-0.5 opacity-0 group-hover/line:opacity-100 transition-opacity">
                        {i + 1}
                      </span>
                      <span className="break-all whitespace-pre-wrap">{line}</span>
                    </div>
                  )
                ))}
                {/* Spacer at bottom */}
                <div className="h-8" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white/20 gap-2">
                <Terminal className="h-12 w-12 opacity-20" />
                <p>{isRealTime ? 'Waiting for incoming logs...' : 'Select a date to view historical logs'}</p>
              </div>
            )}
          </div>
          
          {/* Scroll to bottom indicator if needed (optional) */}
          {!autoScroll && (
             <div className="absolute bottom-4 right-4 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow-lg cursor-pointer opacity-90 hover:opacity-100 transition-opacity" onClick={() => setAutoScroll(true)}>
               Resume Auto-scroll
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
