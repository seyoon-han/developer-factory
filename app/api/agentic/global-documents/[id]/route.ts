/**
 * Global Document by ID API
 * GET - Get document details and content
 * PATCH - Update document metadata
 * DELETE - Delete document
 */

import { NextRequest, NextResponse } from 'next/server';
import { globalDocumentService } from '@/lib/agentic/services/globalDocumentService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docId = parseInt(id, 10);

    const document = await globalDocumentService.getDocument(docId);

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Failed to get document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get document' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docId = parseInt(id, 10);
    const body = await request.json();

    const { name, category, description, tags } = body;

    const document = await globalDocumentService.updateDocument(docId, {
      name,
      category,
      description,
      tags,
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Failed to update document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docId = parseInt(id, 10);

    const deleted = await globalDocumentService.deleteDocument(docId);

    return NextResponse.json({
      success: deleted,
    });
  } catch (error) {
    console.error('Failed to delete document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
