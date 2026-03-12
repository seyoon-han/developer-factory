import { act, renderHook } from '@testing-library/react';
import { useProjectDocumentStore } from '../../../lib/store/projectDocumentStore';
import { ProjectDocument } from '../../../types/project';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('useProjectDocumentStore', () => {
  const mockDocument: ProjectDocument = {
    id: 1,
    projectId: 'test-project',
    filename: 'test.pdf',
    originalFilename: 'test-document.pdf',
    filePath: 'data/documents/project-test/test.pdf',
    fileSize: 1024 * 1024, // 1MB
    mimeType: 'application/pdf',
    uploadedBy: 'user',
    uploadedAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    description: 'Test document',
    category: 'requirements',
    tags: ['important', 'draft'],
    isPublic: false,
    version: 1
  };

  const mockDocuments: ProjectDocument[] = [
    mockDocument,
    {
      ...mockDocument,
      id: 2,
      originalFilename: 'another-doc.txt',
      category: 'design',
      tags: ['ui', 'mockup']
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();

    // Reset store state before each test
    const { result } = renderHook(() => useProjectDocumentStore());
    act(() => {
      result.current.setDocuments([]);
      result.current.setCurrentProject('main');
      result.current.setLoading(false);
      result.current.setError(null);
      result.current.clearFilters();
    });
  });

  describe('basic state management', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      expect(result.current.documents).toEqual([]);
      expect(result.current.currentProjectId).toBe('main');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.filters).toEqual({});
    });

    it('should set documents', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setDocuments(mockDocuments);
      });

      expect(result.current.documents).toEqual(mockDocuments);
    });

    it('should add a document', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setDocuments([mockDocument]);
        result.current.addDocument({
          ...mockDocument,
          id: 3,
          originalFilename: 'new-doc.pdf'
        });
      });

      expect(result.current.documents).toHaveLength(2);
      expect(result.current.documents[0].id).toBe(3); // New document added at beginning
      expect(result.current.documents[1].id).toBe(1); // Original document
    });

    it('should update a document', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setDocuments(mockDocuments);
        result.current.updateDocument({
          ...mockDocument,
          description: 'Updated description'
        });
      });

      expect(result.current.documents[0].description).toBe('Updated description');
    });

    it('should remove a document', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setDocuments(mockDocuments);
        result.current.removeDocument(1);
      });

      expect(result.current.documents).toHaveLength(1);
      expect(result.current.documents[0].id).toBe(2);
    });

    it('should set current project', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setCurrentProject('new-project');
      });

      expect(result.current.currentProjectId).toBe('new-project');
    });

    it('should manage loading state', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should manage error state', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('filters', () => {
    it('should set and clear filters', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setFilters({
          search: 'test',
          category: 'requirements'
        });
      });

      expect(result.current.filters).toEqual({
        search: 'test',
        category: 'requirements'
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({});
    });

    it('should merge filters when setting', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setFilters({ search: 'test' });
        result.current.setFilters({ category: 'requirements' });
      });

      expect(result.current.filters).toEqual({
        search: 'test',
        category: 'requirements'
      });
    });
  });

  describe('computed functions', () => {
    it('should filter documents by search term', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setDocuments(mockDocuments);
        result.current.setFilters({ search: 'another' });
      });

      const filtered = result.current.getFilteredDocuments();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].originalFilename).toBe('another-doc.txt');
    });

    it('should filter documents by category', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setDocuments(mockDocuments);
        result.current.setFilters({ category: 'design' });
      });

      const filtered = result.current.getFilteredDocuments();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe('design');
    });

    it('should filter documents by tags', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setDocuments(mockDocuments);
        result.current.setFilters({ tags: ['ui'] });
      });

      const filtered = result.current.getFilteredDocuments();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].tags).toContain('ui');
    });

    it('should get document count', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setDocuments(mockDocuments);
      });

      expect(result.current.getDocumentCount()).toBe(2);
    });

    it('should get category count', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setDocuments(mockDocuments);
      });

      expect(result.current.getCategoryCount('requirements')).toBe(1);
      expect(result.current.getCategoryCount('design')).toBe(1);
      expect(result.current.getCategoryCount('all')).toBe(2);
    });

    it('should get documents by category', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setDocuments(mockDocuments);
      });

      const requirementsDocs = result.current.getDocumentsByCategory('requirements');
      expect(requirementsDocs).toHaveLength(1);
      expect(requirementsDocs[0].category).toBe('requirements');
    });
  });

  describe('upload progress', () => {
    it('should manage upload progress', () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setUploadProgress('file1', 50);
        result.current.setUploadProgress('file2', 75);
      });

      expect(result.current.uploadProgress['file1']).toBe(50);
      expect(result.current.uploadProgress['file2']).toBe(75);

      act(() => {
        result.current.clearUploadProgress('file1');
      });

      expect(result.current.uploadProgress['file1']).toBeUndefined();
      expect(result.current.uploadProgress['file2']).toBe(75);
    });
  });

  describe('API actions', () => {
    it('should load documents successfully', async () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: mockDocuments })
      } as Response);

      await act(async () => {
        await result.current.loadDocuments('test-project');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/projects/test-project/documents');
      expect(result.current.documents).toEqual(mockDocuments);
      expect(result.current.currentProjectId).toBe('test-project');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle load documents error', async () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      await act(async () => {
        await result.current.loadDocuments('test-project');
      });

      expect(result.current.error).toBe('Failed to load documents');
      expect(result.current.isLoading).toBe(false);
    });

    it('should upload documents successfully', async () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      // Mock successful upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: [mockDocument] })
      } as Response);

      // Mock successful reload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: [mockDocument] })
      } as Response);

      const mockFiles = [new File(['test'], 'test.pdf', { type: 'application/pdf' })] as File[];

      await act(async () => {
        await result.current.uploadDocuments(mockFiles, [], { category: 'requirements' });
      });

      expect(mockFetch).toHaveBeenCalledTimes(2); // Upload + reload
      expect(result.current.documents).toEqual([mockDocument]);
      expect(result.current.error).toBeNull();
    });

    it('should handle upload error', async () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Upload failed' })
      } as Response);

      const mockFiles = [new File(['test'], 'test.pdf', { type: 'application/pdf' })] as File[];

      await act(async () => {
        try {
          await result.current.uploadDocuments(mockFiles, []);
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.error).toBe('Upload failed');
    });

    it('should delete document successfully', async () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setDocuments(mockDocuments);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true
      } as Response);

      await act(async () => {
        await result.current.deleteDocument(1);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/project-documents/1', {
        method: 'DELETE'
      });
      expect(result.current.documents).toHaveLength(1);
      expect(result.current.documents[0].id).toBe(2);
    });

    it('should update document details successfully', async () => {
      const { result } = renderHook(() => useProjectDocumentStore());

      act(() => {
        result.current.setDocuments([mockDocument]);
      });

      const updatedDocument = {
        ...mockDocument,
        description: 'Updated description'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document: updatedDocument })
      } as Response);

      await act(async () => {
        await result.current.updateDocumentDetails(1, {
          description: 'Updated description'
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/project-documents/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Updated description' })
      });
      expect(result.current.documents[0].description).toBe('Updated description');
    });
  });
});