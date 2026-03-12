import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { v4 as uuidv4 } from 'uuid';
import {
  validateFile,
  validateUrl,
  saveFile,
} from '@/lib/utils/fileStorage';

// Helper to transform SQLite snake_case to camelCase
function transformDocument(doc: any) {
  return {
    id: doc.id,
    taskId: doc.task_id,
    filename: doc.filename,
    originalFilename: doc.original_filename,
    filePath: doc.file_path,
    fileSize: doc.file_size,
    mimeType: doc.mime_type,
    url: doc.url,
    uploadedBy: doc.uploaded_by,
    uploadedAt: doc.uploaded_at,
    description: doc.description,
  };
}


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rawDocuments = await statements.getTaskDocuments.all(id);
    const documents = (rawDocuments as any[]).map(transformDocument);

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching task documents:', error);
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

    // Get task to retrieve project ID (board_id)
    const task = await statements.getTask.get(id) as any;
    if (!task) {
      throw new Error(`Task #${id} not found`);
    }
    const projectId = task.board_id;

    const results = [];

    // Handle file uploads
    for (const file of files) {
      if (file.size === 0) continue;

      // Validate file
      const validation = validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Create unique filename
      const uuid = uuidv4();
      const sanitizedName = validation.sanitizedFilename || file.name;
      const ext = sanitizedName.split('.').pop() || 'txt';
      const nameWithoutExt = sanitizedName.replace(/\.[^/.]+$/, '');
      const filename = `${uuid}-${nameWithoutExt}.${ext}`;

      // Save file using utility function with project ID
      const fileInfo = await saveFile(file, projectId, id, filename);

      // Save to database
      const result = await statements.createDocument.run(
        id,
        fileInfo.filename,
        fileInfo.originalFilename,
        fileInfo.filePath,
        fileInfo.fileSize,
        fileInfo.mimeType,
        null, // url
        uploadedBy,
        null  // description
      );

      const document = await statements.getDocument.get(result.lastInsertRowid);
      results.push(transformDocument(document));
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
      const result = await statements.createDocument.run(
        id,
        filename,
        url, // original_filename is the URL
        '', // no file_path for URLs
        0, // no file_size for URLs
        'text/uri-list',
        url,
        uploadedBy,
        null // description
      );

      const document = await statements.getDocument.get(result.lastInsertRowid);
      results.push(transformDocument(document));
    }

    console.log(`📄 Uploaded ${results.length} documents to task #${id}`);
    return NextResponse.json({ documents: results });

  } catch (error) {
    console.error('Error uploading documents:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to upload documents'
    }, { status: 400 });
  }
}