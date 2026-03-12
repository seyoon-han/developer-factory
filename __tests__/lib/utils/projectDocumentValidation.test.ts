import {
  validateProjectDocumentUpload,
  validateProjectDocumentUpdate,
  sanitizeProjectDocumentMetadata,
  getProjectStorageStats,
  DEFAULT_PROJECT_DOCUMENT_LIMITS
} from '../../../lib/utils/projectDocumentValidation';
import { ProjectDocument } from '../../../types/project';

// Mock File constructor for tests
global.File = class MockFile {
  name: string;
  size: number;
  type: string;

  constructor(chunks: any[], filename: string, options: { type?: string } = {}) {
    this.name = filename;
    this.size = chunks.reduce((acc, chunk) => acc + (chunk.length || 0), 0);
    this.type = options.type || 'text/plain';
  }
} as any;

describe('validateProjectDocumentUpload', () => {
  const mockExistingDocuments: ProjectDocument[] = [
    {
      id: 1,
      projectId: 'test-project',
      filename: 'test1.pdf',
      originalFilename: 'existing-doc.pdf',
      filePath: 'data/documents/project-test/test1.pdf',
      fileSize: 1024 * 1024, // 1MB
      mimeType: 'application/pdf',
      uploadedBy: 'user',
      uploadedAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      description: 'Test document',
      category: 'other',
      tags: [],
      isPublic: false,
      version: 1
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate valid file uploads', () => {
    const files = [
      new File(['test content'], 'test.pdf', { type: 'application/pdf' }),
      new File(['test content'], 'test.txt', { type: 'text/plain' })
    ];

    const result = validateProjectDocumentUpload(files, [], mockExistingDocuments);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject files exceeding size limit', () => {
    const largeFile = new File(
      [new Array(6 * 1024 * 1024).fill('x').join('')], // 6MB
      'large.pdf',
      { type: 'application/pdf' }
    );

    const result = validateProjectDocumentUpload([largeFile], [], mockExistingDocuments);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      expect.stringContaining('exceeds limit of 5MB')
    );
  });

  it('should reject unsupported file types', () => {
    const files = [
      new File(['test'], 'test.exe', { type: 'application/x-executable' }),
      new File(['test'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    ];

    const result = validateProjectDocumentUpload(files, [], mockExistingDocuments);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      expect.stringContaining('File type ".exe" not allowed')
    );
    expect(result.errors).toContain(
      expect.stringContaining('File type ".docx" not allowed')
    );
  });

  it('should reject empty files', () => {
    const emptyFile = new File([], 'empty.txt', { type: 'text/plain' });

    const result = validateProjectDocumentUpload([emptyFile], [], mockExistingDocuments);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('File "empty.txt" is empty');
  });

  it('should enforce document count limits', () => {
    const existingDocs = new Array(10).fill(null).map((_, i) => ({
      ...mockExistingDocuments[0],
      id: i + 1,
      filename: `doc${i + 1}.pdf`,
      originalFilename: `doc${i + 1}.pdf`
    }));

    const newFile = new File(['test'], 'new.pdf', { type: 'application/pdf' });

    const result = validateProjectDocumentUpload([newFile], [], existingDocs);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      expect.stringContaining('Maximum 10 documents allowed per project')
    );
  });

  it('should validate URLs correctly', () => {
    const validUrls = ['https://example.com/doc.pdf', 'http://test.com/file.txt'];
    const invalidUrls = ['not-a-url', 'ftp://example.com/file.txt'];

    const validResult = validateProjectDocumentUpload([], validUrls, mockExistingDocuments);
    expect(validResult.isValid).toBe(true);

    const invalidResult = validateProjectDocumentUpload([], invalidUrls, mockExistingDocuments);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors).toContain(
      expect.stringContaining('Invalid URL format')
    );
    expect(invalidResult.errors).toContain(
      expect.stringContaining('must use HTTP or HTTPS protocol')
    );
  });

  it('should warn about duplicate filenames', () => {
    const duplicateFile = new File(['test'], 'existing-doc.pdf', { type: 'application/pdf' });

    const result = validateProjectDocumentUpload([duplicateFile], [], mockExistingDocuments);

    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain(
      'File "existing-doc.pdf" has the same name as an existing document'
    );
  });

  it('should warn about large files', () => {
    const largeFile = new File(
      [new Array(3 * 1024 * 1024).fill('x').join('')], // 3MB
      'large.pdf',
      { type: 'application/pdf' }
    );

    const result = validateProjectDocumentUpload([largeFile], [], mockExistingDocuments);

    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain(
      expect.stringContaining('Large file "large.pdf" (3MB) may slow down uploads')
    );
  });

  it('should check total storage limits', () => {
    const existingLargeDocs = new Array(5).fill(null).map((_, i) => ({
      ...mockExistingDocuments[0],
      id: i + 1,
      fileSize: 10 * 1024 * 1024 // 10MB each = 50MB total (at limit)
    }));

    const newFile = new File(['x'], 'new.pdf', { type: 'application/pdf' });

    const result = validateProjectDocumentUpload([newFile], [], existingLargeDocs);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      expect.stringContaining('Storage limit exceeded')
    );
  });
});

describe('validateProjectDocumentUpdate', () => {
  it('should validate valid updates', () => {
    const updates = {
      description: 'Updated description',
      category: 'requirements',
      tags: ['important', 'draft']
    };

    const result = validateProjectDocumentUpdate(updates);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject overly long descriptions', () => {
    const updates = {
      description: 'x'.repeat(1001)
    };

    const result = validateProjectDocumentUpdate(updates);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Description must be less than 1000 characters');
  });

  it('should reject invalid categories', () => {
    const updates = {
      category: 'invalid-category'
    };

    const result = validateProjectDocumentUpdate(updates);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      expect.stringContaining('Invalid category')
    );
  });

  it('should reject too many tags', () => {
    const updates = {
      tags: new Array(11).fill(0).map((_, i) => `tag${i}`)
    };

    const result = validateProjectDocumentUpdate(updates);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Maximum 10 tags allowed per document');
  });

  it('should reject invalid tag formats', () => {
    const updates = {
      tags: ['valid-tag', 'invalid@tag!', 'x'.repeat(51)]
    };

    const result = validateProjectDocumentUpdate(updates);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      expect.stringContaining('contains invalid characters')
    );
    expect(result.errors).toContain(
      expect.stringContaining('is too long')
    );
  });

  it('should warn about duplicate tags', () => {
    const updates = {
      tags: ['tag1', 'Tag1', 'tag2', 'TAG1']
    };

    const result = validateProjectDocumentUpdate(updates);

    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain('Duplicate tags will be removed');
  });
});

describe('sanitizeProjectDocumentMetadata', () => {
  it('should sanitize and normalize metadata', () => {
    const input = {
      description: '  Trimmed description  ',
      category: '  REQUIREMENTS  ',
      tags: ['  tag1  ', '', 'tag2', 'tag1', '  tag3  ']
    };

    const result = sanitizeProjectDocumentMetadata(input);

    expect(result.description).toBe('Trimmed description');
    expect(result.category).toBe('requirements');
    expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('should handle undefined values', () => {
    const input = {};

    const result = sanitizeProjectDocumentMetadata(input);

    expect(result.description).toBeUndefined();
    expect(result.category).toBe('other');
    expect(result.tags).toEqual([]);
  });

  it('should remove empty tags', () => {
    const input = {
      tags: ['valid', '', '   ', 'also-valid']
    };

    const result = sanitizeProjectDocumentMetadata(input);

    expect(result.tags).toEqual(['valid', 'also-valid']);
  });
});

describe('getProjectStorageStats', () => {
  const mockDocuments: ProjectDocument[] = [
    {
      id: 1,
      projectId: 'test',
      filename: 'doc1.pdf',
      originalFilename: 'doc1.pdf',
      filePath: 'path1',
      fileSize: 5 * 1024 * 1024, // 5MB
      mimeType: 'application/pdf',
      uploadedBy: 'user',
      uploadedAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      description: null,
      category: 'other',
      tags: [],
      isPublic: false,
      version: 1
    },
    {
      id: 2,
      projectId: 'test',
      filename: 'url1.url',
      originalFilename: 'https://example.com/doc',
      filePath: '',
      fileSize: 0, // URLs don't have size
      mimeType: 'text/uri-list',
      url: 'https://example.com/doc',
      uploadedBy: 'user',
      uploadedAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      description: null,
      category: 'other',
      tags: [],
      isPublic: false,
      version: 1
    }
  ];

  it('should calculate storage statistics correctly', () => {
    const stats = getProjectStorageStats(mockDocuments);

    expect(stats.totalDocuments).toBe(2);
    expect(stats.totalFiles).toBe(1);
    expect(stats.totalUrls).toBe(1);
    expect(stats.totalStorage).toBe(5 * 1024 * 1024);
    expect(stats.storageUsedPercent).toBe(10); // 5MB / 50MB limit
    expect(stats.documentsUsedPercent).toBe(20); // 2 / 10 limit
    expect(stats.remainingDocuments).toBe(8);
    expect(stats.remainingStorage).toBe(45 * 1024 * 1024);
    expect(stats.isNearStorageLimit).toBe(false);
    expect(stats.isNearDocumentLimit).toBe(false);
  });

  it('should detect near-limit conditions', () => {
    const nearLimitDocs = new Array(9).fill(null).map((_, i) => ({
      ...mockDocuments[0],
      id: i + 1,
      fileSize: 5 * 1024 * 1024 // 45MB total
    }));

    const stats = getProjectStorageStats(nearLimitDocs);

    expect(stats.isNearStorageLimit).toBe(true); // 45MB > 80% of 50MB
    expect(stats.isNearDocumentLimit).toBe(true); // 9 > 80% of 10
  });
});