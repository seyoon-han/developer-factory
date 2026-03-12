'use client';

import { useEffect, useState } from 'react';
import { useBoardStore } from '@/lib/store/boardStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import type { Board } from '@/types/board';
import KanbanBoard from '@/app/board/components/KanbanBoard';

const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'Todo', order: 0 },
  { id: 'verifying', title: 'Enhancing Requirement', order: 1 },
  { id: 'in-progress', title: 'Implement', order: 2 },
  { id: 'writing-tests', title: 'Presubmit Evaluation', order: 3 },
  { id: 'finish', title: 'Publish', order: 4 },
];

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const { boards, activeBoard, setActiveBoard, loadBoards, addBoard } = useBoardStore();
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    async function initializeApp() {
      try {
        console.log('Initializing application...');
        
        // Load boards and settings from server
        await Promise.all([
          loadBoards(),
          loadSettings(),
        ]);

        console.log('Data loaded from server');

        // If no boards exist, create a default one
        const currentBoards = useBoardStore.getState().boards;
        if (currentBoards.length === 0) {
          console.log('No boards found, creating default board...');
          const defaultBoard = {
            id: crypto.randomUUID(),
            name: 'Software Development',
            description: 'Automated software development workflow',
            columns: DEFAULT_COLUMNS,
          };
          await addBoard(defaultBoard);
        } else {
          // Set first board as active if none is active
          if (!activeBoard && currentBoards.length > 0) {
            setActiveBoard(currentBoards[0]);
          }
        }

        console.log('Board initialized, tasks will be loaded by KanbanBoard from API');
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initializeApp();
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    // Initialize queue processor on mount
    fetch('/api/queue/start', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => console.log('Queue processor:', data))
      .catch((err) => console.error('Failed to start queue:', err));

  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading board...</p>
        </div>
      </div>
    );
  }

  if (!activeBoard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No board found</p>
        </div>
      </div>
    );
  }

  return <KanbanBoard board={activeBoard} />;
}
