'use client';

/**
 * Global Documents Component
 * Manage global document library for reuse across tasks
 */

import React, { useEffect, useState, useRef } from 'react';
import { useAgenticStore } from '@/lib/store/agenticStore';
import { GlobalDocument } from '@/types/agentic-task';
import { cn } from '@/lib/utils/cn';

interface GlobalDocumentsProps {
  onSelect?: (doc: GlobalDocument) => void;
  selectable?: boolean;
  selectedIds?: number[];
  className?: string;
}

export function GlobalDocuments({
  onSelect,
  selectable = false,
  selectedIds = [],
  className,
}: GlobalDocumentsProps) {
  const globalDocuments = useAgenticStore((s) => s.globalDocuments);
  const fetchGlobalDocuments = useAgenticStore((s) => s.fetchGlobalDocuments);
  const uploadDocument = useAgenticStore((s) => s.uploadDocument);
  const deleteDocument = useAgenticStore((s) => s.deleteDocument);
  const isLoading = useAgenticStore((s) => s.isLoading);
  const isLoadingDocuments = useAgenticStore((s) => s.isLoadingDocuments);

  const [filter, setFilter] = useState({ category: '', search: '' });
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGlobalDocuments();
  }, [fetchGlobalDocuments]);

  // Filter documents
  const filteredDocs = globalDocuments.filter((doc) => {
    if (filter.category && doc.category !== filter.category) return false;
    if (filter.search) {
      const search = filter.search.toLowerCase();
      return (
        doc.originalFilename.toLowerCase().includes(search) ||
        doc.description?.toLowerCase().includes(search) ||
        doc.tags?.some((t) => t.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Get unique categories
  const categories = Array.from(new Set(globalDocuments.map((d) => d.category)));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      await uploadDocument(file, { category: 'general' });
    }

    setShowUpload(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId: number) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(docId);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Global Documents</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Reusable documents attached to tasks for context
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-md text-sm transition-colors"
        >
          + Upload Document
        </button>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={uploadDocument}
          isLoading={isLoading}
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={filter.search}
          onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
          placeholder="Search documents..."
          className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm"
        />
        <select
          value={filter.category}
          onChange={(e) => setFilter((prev) => ({ ...prev, category: e.target.value }))}
          className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Documents grid */}
      {isLoadingDocuments ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">Loading documents...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-8 border border-dashed border-[var(--border)] rounded-lg text-center">
          <p className="text-[var(--muted-foreground)]">
            {globalDocuments.length === 0
              ? 'No documents uploaded yet.'
              : 'No documents match your filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              isSelected={selectedIds.includes(doc.id)}
              selectable={selectable}
              onSelect={() => onSelect?.(doc)}
              onDelete={() => handleDelete(doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Document Card
interface DocumentCardProps {
  document: GlobalDocument;
  isSelected: boolean;
  selectable: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function DocumentCard({ document, isSelected, selectable, onSelect, onDelete }: DocumentCardProps) {
  const [showPreview, setShowPreview] = useState(false);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('json')) return '📋';
    if (mimeType.includes('text')) return '📝';
    if (mimeType.includes('markdown')) return '📖';
    return '📎';
  };

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-all',
        isSelected
          ? 'border-[var(--primary)] bg-[var(--primary)]/10'
          : 'border-[var(--border)] hover:border-[var(--border-hover)]',
        selectable && 'cursor-pointer'
      )}
      onClick={() => selectable && onSelect()}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{getFileIcon(document.mimeType)}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-[var(--foreground)] truncate">
              {document.originalFilename}
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {formatFileSize(document.fileSize)} · {document.category}
            </div>
          </div>
          {isSelected && (
            <span className="text-[var(--primary)]">✓</span>
          )}
        </div>

        {document.description && (
          <p className="text-xs text-[var(--muted-foreground)] mt-2 line-clamp-2">
            {document.description}
          </p>
        )}

        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {document.tags.map((tag, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 bg-[var(--muted)] rounded text-xs text-[var(--muted-foreground)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
        <span className="text-[var(--muted-foreground)]">
          {new Date(document.createdAt).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPreview(true);
            }}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Preview
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-500 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <DocumentPreviewModal document={document} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

// Upload Modal
interface UploadModalProps {
  onClose: () => void;
  onUpload: (file: File, metadata?: { description?: string; category?: string; tags?: string[] }) => Promise<GlobalDocument | null>;
  isLoading: boolean;
}

function UploadModal({ onClose, onUpload, isLoading }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [metadata, setMetadata] = useState({
    description: '',
    category: 'general',
    tags: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleUpload = async () => {
    for (const file of files) {
      await onUpload(file, {
        description: metadata.description,
        category: metadata.category,
        tags: metadata.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[var(--background)] border border-[var(--border)] rounded-lg shadow-xl">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--foreground)]">Upload Documents</h3>
          <button
            onClick={onClose}
            className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-[var(--border)] rounded-lg text-center cursor-pointer hover:border-[var(--primary)] transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => {
                const newFiles = Array.from(e.target.files || []);
                setFiles((prev) => [...prev, ...newFiles]);
              }}
              className="hidden"
            />
            <p className="text-[var(--muted-foreground)]">
              Drop files here or click to browse
            </p>
          </div>

          {/* Selected files */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-[var(--muted)] rounded"
                >
                  <span className="text-sm text-[var(--foreground)] truncate">{file.name}</span>
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-red-500 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-1">Category</label>
              <select
                value={metadata.category}
                onChange={(e) => setMetadata((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm"
              >
                <option value="general">General</option>
                <option value="requirements">Requirements</option>
                <option value="design">Design</option>
                <option value="reference">Reference</option>
                <option value="template">Template</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-1">Description</label>
              <textarea
                value={metadata.description}
                onChange={(e) => setMetadata((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description..."
                rows={2}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={metadata.tags}
                onChange={(e) => setMetadata((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., api, auth, docs"
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-md text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isLoading}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-md text-sm disabled:opacity-50"
          >
            {isLoading ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Preview Modal
function DocumentPreviewModal({
  document,
  onClose,
}: {
  document: GlobalDocument;
  onClose: () => void;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch(`/api/agentic/global-documents/${document.id}?content=true`);
        const data = await res.json();
        if (data.success && data.content) {
          setContent(data.content);
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchContent();
  }, [document.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[80vh] bg-[var(--background)] border border-[var(--border)] rounded-lg shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--foreground)]">{document.originalFilename}</h3>
          <button
            onClick={onClose}
            className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">Loading...</div>
          ) : content ? (
            <pre className="text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono bg-[var(--muted)] p-4 rounded-lg">
              {content}
            </pre>
          ) : (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              Preview not available for this file type
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper
function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default GlobalDocuments;
