import { NextResponse } from 'next/server';
import { statements } from '@/lib/db/postgres';
import { promises as fs } from 'fs';
import path from 'path';
import { deleteFile } from '@/lib/utils/fileStorage';
import {
  validateProjectDocumentUpdate,
  sanitizeProjectDocumentMetadata
} from '@/lib/utils/projectDocumentValidation';

// Helper to transform snake_case to camelCase for project documents
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
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const document = await statements.getProjectDocument.get(documentId) as any;

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
      console.error('Error reading project document file:', fileError);
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

  } catch (error) {
    console.error('Error downloading project document:', error);
    return NextResponse.json({ error: 'Failed to download document' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const document = await statements.getProjectDocument.get(documentId) as any;

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete file from disk if it exists
    if (document.file_path) {
      await deleteFile(document.file_path);
      console.log(`🗑️ Deleted project file: ${document.file_path}`);
    }

    // Delete from database
    await statements.deleteProjectDocument.run(documentId);

    console.log(`🗑️ Deleted project document #${documentId} from project #${document.project_id}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting project document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const rawUpdates = await request.json();

    const document = await statements.getProjectDocument.get(documentId) as any;
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Validate the updates
    const validation = validateProjectDocumentUpdate(rawUpdates);
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.errors,
        warnings: validation.warnings
      }, { status: 400 });
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Project document update warnings:', validation.warnings);
    }

    // Sanitize and normalize the updates
    const updates = sanitizeProjectDocumentMetadata(rawUpdates);

    // Update description if provided
    if (updates.description !== undefined) {
      await statements.updateProjectDocumentDescription.run(updates.description, documentId);
    }

    // Update category
    await statements.updateProjectDocumentCategory.run(updates.category, documentId);

    // Update tags
    const tagsJson = JSON.stringify(updates.tags);
    await statements.updateProjectDocumentTags.run(tagsJson, documentId);

    // Return updated document
    const updatedDocument = await statements.getProjectDocument.get(documentId);
    return NextResponse.json({
      document: transformProjectDocument(updatedDocument),
      warnings: validation.warnings
    });

  } catch (error) {
    console.error('Error updating project document:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}