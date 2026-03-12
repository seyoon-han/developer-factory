'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudUpload, X, Link, Upload, FileText, File, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface ProjectDocumentUploadZoneProps {
  projectId: string;
  onUploadComplete: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

interface UploadProgress {
  name: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  id?: string; // unique id for each upload
}

export default function ProjectDocumentUploadZone({
  projectId,
  onUploadComplete,
  disabled = false,
  disabledReason
}: ProjectDocumentUploadZoneProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    const progressItems: UploadProgress[] = acceptedFiles.map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      progress: 0,
      status: 'uploading'
    }));
    setUploadProgress(progressItems);

    try {
      await uploadFiles(acceptedFiles);
    } catch (error) {
      console.error('Upload failed:', error);
      // Update all items to error state
      setUploadProgress(prev =>
        prev.map(item => ({
          ...item,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        }))
      );
    } finally {
      setIsUploading(false);
    }
  }, [projectId]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 5 * 1024 * 1024, // 5MB for project documents
    multiple: true,
    disabled: isUploading
  });

  const uploadFiles = async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('uploadedBy', 'user'); // TODO: Get from auth context
    formData.append('category', 'other'); // Default category

    try {
      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      // Update progress to success
      setUploadProgress(prev =>
        prev.map(item => ({
          ...item,
          progress: 100,
          status: 'success'
        }))
      );

      // Call completion callback
      setTimeout(() => {
        onUploadComplete();
        setUploadProgress([]);
      }, 1000);

    } catch (error) {
      // Update progress to error
      setUploadProgress(prev =>
        prev.map(item => ({
          ...item,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        }))
      );

      setTimeout(() => {
        setUploadProgress([]);
      }, 3000);
    }
  };

  const uploadUrl = async () => {
    if (!urlInput.trim()) return;

    setIsUploading(true);
    const urlProgress: UploadProgress = {
      id: `url-${Date.now()}`,
      name: urlInput,
      progress: 0,
      status: 'uploading'
    };
    setUploadProgress([urlProgress]);

    try {
      // Basic URL validation on client side
      try {
        new URL(urlInput);
      } catch {
        throw new Error('Please enter a valid URL (starting with http:// or https://)');
      }

      const formData = new FormData();
      formData.append('urls', urlInput);
      formData.append('uploadedBy', 'user'); // TODO: Get from auth context
      formData.append('category', 'other'); // Default category

      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'URL upload failed');
      }

      setUploadProgress([{ ...urlProgress, progress: 100, status: 'success' }]);
      setUrlInput('');

      setTimeout(() => {
        onUploadComplete();
        setUploadProgress([]);
        setIsOpen(false);
      }, 1000);

    } catch (error) {
      setUploadProgress([{
        ...urlProgress,
        status: 'error',
        error: error instanceof Error ? error.message : 'URL upload failed'
      }]);

      setTimeout(() => {
        setUploadProgress([]);
      }, 3000);
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <File className="w-4 h-4 text-red-500" />;
      case 'txt':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'csv':
      case 'tsv':
        return <File className="w-4 h-4 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <File className="w-4 h-4 text-purple-500" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        title={disabled ? disabledReason : 'Upload documents to the project'}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          disabled
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        <CloudUpload className="w-4 h-4" />
        Upload Documents
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Upload Project Documents
          </h3>
          <button
            onClick={() => {
              setIsOpen(false);
              setUploadProgress([]);
              setUrlInput('');
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isUploading}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Upload Progress
              </h4>
              {uploadProgress.map((item) => (
                <div key={item.id || item.name} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-shrink-0">
                    {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                    {item.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getFileIcon(item.name)}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.name}
                      </span>
                    </div>
                    {item.status === 'error' && item.error && (
                      <p className="text-xs text-red-500 mt-1">{item.error}</p>
                    )}
                  </div>
                  {item.status === 'uploading' && (
                    <div className="w-16 text-xs text-gray-500">
                      {item.progress}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* File Drop Zone */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Drop Files or Click to Browse
            </h4>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload className={`w-8 h-8 mx-auto mb-4 ${
                isDragActive ? 'text-blue-500' : 'text-gray-400'
              }`} />
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {isDragActive ? 'Drop files here' : 'Choose files or drag them here'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                PDF, TXT, CSV, TSV, JPG, PNG files up to 5MB each (max 10 files per project)
              </p>
            </div>

            {/* File Rejection Errors */}
            {fileRejections.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                  Some files were rejected:
                </p>
                <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                  {fileRejections.map(({ file, errors }, index) => (
                    <li key={index}>
                      <strong>{file.name}:</strong> {errors.map(e => e.message).join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* URL Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Add Web URL
            </h4>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/document.pdf"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isUploading}
                />
              </div>
              <button
                onClick={uploadUrl}
                disabled={!urlInput.trim() || isUploading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Add URL
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}