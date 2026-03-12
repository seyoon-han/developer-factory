'use client';

import { useState, useEffect } from 'react';
import { FileText, Filter, Search, Plus, AlertCircle } from 'lucide-react';
import ProjectDocumentUploadZone from '@/components/ProjectDocumentUploadZone';
import ProjectDocumentList from '@/components/ProjectDocumentList';
import { ProjectDocument, PROJECT_DOCUMENT_CATEGORY_OPTIONS, PROJECT_DOCUMENT_CATEGORIES } from '@/types/project';

export default function ProjectDocumentsPage() {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<string>('main'); // Default project
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Load documents for current project
  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${currentProject}/documents`);

      if (!response.ok) {
        throw new Error('Failed to load documents');
      }

      const { documents: projectDocuments } = await response.json();
      setDocuments(projectDocuments);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [currentProject]);

  // Handle document upload completion
  const handleUploadComplete = () => {
    loadDocuments();
  };

  // Handle document deletion
  const handleDocumentDeleted = (documentId: number) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  // Handle document update
  const handleDocumentUpdated = (updatedDocument: ProjectDocument) => {
    setDocuments(prev =>
      prev.map(doc => doc.id === updatedDocument.id ? updatedDocument : doc)
    );
  };

  // Filter documents based on search and category
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchTerm === '' ||
      doc.originalFilename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get document count by category
  const getCategoryCount = (category: string) => {
    if (category === 'all') return documents.length;
    return documents.filter(doc => doc.category === category).length;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Project Documents
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage documents for the current project
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Project Selector - TODO: Make this dynamic based on available projects */}
              <select
                value={currentProject}
                onChange={(e) => setCurrentProject(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="main">Main Project</option>
                {/* TODO: Load actual projects from API */}
              </select>

              <ProjectDocumentUploadZone
                projectId={currentProject}
                onUploadComplete={handleUploadComplete}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none min-w-[160px]"
              >
                <option value="all">All Categories ({getCategoryCount('all')})</option>
                {PROJECT_DOCUMENT_CATEGORY_OPTIONS.map(category => {
                  const count = getCategoryCount(category.value);
                  return (
                    <option key={category.value} value={category.value}>
                      {category.label} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Error Loading Documents
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                <button
                  onClick={loadDocuments}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* Document Stats */}
              {documents.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {filteredDocuments.length} of {documents.length} documents
                      {searchTerm && ` matching "${searchTerm}"`}
                      {selectedCategory !== 'all' && ` in ${PROJECT_DOCUMENT_CATEGORY_OPTIONS.find(c => c.value === selectedCategory)?.label}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Document List */}
              <ProjectDocumentList
                documents={filteredDocuments}
                onDocumentDeleted={handleDocumentDeleted}
                onDocumentUpdated={handleDocumentUpdated}
                readonly={false}
              />

              {/* Empty State for Filtered Results */}
              {documents.length > 0 && filteredDocuments.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No documents match your search criteria</p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                    }}
                    className="mt-2 text-blue-500 hover:text-blue-600 text-sm underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Maximum 10 documents per project • Files up to 5MB each •
            Supported formats: PDF, TXT, CSV, TSV, JPG, PNG
          </p>
        </div>
      </div>
    </div>
  );
}