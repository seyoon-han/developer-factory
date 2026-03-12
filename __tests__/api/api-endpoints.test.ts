import { NextResponse } from 'next/server';

/**
 * Test suite for API endpoints
 *
 * Tests the following endpoints:
 * - GET /api/tasks
 * - POST /api/tasks
 * - POST /api/enhance-prompt
 * - POST /api/queue/start
 * - GET /api/queue/start
 */

// Mock the database
jest.mock('@/lib/db/postgres', () => ({
  statements: {
    getAllTasks: {
      all: jest.fn(),
    },
    getTasksByBoard: {
      all: jest.fn(),
    },
    createTask: {
      run: jest.fn(),
    },
    enqueueTask: {
      run: jest.fn(),
    },
    createPrompt: {
      run: jest.fn(),
    },
    getTask: {
      get: jest.fn(),
    },
    addQuestion: {
      run: jest.fn(),
    },
  },
}));

// Mock the skill executor
jest.mock('@/lib/queue/skillExecutor', () => ({
  skillExecutor: {
    executePromptEnhancer: jest.fn(),
  },
}));

// Mock the queue processor
jest.mock('@/lib/queue/init', () => ({
  initializeQueueProcessor: jest.fn(),
}));

import { statements } from '@/lib/db/postgres';
import { skillExecutor } from '@/lib/queue/skillExecutor';
import { initializeQueueProcessor } from '@/lib/queue/init';

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tasks', () => {
    it('should return all tasks when no boardId is provided', async () => {
      // Mock data
      const mockTasks = [
        {
          id: 1,
          title: 'Test Task 1',
          description: 'Description 1',
          status: 'todo',
          priority: 'high',
          board_id: 'board-1',
          assignee: null,
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        },
        {
          id: 2,
          title: 'Test Task 2',
          description: 'Description 2',
          status: 'in_progress',
          priority: 'medium',
          board_id: 'board-1',
          assignee: 'user-1',
          created_at: '2025-01-02',
          updated_at: '2025-01-02',
        },
      ];

      (statements.getAllTasks.all as jest.Mock).mockReturnValue(mockTasks);

      // Import the route handler
      const { GET } = await import('@/app/api/tasks/route');

      // Create mock request
      const request = new Request('http://localhost:3000/api/tasks');

      // Call the handler
      const response = await GET(request);
      const data = await response.json();

      // Assertions
      expect(statements.getAllTasks.all).toHaveBeenCalled();
      expect(data.tasks).toHaveLength(2);
      expect(data.tasks[0]).toEqual({
        id: 1,
        title: 'Test Task 1',
        description: 'Description 1',
        status: 'todo',
        priority: 'high',
        boardId: 'board-1',
        assignee: null,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        labels: [],
      });
    });

    it('should return tasks filtered by boardId when provided', async () => {
      const mockTasks = [
        {
          id: 1,
          title: 'Board Task',
          description: 'Description',
          status: 'todo',
          priority: 'high',
          board_id: 'board-1',
          assignee: null,
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        },
      ];

      (statements.getTasksByBoard.all as jest.Mock).mockReturnValue(mockTasks);

      const { GET } = await import('@/app/api/tasks/route');
      const request = new Request('http://localhost:3000/api/tasks?boardId=board-1');

      const response = await GET(request);
      const data = await response.json();

      expect(statements.getTasksByBoard.all).toHaveBeenCalledWith('board-1');
      expect(data.tasks).toHaveLength(1);
      expect(data.tasks[0].boardId).toBe('board-1');
    });

    it('should handle errors gracefully', async () => {
      (statements.getAllTasks.all as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const { GET } = await import('@/app/api/tasks/route');
      const request = new Request('http://localhost:3000/api/tasks');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch tasks');
    });

    it('should handle errors when fetching tasks by boardId', async () => {
      (statements.getTasksByBoard.all as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const { GET } = await import('@/app/api/tasks/route');
      const request = new Request('http://localhost:3000/api/tasks?boardId=board-1');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch tasks');
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const mockTask = {
        id: 1,
        title: 'New Task',
        description: 'New Description',
        status: 'todo',
        priority: 'medium',
        board_id: 'board-1',
        assignee: null,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };

      (statements.createTask.run as jest.Mock).mockReturnValue({
        lastInsertRowid: 1,
      });
      (statements.getTask.get as jest.Mock).mockReturnValue(mockTask);

      const { POST } = await import('@/app/api/tasks/route');
      const request = new Request('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Task',
          description: 'New Description',
          boardId: 'board-1',
          priority: 'medium',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(statements.createTask.run).toHaveBeenCalledWith(
        'New Task',
        'New Description',
        'todo',
        'medium',
        'board-1'
      );
      expect(statements.enqueueTask.run).toHaveBeenCalledWith(1);
      expect(statements.createPrompt.run).toHaveBeenCalledWith(1, 'New Description');
      expect(data.task.title).toBe('New Task');
      expect(data.id).toBe(1);
    });

    it('should return 400 if title is missing', async () => {
      const { POST } = await import('@/app/api/tasks/route');
      const request = new Request('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          boardId: 'board-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Title and boardId are required');
    });

    it('should return 400 if boardId is missing', async () => {
      const { POST } = await import('@/app/api/tasks/route');
      const request = new Request('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Task',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Title and boardId are required');
    });

    it('should use default priority if not provided', async () => {
      const mockTask = {
        id: 1,
        title: 'New Task',
        description: '',
        status: 'todo',
        priority: 'medium',
        board_id: 'board-1',
        assignee: null,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };

      (statements.createTask.run as jest.Mock).mockReturnValue({
        lastInsertRowid: 1,
      });
      (statements.getTask.get as jest.Mock).mockReturnValue(mockTask);

      const { POST } = await import('@/app/api/tasks/route');
      const request = new Request('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Task',
          boardId: 'board-1',
        }),
      });

      await POST(request);

      expect(statements.createTask.run).toHaveBeenCalledWith(
        'New Task',
        '',
        'todo',
        'medium',
        'board-1'
      );
      // Verify that when description is missing, title is used for prompt
      expect(statements.createPrompt.run).toHaveBeenCalledWith(1, 'New Task');
    });

    it('should skip queue when skipQueue is true', async () => {
      const mockTask = {
        id: 1,
        title: 'New Task',
        description: 'New Description',
        status: 'todo',
        priority: 'medium',
        board_id: 'board-1',
        assignee: null,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };

      (statements.createTask.run as jest.Mock).mockReturnValue({
        lastInsertRowid: 1,
      });
      (statements.getTask.get as jest.Mock).mockReturnValue(mockTask);

      const { POST } = await import('@/app/api/tasks/route');
      const request = new Request('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Task',
          description: 'New Description',
          boardId: 'board-1',
          priority: 'medium',
          skipQueue: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(statements.createTask.run).toHaveBeenCalled();
      // Verify task is NOT enqueued when skipQueue is true
      expect(statements.enqueueTask.run).not.toHaveBeenCalled();
      expect(statements.createPrompt.run).toHaveBeenCalledWith(1, 'New Description');
      expect(data.task.title).toBe('New Task');
      expect(data.id).toBe(1);
    });

    it('should handle database errors during task creation', async () => {
      (statements.createTask.run as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const { POST } = await import('@/app/api/tasks/route');
      const request = new Request('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Task',
          boardId: 'board-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create task');
      // Ensure downstream statements are not called after failure
      expect(statements.enqueueTask.run).not.toHaveBeenCalled();
      expect(statements.createPrompt.run).not.toHaveBeenCalled();
      expect(statements.getTask.get).not.toHaveBeenCalled();
    });

    it('should handle database errors when retrieving created task', async () => {
      (statements.createTask.run as jest.Mock).mockReturnValue({
        lastInsertRowid: 1,
      });
      (statements.getTask.get as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const { POST } = await import('@/app/api/tasks/route');
      const request = new Request('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Task',
          boardId: 'board-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create task');
    });
  });

  describe('POST /api/enhance-prompt', () => {
    it('should enhance prompt and generate questions successfully', async () => {
      const mockSkillResult = {
        success: true,
        questions: [
          'What is the expected behavior?',
          'What priority should this have?',
          'Who should be assigned?',
        ],
        metadata: {
          executionTime: 1500,
        },
      };

      (skillExecutor.executePromptEnhancer as jest.Mock).mockResolvedValue(mockSkillResult);

      const { POST } = await import('@/app/api/enhance-prompt/route');
      const request = new Request('http://localhost:3000/api/enhance-prompt', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 1,
          title: 'Test Task',
          description: 'Test Description',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(skillExecutor.executePromptEnhancer).toHaveBeenCalledWith(
        'Test Task',
        'Test Description',
        { timeout: 90000, retries: 2 }
      );
      expect(statements.addQuestion.run).toHaveBeenCalledTimes(3);
      expect(data.success).toBe(true);
      expect(data.questionsGenerated).toBe(3);
      expect(data.executionTime).toBe(1500);
    });

    it('should handle skill execution failure', async () => {
      const mockSkillResult = {
        success: false,
        error: 'Skill execution failed',
      };

      (skillExecutor.executePromptEnhancer as jest.Mock).mockResolvedValue(mockSkillResult);

      const { POST } = await import('@/app/api/enhance-prompt/route');
      const request = new Request('http://localhost:3000/api/enhance-prompt', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 1,
          title: 'Test Task',
          description: 'Test Description',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Skill execution failed');
      // Verify no questions were added to the database
      expect(statements.addQuestion.run).not.toHaveBeenCalled();
    });

    it('should handle exceptions during enhancement', async () => {
      (skillExecutor.executePromptEnhancer as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { POST } = await import('@/app/api/enhance-prompt/route');
      const request = new Request('http://localhost:3000/api/enhance-prompt', {
        method: 'POST',
        body: JSON.stringify({
          taskId: 1,
          title: 'Test Task',
          description: 'Test Description',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Network error');
      // Verify no questions were added to the database
      expect(statements.addQuestion.run).not.toHaveBeenCalled();
    });

    it('should handle malformed request body', async () => {
      const { POST } = await import('@/app/api/enhance-prompt/route');
      const request = new Request('http://localhost:3000/api/enhance-prompt', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const mockSkillResult = {
        success: true,
        questions: ['Question 1'],
        metadata: { executionTime: 1000 },
      };

      (skillExecutor.executePromptEnhancer as jest.Mock).mockResolvedValue(mockSkillResult);

      const { POST } = await import('@/app/api/enhance-prompt/route');
      const request = new Request('http://localhost:3000/api/enhance-prompt', {
        method: 'POST',
        body: JSON.stringify({
          // Missing taskId, title
          description: 'Test Description',
        }),
      });

      const response = await POST(request);

      // Should still process even with missing fields (route doesn't validate)
      // This test documents current behavior
      expect(skillExecutor.executePromptEnhancer).toHaveBeenCalled();
    });
  });

  describe('POST /api/queue/start', () => {
    it('should start the queue processor successfully', async () => {
      (initializeQueueProcessor as jest.Mock).mockReturnValue(undefined);

      const { POST } = await import('@/app/api/queue/start/route');
      const response = await POST();
      const data = await response.json();

      expect(initializeQueueProcessor).toHaveBeenCalled();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Queue processor started');
    });

    it('should handle errors when starting queue', async () => {
      (initializeQueueProcessor as jest.Mock).mockImplementation(() => {
        throw new Error('Queue initialization failed');
      });

      const { POST } = await import('@/app/api/queue/start/route');
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to start queue');
    });
  });

  describe('GET /api/queue/start', () => {
    it('should return queue status', async () => {
      const { GET } = await import('@/app/api/queue/start/route');
      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('Queue processor is running');
    });
  });
});
