import { NextRequest } from 'next/server';
import { GET, POST } from '../../../app/api/projects/[id]/documents/route';
import { GET as GetDocument, DELETE, PATCH } from '../../../app/api/project-documents/[documentId]/route';

// Mock dependencies
jest.mock('../../../lib/db/postgres', () => ({
  statements: {
    getProjectDocuments: {
      all: jest.fn()
    },
    createProjectDocument: {
      run: jest.fn()
    },
    getProjectDocument: {
      get: jest.fn()
    },
    deleteProjectDocument: {
      run: jest.fn()
    },
    updateProjectDocumentDescription: {
      run: jest.fn()
    },
    updateProjectDocumentCategory: {
      run: jest.fn()
    },
    updateProjectDocumentTags: {
      run: jest.fn()
    }
  }
}));

jest.mock('../../../lib/utils/fileStorage', () => ({
  validateFile: jest.fn(),
  validateUrl: jest.fn(),
  saveProjectFile: jest.fn(),
  ensureProjectDocumentsDirectory: jest.fn(),
  deleteFile: jest.fn()
}));

jest.mock('../../../lib/utils/projectDocumentValidation', () => ({
  validateProjectDocumentUpload: jest.fn(),
  validateProjectDocumentUpdate: jest.fn(),
  sanitizeProjectDocumentMetadata: jest.fn(),
  DEFAULT_PROJECT_DOCUMENT_LIMITS: {
    maxDocumentsPerProject: 10,
    maxFileSizeBytes: 5 * 1024 * 1024,
    maxTotalStoragePerProject: 50 * 1024 * 1024,
    allowedFileTypes: ['.pdf', '.txt', '.csv', '.tsv', '.jpg', '.jpeg', '.png'],
    allowedMimeTypes: ['application/pdf', 'text/plain', 'text/csv', 'text/tab-separated-values', 'image/jpeg', 'image/png']
  }
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn()
}));

import { statements } from '../../../lib/db/postgres';
import { validateFile, validateUrl, saveProjectFile } from '../../../lib/utils/fileStorage';
import { validateProjectDocumentUpload, validateProjectDocumentUpdate, sanitizeProjectDocumentMetadata } from '../../../lib/utils/projectDocumentValidation';
import { readFile } from 'fs/promises';

const mockStatements = statements as jest.Mocked<typeof statements>;
const mockValidateFile = validateFile as jest.MockedFunction<typeof validateFile>;
const mockValidateUrl = validateUrl as jest.MockedFunction<typeof validateUrl>;
const mockSaveProjectFile = saveProjectFile as jest.MockedFunction<typeof saveProjectFile>;
const mockValidateProjectDocumentUpload = validateProjectDocumentUpload as jest.MockedFunction<typeof validateProjectDocumentUpload>;
const mockValidateProjectDocumentUpdate = validateProjectDocumentUpdate as jest.MockedFunction<typeof validateProjectDocumentUpdate>;
const mockSanitizeProjectDocumentMetadata = sanitizeProjectDocumentMetadata as jest.MockedFunction<typeof sanitizeProjectDocumentMetadata>;
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('/api/projects/[id]/documents', () => {
  const mockProjectDocument = {
    id: 1,
    project_id: 'test-project',
    filename: 'test.pdf',
    original_filename: 'test-document.pdf',
    file_path: 'workspace/test-project/factory-doc/test.pdf',
    file_size: 1024,
    mime_type: 'application/pdf',
    url: null,
    uploaded_by: 'user',
    uploaded_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    description: 'Test document',
    category: 'requirements',
    tags: '["important"]',
    is_public: 0,
    version: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/projects/[id]/documents', () => {
    it('should return project documents successfully', async () => {
      mockStatements.getProjectDocuments.all.mockReturnValue([mockProjectDocument]);

      const request = new NextRequest('http://localhost/api/projects/test-project/documents');
      const params = Promise.resolve({ id: 'test-project' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.documents).toHaveLength(1);
      expect(data.documents[0].projectId).toBe('test-project');
      expect(data.documents[0].tags).toEqual(['important']);
    });

    it('should handle database error', async () => {
      mockStatements.getProjectDocuments.all.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost/api/projects/test-project/documents');
      const params = Promise.resolve({ id: 'test-project' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch documents');
    });
  });

  describe('POST /api/projects/[id]/documents', () => {
    it('should upload files successfully', async () => {
      const formData = new FormData();
      formData.append('files', new File(['test content'], 'test.pdf', { type: 'application/pdf' }));
      formData.append('uploadedBy', 'user');
      formData.append('category', 'requirements');

      mockStatements.getProjectDocuments.all.mockReturnValue([]);
      mockValidateProjectDocumentUpload.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });
      mockValidateFile.mockReturnValue({
        isValid: true,
        mimeType: 'application/pdf',
        sanitizedFilename: 'test.pdf'
      });
      mockSaveProjectFile.mockResolvedValue({
        filename: 'uuid-test.pdf',
        originalFilename: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        filePath: 'workspace/test-project/factory-doc/uuid-test.pdf'
      });
      mockStatements.createProjectDocument.run.mockReturnValue({ lastInsertRowid: 1 });
      mockStatements.getProjectDocument.get.mockReturnValue(mockProjectDocument);

      const request = new NextRequest('http://localhost/api/projects/test-project/documents', {
        method: 'POST',
        body: formData
      });
      const params = Promise.resolve({ id: 'test-project' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.documents).toHaveLength(1);
      expect(mockSaveProjectFile).toHaveBeenCalled();
      expect(mockStatements.createProjectDocument.run).toHaveBeenCalled();
    });

    it('should upload URLs successfully', async () => {
      const formData = new FormData();
      formData.append('urls', 'https://example.com/doc.pdf');
      formData.append('uploadedBy', 'user');

      mockStatements.getProjectDocuments.all.mockReturnValue([]);
      mockValidateProjectDocumentUpload.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });
      mockValidateUrl.mockReturnValue({ isValid: true });
      mockStatements.createProjectDocument.run.mockReturnValue({ lastInsertRowid: 1 });
      mockStatements.getProjectDocument.get.mockReturnValue({
        ...mockProjectDocument,
        url: 'https://example.com/doc.pdf',
        file_path: '',
        file_size: 0
      });

      const request = new NextRequest('http://localhost/api/projects/test-project/documents', {
        method: 'POST',
        body: formData
      });
      const params = Promise.resolve({ id: 'test-project' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.documents).toHaveLength(1);
      expect(mockValidateUrl).toHaveBeenCalledWith('https://example.com/doc.pdf');
      expect(mockStatements.createProjectDocument.run).toHaveBeenCalled();
    });

    it('should reject invalid uploads', async () => {
      const formData = new FormData();
      formData.append('files', new File(['test'], 'test.exe', { type: 'application/x-executable' }));

      mockStatements.getProjectDocuments.all.mockReturnValue([]);
      mockValidateProjectDocumentUpload.mockReturnValue({
        isValid: false,
        errors: ['Invalid file type'],
        warnings: []
      });

      const request = new NextRequest('http://localhost/api/projects/test-project/documents', {
        method: 'POST',
        body: formData
      });
      const params = Promise.resolve({ id: 'test-project' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('Invalid file type');
    });
  });
});

describe('/api/project-documents/[documentId]', () => {
  const mockDocument = {
    id: 1,
    project_id: 'test-project',
    filename: 'test.pdf',
    original_filename: 'test-document.pdf',
    file_path: 'workspace/test-project/factory-doc/test.pdf',
    file_size: 1024,
    mime_type: 'application/pdf',
    url: null,
    uploaded_by: 'user',
    uploaded_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    description: 'Test document',
    category: 'requirements',
    tags: '["important"]',
    is_public: 0,
    version: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/project-documents/[documentId]', () => {
    it('should return file for download', async () => {
      mockStatements.getProjectDocument.get.mockReturnValue(mockDocument);
      mockReadFile.mockResolvedValue(Buffer.from('file content'));

      const request = new NextRequest('http://localhost/api/project-documents/1');
      const params = Promise.resolve({ documentId: '1' });

      const response = await GetDocument(request, { params });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('test-document.pdf');
    });

    it('should redirect for URL documents', async () => {
      const urlDocument = {
        ...mockDocument,
        url: 'https://example.com/doc.pdf'
      };

      mockStatements.getProjectDocument.get.mockReturnValue(urlDocument);

      const request = new NextRequest('http://localhost/api/project-documents/1');
      const params = Promise.resolve({ documentId: '1' });

      const response = await GetDocument(request, { params });

      expect(response.status).toBe(307); // Temporary redirect
      expect(response.headers.get('Location')).toBe('https://example.com/doc.pdf');
    });

    it('should return 404 for non-existent document', async () => {
      mockStatements.getProjectDocument.get.mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/project-documents/999');
      const params = Promise.resolve({ documentId: '999' });

      const response = await GetDocument(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Document not found');
    });
  });

  describe('DELETE /api/project-documents/[documentId]', () => {
    it('should delete document successfully', async () => {
      mockStatements.getProjectDocument.get.mockReturnValue(mockDocument);

      const request = new NextRequest('http://localhost/api/project-documents/1', {
        method: 'DELETE'
      });
      const params = Promise.resolve({ documentId: '1' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockStatements.deleteProjectDocument.run).toHaveBeenCalledWith('1');
    });

    it('should return 404 for non-existent document', async () => {
      mockStatements.getProjectDocument.get.mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/project-documents/999', {
        method: 'DELETE'
      });
      const params = Promise.resolve({ documentId: '999' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Document not found');
    });
  });

  describe('PATCH /api/project-documents/[documentId]', () => {
    it('should update document successfully', async () => {
      mockStatements.getProjectDocument.get
        .mockReturnValueOnce(mockDocument)
        .mockReturnValueOnce({
          ...mockDocument,
          description: 'Updated description'
        });

      mockValidateProjectDocumentUpdate.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      mockSanitizeProjectDocumentMetadata.mockReturnValue({
        description: 'Updated description',
        category: 'requirements',
        tags: ['important']
      });

      const request = new NextRequest('http://localhost/api/project-documents/1', {
        method: 'PATCH',
        body: JSON.stringify({
          description: 'Updated description'
        })
      });
      const params = Promise.resolve({ documentId: '1' });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.document.description).toBe('Updated description');
      expect(mockValidateProjectDocumentUpdate).toHaveBeenCalled();
      expect(mockSanitizeProjectDocumentMetadata).toHaveBeenCalled();
    });

    it('should reject invalid updates', async () => {
      mockStatements.getProjectDocument.get.mockReturnValue(mockDocument);
      mockValidateProjectDocumentUpdate.mockReturnValue({
        isValid: false,
        errors: ['Invalid category'],
        warnings: []
      });

      const request = new NextRequest('http://localhost/api/project-documents/1', {
        method: 'PATCH',
        body: JSON.stringify({
          category: 'invalid-category'
        })
      });
      const params = Promise.resolve({ documentId: '1' });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('Invalid category');
    });
  });
});