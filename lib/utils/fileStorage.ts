import { promises as fs } from 'fs';
import path from 'path';
import { lookup } from 'mime-types';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  mimeType?: string;
  sanitizedFilename?: string;
}

export interface FileInfo {
  filename: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
}

// Allowed file types and their extensions
export const ALLOWED_FILE_TYPES: { [key: string]: string[] } = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'text/tab-separated-values': ['.tsv'],
};

export const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.csv', '.tsv'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Sanitize filename to prevent path traversal and other security issues
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and other dangerous characters
  const sanitized = filename
    .replace(/[/\\:*?"<>|]/g, '_') // Replace dangerous chars with underscore
    .replace(/\.\./g, '_') // Replace .. with underscore
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots (except extension)
    .trim();

  // Ensure filename is not empty and has reasonable length
  if (!sanitized || sanitized.length === 0) {
    return 'unnamed_file.txt';
  }

  // Limit filename length (excluding extension)
  const ext = path.extname(sanitized);
  const name = path.basename(sanitized, ext);
  const maxNameLength = 100;

  if (name.length > maxNameLength) {
    return name.substring(0, maxNameLength) + ext;
  }

  return sanitized;
}

/**
 * Validate uploaded file
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum of 10MB`,
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File is empty',
    };
  }

  // Check file extension
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      isValid: false,
      error: `File type ${ext} not allowed. Supported types: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // Get MIME type
  const mimeType = lookup(file.name) || 'application/octet-stream';

  // Additional MIME type validation
  const expectedMimeTypes = Object.keys(ALLOWED_FILE_TYPES);
  const isValidMimeType = expectedMimeTypes.some(type => {
    const extensions = ALLOWED_FILE_TYPES[type];
    return extensions.includes(ext) && (mimeType === type || type === 'text/plain');
  });

  if (!isValidMimeType && !mimeType.startsWith('text/')) {
    return {
      isValid: false,
      error: `Invalid file type. Expected one of: ${expectedMimeTypes.join(', ')}`,
    };
  }

  return {
    isValid: true,
    mimeType,
    sanitizedFilename: sanitizeFilename(file.name),
  };
}

/**
 * Validate URL
 */
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        isValid: false,
        error: 'Only HTTP and HTTPS URLs are allowed',
      };
    }
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }
}

/**
 * Ensure documents directory exists for task-specific files
 * New structure: workspace/{projectId}/factory-doc/task-{taskId}/
 */
export async function ensureDocumentsDirectory(projectId: string, taskId: string | number): Promise<string> {
  const documentsDir = path.join(process.cwd(), 'workspace', projectId, 'factory-doc', `task-${taskId}`);

  try {
    await fs.mkdir(documentsDir, { recursive: true });
    return documentsDir;
  } catch (error) {
    throw new Error(`Failed to create documents directory: ${error}`);
  }
}

/**
 * Ensure project documents directory exists
 * New structure: workspace/{projectId}/factory-doc/
 */
export async function ensureProjectDocumentsDirectory(projectId: string): Promise<string> {
  const documentsDir = path.join(process.cwd(), 'workspace', projectId, 'factory-doc');

  try {
    await fs.mkdir(documentsDir, { recursive: true });
    return documentsDir;
  } catch (error) {
    throw new Error(`Failed to create project documents directory: ${error}`);
  }
}

/**
 * Save file to disk for task-specific documents
 * New structure: workspace/{projectId}/factory-doc/task-{taskId}/
 */
export async function saveFile(
  file: File,
  projectId: string,
  taskId: string | number,
  filename: string
): Promise<FileInfo> {
  const documentsDir = await ensureDocumentsDirectory(projectId, taskId);
  const filePath = path.join(documentsDir, filename);
  const relativePath = path.join('workspace', projectId, 'factory-doc', `task-${taskId}`, filename);

  try {
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, new Uint8Array(arrayBuffer));

    const mimeType = lookup(file.name) || 'application/octet-stream';

    return {
      filename,
      originalFilename: file.name,
      fileSize: file.size,
      mimeType,
      filePath: relativePath,
    };
  } catch (error) {
    // Clean up partial file if it exists
    try {
      await fs.unlink(filePath);
    } catch {}

    throw new Error(`Failed to save file: ${error}`);
  }
}

/**
 * Save project file to disk
 * New structure: workspace/{projectId}/factory-doc/
 */
export async function saveProjectFile(
  file: File,
  projectId: string,
  filename: string
): Promise<FileInfo> {
  const documentsDir = await ensureProjectDocumentsDirectory(projectId);
  const filePath = path.join(documentsDir, filename);
  const relativePath = path.join('workspace', projectId, 'factory-doc', filename);

  try {
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, new Uint8Array(arrayBuffer));

    const mimeType = lookup(file.name) || 'application/octet-stream';

    return {
      filename,
      originalFilename: file.name,
      fileSize: file.size,
      mimeType,
      filePath: relativePath,
    };
  } catch (error) {
    // Clean up partial file if it exists
    try {
      await fs.unlink(filePath);
    } catch {}

    throw new Error(`Failed to save project file: ${error}`);
  }
}

/**
 * Delete file from disk
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    await fs.unlink(fullPath);
  } catch (error) {
    // Don't throw error if file doesn't exist
    console.warn(`File deletion warning: ${error}`);
  }
}

/**
 * Get file stats
 */
export async function getFileStats(filePath: string): Promise<{ exists: boolean; size: number }> {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    const stats = await fs.stat(fullPath);
    return {
      exists: true,
      size: stats.size,
    };
  } catch {
    return {
      exists: false,
      size: 0,
    };
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get file type icon based on extension
 */
export function getFileTypeIcon(filename: string): 'pdf' | 'text' | 'csv' | 'unknown' {
  const ext = path.extname(filename).toLowerCase();

  switch (ext) {
    case '.pdf':
      return 'pdf';
    case '.txt':
      return 'text';
    case '.csv':
    case '.tsv':
      return 'csv';
    default:
      return 'unknown';
  }
}