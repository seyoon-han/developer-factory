import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { v4 as uuidv4 } from 'uuid';
import {
  validateFile,
  validateUrl,
  saveProjectFile,
  ensureProjectDocumentsDirectory,
} from '@/lib/utils/fileStorage';
import {
  validateProjectDocumentUpload,
  sanitizeProjectDocumentMetadata,
  DEFAULT_PROJECT_DOCUMENT_LIMITS
} from '@/lib/utils/projectDocumentValidation';

// Helper to transform SQLite snake_case to camelCase for project documents
function transformProjectDocument(doc: any) {
  return {
    id: doc.id,
    projectId: doc.project_id,
    filename: doc.filename,
    originalFilename: doc.original_filename,
    filePath: doc.file_path,
    fileSize: doc.file_size,
    mimeType: doc.mime_type,
    url: doc.url,
    uploadedBy: doc.uploaded_by,
    uploadedAt: doc.uploaded_at,
    updatedAt: doc.updated_at,
    description: doc.description,
    category: doc.category,
    tags: doc.tags ? JSON.parse(doc.tags) : [],
    isPublic: doc.is_public,
    version: doc.version,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rawDocuments = await statements.getProjectDocuments.all(id);
    const documents = (rawDocuments as any[]).map(transformProjectDocument);

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching project documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();

    const files = formData.getAll('files') as File[];
    const urls = formData.getAll('urls') as string[];
    const uploadedBy = formData.get('uploadedBy') as string || 'anonymous';
    const category = formData.get('category') as string || 'other';
    const tags = formData.get('tags') as string || '[]';

    const results = [];

    // Get existing documents and validate upload
    const existingDocuments = await statements.getProjectDocuments.all(id) as any[];

    // Validate the upload using enhanced validation
    // Cast to any[] since validateProjectDocumentUpload has flexible typing
    const validation = validateProjectDocumentUpload(
      files,
      urls.filter(url => url.trim()),
      existingDocuments as any[],
      DEFAULT_PROJECT_DOCUMENT_LIMITS
    );

    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.errors,
        warnings: validation.warnings
      }, { status: 400 });
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Project document upload warnings:', validation.warnings);
    }

    // Handle file uploads
    for (const file of files) {
      if (file.size === 0) continue;

      // Validate file (5MB limit for project documents)
      const validation = validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Check file size limit (stricter for project documents)
      const maxProjectFileSize = 5 * 1024 * 1024; // 5MB for project documents
      if (file.size > maxProjectFileSize) {
        throw new Error(`File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum of 5MB for project documents`);
      }

      // Create unique filename
      const uuid = uuidv4();
      const sanitizedName = validation.sanitizedFilename || file.name;
      const ext = sanitizedName.split('.').pop() || 'txt';
      const nameWithoutExt = sanitizedName.replace(/\.[^/.]+$/, '');
      const filename = `${uuid}-${nameWithoutExt}.${ext}`;

      // Save file using project-specific utility function
      const fileInfo = await saveProjectFile(file, id, filename);

      // Save to database
      const result = await statements.createProjectDocument.run(
        id, // project_id
        fileInfo.filename,
        fileInfo.originalFilename,
        fileInfo.filePath,
        fileInfo.fileSize,
        fileInfo.mimeType,
        null, // url
        uploadedBy,
        null, // description
        category,
        tags
      );

      const document = await statements.getProjectDocument.get(result.lastInsertRowid);
      results.push(transformProjectDocument(document));
    }

    // Handle URL uploads
    for (const url of urls) {
      if (!url) continue;

      // Validate URL
      const urlValidation = validateUrl(url);
      if (!urlValidation.isValid) {
        throw new Error(urlValidation.error);
      }

      // Extract domain for filename
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `url-${domain}-${uuidv4()}.url`;

      // Save to database (no file needed for URLs)
      const result = await statements.createProjectDocument.run(
        id, // project_id
        filename,
        url, // original_filename is the URL
        '', // no file_path for URLs
        0, // no file_size for URLs
        'text/uri-list',
        url,
        uploadedBy,
        null, // description
        category,
        tags
      );

      const document = await statements.getProjectDocument.get(result.lastInsertRowid);
      results.push(transformProjectDocument(document));
    }

    console.log(`📄 Uploaded ${results.length} documents to project #${id}`);
    return NextResponse.json({ documents: results });

  } catch (error) {
    console.error('Error uploading project documents:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to upload documents'
    }, { status: 400 });
  }
}