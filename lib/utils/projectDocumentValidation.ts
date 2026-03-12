import { ProjectDocument } from '@/types/project';

// Enhanced validation for project documents
export interface ProjectDocumentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProjectDocumentLimits {
  maxDocumentsPerProject: number;
  maxFileSizeBytes: number;
  maxTotalStoragePerProject: number;
  allowedFileTypes: string[];
  allowedMimeTypes: string[];
}

// Default limits for project documents
export const DEFAULT_PROJECT_DOCUMENT_LIMITS: ProjectDocumentLimits = {
  maxDocumentsPerProject: 10,
  maxFileSizeBytes: 5 * 1024 * 1024, // 5MB
  maxTotalStoragePerProject: 50 * 1024 * 1024, // 50MB total
  allowedFileTypes: ['.pdf', '.txt', '.csv', '.tsv', '.jpg', '.jpeg', '.png'],
  allowedMimeTypes: [
    'application/pdf',
    'text/plain',
    'text/csv',
    'text/tab-separated-values',
    'image/jpeg',
    'image/png'
  ]
};

/**
 * Validate project document upload constraints
 */
export function validateProjectDocumentUpload(
  files: File[],
  urls: string[],
  existingDocuments: ProjectDocument[],
  limits: ProjectDocumentLimits = DEFAULT_PROJECT_DOCUMENT_LIMITS
): ProjectDocumentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check document count limits
  const totalNewDocuments = files.length + urls.filter(url => url.trim()).length;
  const totalDocumentsAfterUpload = existingDocuments.length + totalNewDocuments;

  if (totalDocumentsAfterUpload > limits.maxDocumentsPerProject) {
    errors.push(
      `Maximum ${limits.maxDocumentsPerProject} documents allowed per project. ` +
      `Currently have ${existingDocuments.length}, attempting to add ${totalNewDocuments}.`
    );
  }

  // Check individual file sizes and types
  for (const file of files) {
    // File size check
    if (file.size > limits.maxFileSizeBytes) {
      const sizeMB = Math.round(file.size / 1024 / 1024);
      const limitMB = Math.round(limits.maxFileSizeBytes / 1024 / 1024);
      errors.push(`File "${file.name}" is ${sizeMB}MB, exceeds limit of ${limitMB}MB`);
    }

    // File type check
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (fileExtension && !limits.allowedFileTypes.includes(`.${fileExtension}`)) {
      errors.push(
        `File type ".${fileExtension}" not allowed for "${file.name}". ` +
        `Allowed types: ${limits.allowedFileTypes.join(', ')}`
      );
    }

    // Empty file check
    if (file.size === 0) {
      errors.push(`File "${file.name}" is empty`);
    }

    // File name validation
    if (file.name.length > 255) {
      errors.push(`File name "${file.name}" is too long (max 255 characters)`);
    }

    // Check for duplicate names
    const duplicateInExisting = existingDocuments.some(
      doc => doc.originalFilename.toLowerCase() === file.name.toLowerCase()
    );
    if (duplicateInExisting) {
      warnings.push(`File "${file.name}" has the same name as an existing document`);
    }
  }

  // Check URLs
  for (const url of urls) {
    if (!url.trim()) continue;

    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        errors.push(`URL "${url}" must use HTTP or HTTPS protocol`);
      }

      // Check for duplicate URLs
      const duplicateUrl = existingDocuments.some(doc => doc.url === url);
      if (duplicateUrl) {
        warnings.push(`URL "${url}" is already added to this project`);
      }
    } catch {
      errors.push(`Invalid URL format: "${url}"`);
    }
  }

  // Check total storage limit
  const currentStorageUsed = existingDocuments.reduce((total, doc) => total + doc.fileSize, 0);
  const newFilesSize = files.reduce((total, file) => total + file.size, 0);
  const totalStorageAfterUpload = currentStorageUsed + newFilesSize;

  if (totalStorageAfterUpload > limits.maxTotalStoragePerProject) {
    const currentMB = Math.round(currentStorageUsed / 1024 / 1024);
    const newMB = Math.round(newFilesSize / 1024 / 1024);
    const limitMB = Math.round(limits.maxTotalStoragePerProject / 1024 / 1024);
    errors.push(
      `Storage limit exceeded. Current: ${currentMB}MB, adding: ${newMB}MB, limit: ${limitMB}MB`
    );
  }

  // Performance warnings for large files
  for (const file of files) {
    if (file.size > 2 * 1024 * 1024) { // 2MB
      const sizeMB = Math.round(file.size / 1024 / 1024);
      warnings.push(`Large file "${file.name}" (${sizeMB}MB) may slow down uploads`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate project document metadata updates
 */
export function validateProjectDocumentUpdate(
  updates: { description?: string; category?: string; tags?: string[] }
): ProjectDocumentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Description validation
  if (updates.description !== undefined) {
    if (updates.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }
  }

  // Category validation
  if (updates.category !== undefined) {
    const validCategories = ['requirements', 'design', 'specification', 'reference', 'media', 'other'];
    if (!validCategories.includes(updates.category)) {
      errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }
  }

  // Tags validation
  if (updates.tags !== undefined) {
    if (updates.tags.length > 10) {
      errors.push('Maximum 10 tags allowed per document');
    }

    for (const tag of updates.tags) {
      if (tag.length > 50) {
        errors.push(`Tag "${tag}" is too long (max 50 characters)`);
      }

      if (!/^[a-zA-Z0-9\s\-_]+$/.test(tag)) {
        errors.push(`Tag "${tag}" contains invalid characters. Use only letters, numbers, spaces, hyphens, and underscores.`);
      }
    }

    // Check for duplicate tags
    const uniqueTags = new Set(updates.tags.map(tag => tag.toLowerCase()));
    if (uniqueTags.size !== updates.tags.length) {
      warnings.push('Duplicate tags will be removed');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize and normalize project document metadata
 */
export function sanitizeProjectDocumentMetadata(data: {
  description?: string;
  category?: string;
  tags?: string[];
}): {
  description?: string;
  category: string;
  tags: string[];
} {
  return {
    description: data.description?.trim() || undefined,
    category: data.category?.trim().toLowerCase() || 'other',
    tags: data.tags
      ? [...new Set(data.tags.map(tag => tag.trim()).filter(tag => tag.length > 0))]
      : []
  };
}

/**
 * Get storage usage statistics for a project
 */
export function getProjectStorageStats(
  documents: ProjectDocument[],
  limits: ProjectDocumentLimits = DEFAULT_PROJECT_DOCUMENT_LIMITS
) {
  const totalFiles = documents.filter(doc => !doc.url).length;
  const totalUrls = documents.filter(doc => doc.url).length;
  const totalStorage = documents.reduce((sum, doc) => sum + doc.fileSize, 0);

  return {
    totalDocuments: documents.length,
    totalFiles,
    totalUrls,
    totalStorage,
    storageUsedPercent: Math.round((totalStorage / limits.maxTotalStoragePerProject) * 100),
    documentsUsedPercent: Math.round((documents.length / limits.maxDocumentsPerProject) * 100),
    remainingDocuments: Math.max(0, limits.maxDocumentsPerProject - documents.length),
    remainingStorage: Math.max(0, limits.maxTotalStoragePerProject - totalStorage),
    isNearStorageLimit: totalStorage > (limits.maxTotalStoragePerProject * 0.8),
    isNearDocumentLimit: documents.length > (limits.maxDocumentsPerProject * 0.8)
  };
}