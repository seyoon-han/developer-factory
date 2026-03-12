'use client';

import { useState, useRef, useEffect } from 'react';
import { Terminal, X, Send, Trash2 } from 'lucide-react';

interface WebTerminalProps {
  projectPath: string;
  projectName: string;
}

interface CommandHistory {
  command: string;
  output: string;
  timestamp: Date;
  exitCode: number;
}

export function WebTerminal({ projectPath, projectName }: WebTerminalProps) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [executing, setExecuting] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when history updates
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    setExecuting(true);
    const timestamp = new Date();

    try {
      const res = await fetch('/api/code-editor/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });

      const data = await res.json();
      
      setHistory(prev => [...prev, {
        command: cmd,
        output: data.output || (data.error || 'Command executed'),
        timestamp,
        exitCode: data.exitCode || 0,
      }]);
    } catch (error: any) {
      setHistory(prev => [...prev, {
        command: cmd,
        output: `Error: ${error.message}`,
        timestamp,
        exitCode: 1,
      }]);
    } finally {
      setExecuting(false);
      setCommand('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() && !executing) {
      executeCommand(command.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="flex flex-col h-full border-t border-border bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-[#252526]">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
          <Terminal className="h-4 w-4" />
          <span>Terminal</span>
          <span className="text-xs text-gray-400">({projectName})</span>
        </div>
        <button
          onClick={clearHistory}
          className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-gray-200"
          title="Clear terminal"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Output Area */}
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-sm"
        style={{ backgroundColor: '#1e1e1e' }}
      >
        {/* Welcome message */}
        {history.length === 0 && (
          <div className="text-gray-400 mb-3">
            <div className="text-green-400">┌────────────────────────────────┐</div>
            <div className="text-green-400">│  Terminal - {projectName.padEnd(18)} │</div>
            <div className="text-green-400">└────────────────────────────────┘</div>
            <div className="mt-2">Working directory: {projectPath}</div>
            <div className="mt-1">Type a command and press Enter to execute.</div>
            <div className="mt-1 text-xs">Try: <span className="text-blue-400">git status</span>, <span className="text-blue-400">npm install</span>, <span className="text-blue-400">ls -la</span></div>
            <div className="mt-3"></div>
          </div>
        )}

        {/* Command History */}
        {history.map((item, index) => (
          <div key={index} className="mb-3">
            {/* Command */}
            <div className="flex items-center gap-2 text-blue-400">
              <span className="text-gray-500">$</span>
              <span>{item.command}</span>
            </div>
            
            {/* Output */}
            {item.output && (
              <pre className={`mt-1 whitespace-pre-wrap text-xs leading-relaxed ${
                item.exitCode !== 0 ? 'text-red-400' : 'text-gray-300'
              }`}>
                {item.output}
              </pre>
            )}
            
            {/* Exit code if non-zero */}
            {item.exitCode !== 0 && (
              <div className="text-xs text-red-400 mt-1">
                Exit code: {item.exitCode}
              </div>
            )}
          </div>
        ))}

        {/* Executing indicator */}
        {executing && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="animate-pulse">●</div>
            <span>Executing...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t border-gray-700 bg-[#252526]">
        <div className="flex items-center gap-2 p-2">
          <span className="text-gray-500 font-mono text-sm">$</span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            disabled={executing}
            className="flex-1 bg-transparent text-gray-200 font-mono text-sm outline-none placeholder-gray-600 disabled:opacity-50"
            autoFocus
          />
          <button
            type="submit"
            disabled={!command.trim() || executing}
            className="p-1.5 hover:bg-gray-600 rounded text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Execute (Enter)"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        
        <div className="px-3 pb-2 text-xs text-gray-500">
          Press Enter to execute • Common: git status, npm run build, ls
        </div>
      </form>
    </div>
  );
}

