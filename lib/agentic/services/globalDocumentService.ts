/**
 * Global Documents Service
 * Manages global document library for reuse across tasks
 */

import { statements } from '@/lib/db/postgres';
import {
  GlobalDocument,
  GlobalDocumentRow,
  rowToGlobalDocument,
} from '@/types/agentic-task';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const GLOBAL_DOCUMENTS_DIR = path.join(process.cwd(), 'data', 'global-documents');

export class GlobalDocumentService {
  constructor() {
    // Ensure documents directory exists
    if (!fs.existsSync(GLOBAL_DOCUMENTS_DIR)) {
      fs.mkdirSync(GLOBAL_DOCUMENTS_DIR, { recursive: true });
    }
  }

  /**
   * Upload a global document
   */
  async uploadDocument(
    file: {
      originalFilename: string;
      buffer: Buffer;
      mimeType: string;
    },
    options?: {
      description?: string;
      category?: string;
      tags?: string[];
      uploadedBy?: string;
    }
  ): Promise<GlobalDocument> {
    const filename = `${uuidv4()}-${file.originalFilename}`;
    const filePath = path.join(GLOBAL_DOCUMENTS_DIR, filename);

    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Save to database
    const result = await statements.createGlobalDocument.run(
      filename,
      file.originalFilename,
      filePath,
      file.buffer.length,
      file.mimeType,
      options?.description || null,
      options?.category || 'general',
      options?.tags ? JSON.stringify(options.tags) : null,
      options?.uploadedBy || null
    );

    const row = await statements.getGlobalDocument.get(result.lastInsertRowid) as GlobalDocumentRow;
    return rowToGlobalDocument(row);
  }

  /**
   * Create a document from content string (for text-based docs)
   */
  async createDocument(data: {
    name: string;
    content: string;
    mimeType: string;
    category?: string;
    description?: string;
    tags?: string[];
    uploadedBy?: string;
  }): Promise<GlobalDocument> {
    const filename = `${uuidv4()}-${data.name}`;
    const filePath = path.join(GLOBAL_DOCUMENTS_DIR, filename);
    const buffer = Buffer.from(data.content, 'utf-8');

    // Write file to disk
    fs.writeFileSync(filePath, buffer);

    // Save to database
    const result = await statements.createGlobalDocument.run(
      filename,
      data.name,
      filePath,
      buffer.length,
      data.mimeType,
      data.description || null,
      data.category || 'general',
      data.tags ? JSON.stringify(data.tags) : null,
      data.uploadedBy || null
    );

    const row = await statements.getGlobalDocument.get(result.lastInsertRowid) as GlobalDocumentRow;
    return rowToGlobalDocument(row);
  }

  /**
   * Get a global document by ID
   */
  async getDocument(id: number): Promise<GlobalDocument | null> {
    const row = await statements.getGlobalDocument.get(id) as GlobalDocumentRow | undefined;
    if (!row) return null;
    return rowToGlobalDocument(row);
  }

  /**
   * Get all global documents
   */
  async getAllDocuments(): Promise<GlobalDocument[]> {
    const rows = await statements.getAllGlobalDocuments.all() as GlobalDocumentRow[];
    return rows.map(rowToGlobalDocument);
  }

  /**
   * Get documents by category
   */
  async getDocumentsByCategory(category: string): Promise<GlobalDocument[]> {
    const rows = await statements.getGlobalDocumentsByCategory.all(category) as GlobalDocumentRow[];
    return rows.map(rowToGlobalDocument);
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    id: number,
    updates: {
      name?: string;
      description?: string;
      category?: string;
      tags?: string[];
    }
  ): Promise<GlobalDocument | null> {
    const existing = await this.getDocument(id);
    if (!existing) return null;

    // Note: name update requires renaming the file - for now, only update metadata
    await statements.updateGlobalDocument.run(
      updates.description ?? existing.description ?? null,
      updates.category ?? existing.category,
      updates.tags ? JSON.stringify(updates.tags) : (existing.tags ? JSON.stringify(existing.tags) : null),
      id
    );

    return this.getDocument(id);
  }

  /**
   * Delete a global document
   */
  async deleteDocument(id: number): Promise<boolean> {
    const doc = await this.getDocument(id);
    if (!doc) return false;

    // Delete file from disk
    if (fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }

    // Delete from database
    const result = await statements.deleteGlobalDocument.run(id);
    return result.changes > 0;
  }

  /**
   * Get document content as string (for text files)
   */
  async getDocumentContent(id: number): Promise<string | null> {
    const doc = await this.getDocument(id);
    if (!doc) return null;

    if (!fs.existsSync(doc.filePath)) {
      return null;
    }

    // Only read text-based files
    const textMimeTypes = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'text/html',
      'application/json',
      'application/xml',
      'text/xml',
    ];

    if (textMimeTypes.some(t => doc.mimeType.includes(t))) {
      return fs.readFileSync(doc.filePath, 'utf-8');
    }

    return null;
  }

  /**
   * Get document buffer (for all file types)
   */
  async getDocumentBuffer(id: number): Promise<Buffer | null> {
    const doc = await this.getDocument(id);
    if (!doc) return null;

    if (!fs.existsSync(doc.filePath)) {
      return null;
    }

    return fs.readFileSync(doc.filePath);
  }

  /**
   * Search documents by tags
   */
  async searchByTags(tags: string[]): Promise<GlobalDocument[]> {
    const allDocs = await this.getAllDocuments();
    return allDocs.filter(doc => {
      if (!doc.tags) return false;
      return tags.some(tag => doc.tags!.includes(tag));
    });
  }

  /**
   * Get available categories
   */
  async getCategories(): Promise<string[]> {
    const docs = await this.getAllDocuments();
    const categories = new Set(docs.map(d => d.category));
    return Array.from(categories).sort();
  }

  /**
   * Format documents for prompt context
   */
  async formatForPrompt(documentIds: number[]): Promise<string> {
    const lines: string[] = ['## Attached Documents\n'];

    for (const id of documentIds) {
      const doc = await this.getDocument(id);
      if (!doc) continue;

      lines.push(`### ${doc.originalFilename}`);
      if (doc.description) {
        lines.push(`> ${doc.description}`);
      }

      const content = await this.getDocumentContent(id);
      if (content) {
        lines.push('```');
        lines.push(content.slice(0, 5000)); // Limit to 5000 chars
        if (content.length > 5000) {
          lines.push('... (truncated)');
        }
        lines.push('```');
      } else {
        lines.push(`*Binary file: ${doc.mimeType}, ${doc.fileSize} bytes*`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

// Singleton instance
export const globalDocumentService = new GlobalDocumentService();
export default globalDocumentService;
