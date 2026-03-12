'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { ExtractedTaskList } from '@/components/ExtractedTaskList';
import type { ExtractedTask } from '@/app/api/task-identifier/extract/route';

export default function TaskIdentifierPage() {
  const [content, setContent] = useState('');
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is a text file
    if (!file.type.startsWith('text/') && !file.name.endsWith('.txt')) {
      setError('Please upload a text file (.txt)');
      return;
    }

    setError(null);
    setUploadedFileName(file.name);

    try {
      const text = await file.text();
      setContent(text);
    } catch (err) {
      setError('Failed to read file. Please try again.');
      console.error('Error reading file:', err);
    }
  };

  const handleExtractTasks = async () => {
    if (!content.trim()) {
      setError('Please provide content to extract tasks from');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setExtractedTasks([]);

    try {
      const response = await fetch('/api/task-identifier/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract tasks');
      }

      const data = await response.json();
      
      if (data.tasks && data.tasks.length > 0) {
        setExtractedTasks(data.tasks);
      } else {
        setError('No actionable tasks found in the provided content. Try adding more specific action items or TODO items.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to extract tasks. Please try again.');
      console.error('Error extracting tasks:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClearAll = () => {
    setContent('');
    setExtractedTasks([]);
    setError(null);
    setUploadedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Task Identifier</h1>
        </div>
        <p className="text-muted-foreground">
          Extract actionable tasks from meeting transcripts, notes, and documents using AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Upload or Paste Content</h2>
            
            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Upload Text File
              </label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-accent cursor-pointer transition-colors"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploadedFileName || 'Choose a text file'}
                  </span>
                </label>
                {uploadedFileName && (
                  <button
                    onClick={handleClearAll}
                    className="px-4 py-2 text-sm text-destructive hover:bg-destructive/10 border border-border rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Accepts .txt files (meeting transcripts, notes, summaries)
              </p>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">or paste directly</span>
              </div>
            </div>

            {/* Text Area */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-foreground mb-2">
                Paste Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your meeting transcript, notes, or document content here..."
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={12}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {content.length} characters
              </p>
            </div>

            {/* Extract Button */}
            <button
              onClick={handleExtractTasks}
              disabled={!content.trim() || isExtracting}
              className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isExtracting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Extracting Tasks...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Extract Tasks
                </>
              )}
            </button>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-accent/50 border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">💡 Tips for Better Results</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Include clear action items (e.g., "TODO", "Action item", "Need to...")</li>
              <li>• Mention owners or responsible parties when possible</li>
              <li>• Include deadlines or timeframes for urgent items</li>
              <li>• Be specific about what needs to be done</li>
              <li>• Remove completed tasks before extraction</li>
            </ul>
          </div>
        </div>

        {/* Results Section */}
        <div>
          <div className="bg-card border border-border rounded-lg p-6 h-full">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Extracted Tasks
              {extractedTasks.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({extractedTasks.length} found)
                </span>
              )}
            </h2>

            {extractedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium text-foreground mb-1">No Tasks Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Upload a file or paste content, then click "Extract Tasks" to identify actionable items
                </p>
              </div>
            ) : (
              <ExtractedTaskList 
                tasks={extractedTasks}
                onTaskCreated={() => {
                  // Optionally refresh or show success message
                  console.log('Task created successfully');
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

