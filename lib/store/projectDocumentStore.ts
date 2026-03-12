import { create } from 'zustand';
import { ProjectDocument, ProjectDocumentFilters } from '@/types/project';

interface ProjectDocumentStore {
  // State
  documents: ProjectDocument[];
  currentProjectId: string;
  isLoading: boolean;
  error: string | null;
  filters: ProjectDocumentFilters;
  uploadProgress: { [key: string]: number }; // Track upload progress by file ID

  // Actions - Document Management
  setDocuments: (documents: ProjectDocument[]) => void;
  addDocument: (document: ProjectDocument) => void;
  updateDocument: (document: ProjectDocument) => void;
  removeDocument: (documentId: number) => void;

  // Actions - Project Management
  setCurrentProject: (projectId: string) => void;

  // Actions - Loading State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - Filters
  setFilters: (filters: Partial<ProjectDocumentFilters>) => void;
  clearFilters: () => void;

  // Actions - Upload Progress
  setUploadProgress: (fileId: string, progress: number) => void;
  clearUploadProgress: (fileId: string) => void;

  // Computed
  getFilteredDocuments: () => ProjectDocument[];
  getDocumentCount: () => number;
  getCategoryCount: (category: string) => number;
  getDocumentsByCategory: (category: string) => ProjectDocument[];

  // API Actions
  loadDocuments: (projectId?: string) => Promise<void>;
  uploadDocuments: (files: File[], urls: string[], options?: { category?: string; tags?: string[] }) => Promise<void>;
  deleteDocument: (documentId: number) => Promise<void>;
  updateDocumentDetails: (documentId: number, updates: { description?: string; category?: string; tags?: string[] }) => Promise<void>;
}

export const useProjectDocumentStore = create<ProjectDocumentStore>((set, get) => ({
  // Initial State
  documents: [],
  currentProjectId: 'main',
  isLoading: false,
  error: null,
  filters: {},
  uploadProgress: {},

  // Document Management Actions
  setDocuments: (documents) => set({ documents }),

  addDocument: (document) => set((state) => ({
    documents: [document, ...state.documents]
  })),

  updateDocument: (updatedDocument) => set((state) => ({
    documents: state.documents.map(doc =>
      doc.id === updatedDocument.id ? updatedDocument : doc
    )
  })),

  removeDocument: (documentId) => set((state) => ({
    documents: state.documents.filter(doc => doc.id !== documentId)
  })),

  // Project Management Actions
  setCurrentProject: (projectId) => set({ currentProjectId: projectId }),

  // Loading State Actions
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Filter Actions
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),

  clearFilters: () => set({ filters: {} }),

  // Upload Progress Actions
  setUploadProgress: (fileId, progress) => set((state) => ({
    uploadProgress: { ...state.uploadProgress, [fileId]: progress }
  })),

  clearUploadProgress: (fileId) => set((state) => {
    const { [fileId]: _, ...rest } = state.uploadProgress;
    return { uploadProgress: rest };
  }),

  // Computed Functions
  getFilteredDocuments: () => {
    const { documents, filters } = get();

    return documents.filter(doc => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          doc.originalFilename.toLowerCase().includes(searchLower) ||
          (doc.description || '').toLowerCase().includes(searchLower) ||
          doc.tags.some(tag => tag.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category && filters.category !== 'all') {
        if (doc.category !== filters.category) return false;
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(filterTag =>
          doc.tags.some(docTag => docTag.toLowerCase().includes(filterTag.toLowerCase()))
        );
        if (!hasMatchingTag) return false;
      }

      // Uploaded by filter
      if (filters.uploadedBy) {
        if (doc.uploadedBy !== filters.uploadedBy) return false;
      }

      return true;
    });
  },

  getDocumentCount: () => {
    return get().documents.length;
  },

  getCategoryCount: (category) => {
    const { documents } = get();
    if (category === 'all') return documents.length;
    return documents.filter(doc => doc.category === category).length;
  },

  getDocumentsByCategory: (category) => {
    const { documents } = get();
    return documents.filter(doc => doc.category === category);
  },

  // API Actions
  loadDocuments: async (projectId) => {
    const { currentProjectId, setLoading, setError, setDocuments } = get();
    const targetProjectId = projectId || currentProjectId;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${targetProjectId}/documents`);

      if (!response.ok) {
        throw new Error('Failed to load documents');
      }

      const { documents } = await response.json();
      setDocuments(documents);

      if (projectId) {
        set({ currentProjectId: targetProjectId });
      }

    } catch (error) {
      console.error('Error loading documents:', error);
      setError(error instanceof Error ? error.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  },

  uploadDocuments: async (files, urls, options = {}) => {
    const { currentProjectId, setLoading, setError, loadDocuments } = get();

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();

      // Add files
      files.forEach(file => formData.append('files', file));

      // Add URLs
      urls.forEach(url => formData.append('urls', url));

      // Add metadata
      formData.append('uploadedBy', 'user'); // TODO: Get from auth context
      formData.append('category', options.category || 'other');
      formData.append('tags', JSON.stringify(options.tags || []));

      const response = await fetch(`/api/projects/${currentProjectId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      // Reload documents to get updated list
      await loadDocuments();

    } catch (error) {
      console.error('Error uploading documents:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload documents');
      throw error;
    } finally {
      setLoading(false);
    }
  },

  deleteDocument: async (documentId) => {
    const { setError, removeDocument } = get();

    try {
      setError(null);

      const response = await fetch(`/api/project-documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 404) {
        // Remove from local state
        removeDocument(documentId);
      } else {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete document');
      }

    } catch (error) {
      console.error('Error deleting document:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete document');
      throw error;
    }
  },

  updateDocumentDetails: async (documentId, updates) => {
    const { setError, updateDocument } = get();

    try {
      setError(null);

      const response = await fetch(`/api/project-documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const { document: updatedDoc } = await response.json();
        updateDocument(updatedDoc);
      } else if (response.status === 404) {
        throw new Error('Document not found. It may have been deleted.');
      } else {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update document');
      }

    } catch (error) {
      console.error('Error updating document:', error);
      setError(error instanceof Error ? error.message : 'Failed to update document');
      throw error;
    }
  },
}));