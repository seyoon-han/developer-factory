'use client';

import { useState, useEffect, useCallback } from 'react';
import TddKanbanBoard from './components/TddKanbanBoard';
import TddTaskCreateModal from '@/components/tdd/TddTaskCreateModal';
import { DEFAULT_TDD_BOARD } from '@/types/tdd-task';
import { FlaskConical, RefreshCw, Play, Square, Plus } from 'lucide-react';

export default function TddBoardPage() {
  const [processorStatus, setProcessorStatus] = useState<{ running: boolean; isProcessing: boolean } | null>(null);
  const [skillsStatus, setSkillsStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const [procRes, skillsRes] = await Promise.all([
        fetch('/api/tdd/queue/status'),
        fetch('/api/tdd/skills/status')
      ]);

      if (procRes.ok) {
        const data = await procRes.json();
        setProcessorStatus(data.status);
      }

      if (skillsRes.ok) {
        const data = await skillsRes.json();
        setSkillsStatus(data.status);
      }
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartProcessor = async () => {
    try {
      const res = await fetch('/api/tdd/queue/start', { method: 'POST' });
      if (res.ok) {
        await loadStatus();
      }
    } catch (error) {
      console.error('Error starting processor:', error);
    }
  };

  const handleStopProcessor = async () => {
    try {
      const res = await fetch('/api/tdd/queue/stop', { method: 'POST' });
      if (res.ok) {
        await loadStatus();
      }
    } catch (error) {
      console.error('Error stopping processor:', error);
    }
  };

  const handleSyncSkills = async () => {
    try {
      const res = await fetch('/api/tdd/skills/sync', { method: 'POST' });
      if (res.ok) {
        await loadStatus();
      }
    } catch (error) {
      console.error('Error syncing skills:', error);
    }
  };

  const handleTaskCreated = useCallback((task: any) => {
    console.log('TDD Task created:', task);
    // Trigger board refresh
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-red-500 via-green-500 to-blue-500 rounded-lg">
            <FlaskConical className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              TDD Development Board
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Test-Driven Development with strict RED-GREEN-REFACTOR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Create Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 hover:from-red-600 hover:via-green-600 hover:to-blue-600 text-white rounded-lg transition-all font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add TDD Task
          </button>

          {/* Skills Status */}
          <div className="flex items-center gap-2 text-sm border-l border-gray-200 dark:border-gray-600 pl-4">
            <span className="text-gray-500 dark:text-gray-400">Skills:</span>
            {skillsStatus ? (
              <span className={skillsStatus.skillsInDatabase > 0 ? 'text-green-600' : 'text-yellow-600'}>
                {skillsStatus.skillsInDatabase} loaded ({skillsStatus.coreSkillsInDatabase} core)
              </span>
            ) : (
              <span className="text-gray-400">Loading...</span>
            )}
            <button
              onClick={handleSyncSkills}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Sync Skills"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Processor Status */}
          <div className="flex items-center gap-2 text-sm border-l border-gray-200 dark:border-gray-600 pl-4">
            <span className="text-gray-500 dark:text-gray-400">Processor:</span>
            {processorStatus?.running ? (
              <>
                <span className="flex items-center gap-1 text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Running
                </span>
                <button
                  onClick={handleStopProcessor}
                  className="p-1 text-red-400 hover:text-red-600"
                  title="Stop Processor"
                >
                  <Square className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className="text-gray-400">Stopped</span>
                <button
                  onClick={handleStartProcessor}
                  className="p-1 text-green-400 hover:text-green-600"
                  title="Start Processor"
                >
                  <Play className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-6 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs">
        <span className="text-gray-500 dark:text-gray-400">Phases:</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500" />
          <span className="text-gray-600 dark:text-gray-300">RED (Write Failing Tests)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500" />
          <span className="text-gray-600 dark:text-gray-300">GREEN (Make Tests Pass)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-500" />
          <span className="text-gray-600 dark:text-gray-300">REFACTOR (Clean Code)</span>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden p-6">
        <TddKanbanBoard board={DEFAULT_TDD_BOARD as any} key={refreshKey} />
      </div>

      {/* Create Task Modal */}
      <TddTaskCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}
