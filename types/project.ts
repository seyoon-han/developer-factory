/**
 * Project Type Definitions
 */

export interface Project {
  id: number;
  name: string;
  description: string | null;
  git_remote_url: string;
  git_branch: string;
  git_last_commit: string | null;
  git_last_pull: string | null;
  local_path: string;
  is_active: boolean;
  framework: string | null;
  language: string | null;
  package_manager: string | null;
  clone_status: 'pending' | 'cloning' | 'ready' | 'error';
  clone_error: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  name: string;
  gitUrl: string;
  branch?: string;
  description?: string;
  setActive?: boolean;
}

export interface ProjectDetectionResult {
  framework: string;
  language: string;
  packageManager: string;
}

// Project Document Categories - raw values
export const PROJECT_DOCUMENT_CATEGORIES = [
  'architecture',
  'api',
  'design',
  'requirements',
  'technical',
  'other',
] as const;

export type ProjectDocumentCategory = typeof PROJECT_DOCUMENT_CATEGORIES[number];

// Project Document Categories with labels for UI
export const PROJECT_DOCUMENT_CATEGORY_OPTIONS = [
  { value: 'architecture', label: 'Architecture' },
  { value: 'api', label: 'API Documentation' },
  { value: 'design', label: 'Design Specs' },
  { value: 'requirements', label: 'Requirements' },
  { value: 'technical', label: 'Technical Docs' },
  { value: 'other', label: 'Other' },
] as const;

export interface ProjectDocument {
  id: number;
  project_id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  category: ProjectDocumentCategory;
  description: string | null;
  tags: string[] | null;
  uploaded_at: string;
  updated_at: string;
}
