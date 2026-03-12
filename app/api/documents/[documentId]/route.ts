import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { promises as fs } from 'fs';
import path from 'path';
import { deleteFile } from '@/lib/utils/fileStorage';

// Helper to transform snake_case to camelCase
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
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const document = await statements.getDocument.get(documentId) as any;

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // If it's a URL, redirect to the URL
    if (document.url) {
      return NextResponse.redirect(document.url);
    }

    // For files, read and return the file content
    if (!document.file_path) {
      return NextResponse.json({ error: 'File path not found' }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), document.file_path);

    try {
      const fileBuffer = await fs.readFile(filePath);

      // Set appropriate headers for file download
      const headers = new Headers();
      headers.set('Content-Type', document.mime_type || 'application/octet-stream');
      headers.set('Content-Disposition', `attachment; filename="${document.original_filename}"`);
      headers.set('Content-Length', document.file_size.toString());

      return new NextResponse(fileBuffer, { headers });
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json({ error: 'Failed to download document' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const document = await statements.getDocument.get(documentId) as any;

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete file from disk if it exists
    if (document.file_path) {
      await deleteFile(document.file_path);
      console.log(`🗑️ Deleted file: ${document.file_path}`);
    }

    // Delete from database
    await statements.deleteDocument.run(documentId);

    console.log(`🗑️ Deleted document #${documentId} from task #${document.task_id}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const updates = await request.json();

    const document = await statements.getDocument.get(documentId) as any;
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Update description if provided
    if ('description' in updates) {
      await statements.updateDocumentDescription.run(updates.description, documentId);
    }

    // Return updated document
    const updatedDocument = await statements.getDocument.get(documentId);
    return NextResponse.json({ document: transformDocument(updatedDocument) });

  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}