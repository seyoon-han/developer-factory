/**
 * Global Documents API
 * GET - List all global documents
 * POST - Upload a new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { globalDocumentService } from '@/lib/agentic/services/globalDocumentService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    let documents;

    if (category) {
      documents = await globalDocumentService.getDocumentsByCategory(category);
    } else {
      documents = await globalDocumentService.getAllDocuments();
    }

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error('Failed to get global documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const tagsString = formData.get('tags') as string;

    if (!file || !name) {
      return NextResponse.json(
        { success: false, error: 'File and name are required' },
        { status: 400 }
      );
    }

    const content = await file.text();
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()) : [];

    const document = await globalDocumentService.createDocument({
      name,
      content,
      mimeType: file.type || 'text/plain',
      category: category || 'general',
      description,
      tags,
    });

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Failed to upload document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
