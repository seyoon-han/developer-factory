/**
 * Project Context Scanner
 * Scans project directory and reads relevant files for AI context
 */

import fs from 'fs';
import path from 'path';

export interface ProjectFile {
  path: string;
  content: string;
  size: number;
}

export interface ProjectContext {
  files: ProjectFile[];
  summary: string;
  totalSize: number;
}

const IMPORTANT_FILES = [
  'package.json',
  'tsconfig.json',
  'next.config.ts',
  'next.config.js',
  'next.config.mjs',
  'tailwind.config.ts',
  'tailwind.config.js',
  '.env.example',
  'README.md',
];

const IMPORTANT_DIRS = [
  'app',
  'components',
  'lib',
  'types',
];

const IGNORE_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'coverage',
  '.turbo',
  'data', // SQLite database
];

const MAX_FILE_SIZE = 50000; // 50KB per file
const MAX_TOTAL_SIZE = 200000; // 200KB total context

export class ProjectScanner {
  private projectPath: string | null;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || null;
    if (this.projectPath) {
      console.log(`🔍 ProjectScanner initialized for: ${this.projectPath}`);
    }
  }

  /**
   * Get the project path (lazy initialization)
   */
  private getProjectPath(): string {
    if (!this.projectPath) {
      this.projectPath = getTargetProjectPath();
      console.log(`🔍 ProjectScanner using target: ${this.projectPath}`);
    }
    return this.projectPath;
  }

  /**
   * Scan project and gather context
   */
  async scanProject(): Promise<ProjectContext> {
    const files: ProjectFile[] = [];
    let totalSize = 0;

    const projectPath = this.getProjectPath();
    console.log(`📂 Scanning project at: ${projectPath}`);

    // 1. Read important root files
    for (const filename of IMPORTANT_FILES) {
      const filePath = path.join(projectPath, filename);
      if (fs.existsSync(filePath)) {
        const file = this.readFile(filePath);
        if (file && totalSize + file.size <= MAX_TOTAL_SIZE) {
          files.push(file);
          totalSize += file.size;
          console.log(`   ✓ ${filename} (${file.size} bytes)`);
        }
      }
    }

    // 2. Scan important directories
    for (const dir of IMPORTANT_DIRS) {
      const dirPath = path.join(projectPath, dir);
      if (fs.existsSync(dirPath)) {
        const dirFiles = this.scanDirectory(dirPath, totalSize);
        for (const file of dirFiles) {
          if (totalSize + file.size <= MAX_TOTAL_SIZE) {
            files.push(file);
            totalSize += file.size;
            console.log(`   ✓ ${file.path} (${file.size} bytes)`);
          } else {
            console.log(`   ⚠️  Skipping ${file.path} (would exceed total size limit)`);
            break;
          }
        }
      }
    }

    const summary = this.generateSummary(files);

    console.log(`📊 Scanned ${files.length} files, total ${totalSize} bytes`);

    return {
      files,
      summary,
      totalSize,
    };
  }

  /**
   * Recursively scan directory
   */
  private scanDirectory(dirPath: string, currentTotalSize: number): ProjectFile[] {
    const files: ProjectFile[] = [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip ignored patterns
        if (IGNORE_PATTERNS.some(pattern => entry.name.includes(pattern))) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = this.scanDirectory(fullPath, currentTotalSize);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          // Only include source files
          if (this.isSourceFile(entry.name)) {
            const file = this.readFile(fullPath);
            if (file && file.size <= MAX_FILE_SIZE) {
              files.push(file);
            }
          }
        }

        // Stop if we're approaching the limit
        if (currentTotalSize + files.reduce((sum, f) => sum + f.size, 0) >= MAX_TOTAL_SIZE) {
          break;
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }

    return files;
  }

  /**
   * Read a single file
   */
  private readFile(filePath: string): ProjectFile | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const projectPath = this.getProjectPath();
      const relativePath = path.relative(projectPath, filePath);

      return {
        path: relativePath,
        content,
        size: content.length,
      };
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if file is a source file we want to include
   */
  private isSourceFile(filename: string): boolean {
    const sourceExtensions = [
      '.ts', '.tsx', '.js', '.jsx',
      '.json', '.md', '.css',
    ];

    return sourceExtensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Generate a summary of the project structure
   */
  private generateSummary(files: ProjectFile[]): string {
    const filesByDir: Record<string, number> = {};

    for (const file of files) {
      const dir = path.dirname(file.path);
      filesByDir[dir] = (filesByDir[dir] || 0) + 1;
    }

    const lines = ['Project Structure:'];
    for (const [dir, count] of Object.entries(filesByDir)) {
      lines.push(`  ${dir}: ${count} files`);
    }

    return lines.join('\n');
  }

  /**
   * Format project context for AI prompt
   */
  static formatForPrompt(context: ProjectContext): string {
    const lines: string[] = [];

    lines.push('=== PROJECT CONTEXT ===');
    lines.push('');
    lines.push(context.summary);
    lines.push('');
    lines.push('=== PROJECT FILES ===');
    lines.push('');

    for (const file of context.files) {
      lines.push(`--- ${file.path} ---`);
      lines.push(file.content);
      lines.push('');
    }

    return lines.join('\n');
  }
}

// Singleton instance
export const projectScanner = new ProjectScanner();
