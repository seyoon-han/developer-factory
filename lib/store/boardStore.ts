import { create } from 'zustand';
import type { Board } from '@/types/board';

interface BoardState {
  boards: Board[];
  activeBoard: Board | null;
  isLoading: boolean;
  error: string | null;
  
  loadBoards: () => Promise<void>;
  setActiveBoard: (board: Board) => void;
  addBoard: (board: Omit<Board, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoard: null,
  isLoading: false,
  error: null,

  loadBoards: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/boards');
      const data = await res.json();
      
      if (data.success) {
        set({ boards: data.boards, isLoading: false });
      } else {
        set({ error: data.error, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  setActiveBoard: (board) => set({ activeBoard: board }),

  addBoard: async (board) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(board),
      });
      const data = await res.json();
      
      if (data.success) {
        set((state) => ({
          boards: [...state.boards, data.board],
          activeBoard: data.board,
          isLoading: false,
        }));
      } else {
        set({ error: data.error, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateBoard: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const currentBoard = get().boards.find((b) => b.id === id);
      if (!currentBoard) {
        set({ error: 'Board not found', isLoading: false });
        return;
      }

      const res = await fetch(`/api/boards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentBoard, ...updates }),
      });
      const data = await res.json();
      
      if (data.success) {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === id ? data.board : b
          ),
          activeBoard: state.activeBoard?.id === id ? data.board : state.activeBoard,
          isLoading: false,
        }));
      } else {
        set({ error: data.error, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteBoard: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/boards/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        set((state) => ({
          boards: state.boards.filter((b) => b.id !== id),
          activeBoard: state.activeBoard?.id === id ? null : state.activeBoard,
          isLoading: false,
        }));
      } else {
        set({ error: data.error, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
