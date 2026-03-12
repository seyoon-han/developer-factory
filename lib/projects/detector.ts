/**
 * Framework Detection System
 * Automatically detects project type, framework, language, and package manager
 */

import fs from 'fs';
import path from 'path';

export interface ProjectDetectionResult {
  framework: string;
  language: string;
  packageManager: string;
}

export class FrameworkDetector {
  /**
   * Detect project framework and configuration
   */
  async detectProject(projectPath: string): Promise<ProjectDetectionResult> {
    console.log(`🔍 Detecting project type at ${projectPath}`);
    
    let framework = 'unknown';
    let language = 'unknown';
    let packageManager = 'npm';
    
    try {
      // Detect JavaScript/TypeScript projects
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const result = await this.detectNodeProject(packageJsonPath, projectPath);
        framework = result.framework;
        language = result.language;
        packageManager = result.packageManager;
      }
      
      // Detect Python projects
      else if (this.isPythonProject(projectPath)) {
        language = 'python';
        framework = this.detectPythonFramework(projectPath);
        packageManager = 'pip';
      }
      
      // Detect Go projects
      else if (fs.existsSync(path.join(projectPath, 'go.mod'))) {
        language = 'go';
        framework = 'go';
        packageManager = 'go';
      }
      
      // Detect Rust projects
      else if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
        language = 'rust';
        framework = 'rust';
        packageManager = 'cargo';
      }
      
      // Detect Java projects
      else if (this.isJavaProject(projectPath)) {
        language = 'java';
        framework = this.detectJavaFramework(projectPath);
        packageManager = this.detectJavaBuildTool(projectPath);
      }
      
      console.log(`✅ Detected: ${framework} (${language}) using ${packageManager}`);
      
      return { framework, language, packageManager };
      
    } catch (error: any) {
      console.error('❌ Error detecting project:', error);
      return { framework: 'unknown', language: 'unknown', packageManager: 'npm' };
    }
  }

  /**
   * Detect Node.js/JavaScript/TypeScript project
   */
  private async detectNodeProject(packageJsonPath: string, projectPath: string) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    let framework = 'unknown';
    let language = 'javascript';
    let packageManager = 'npm';
    
    // Detect framework from dependencies
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.next) {
      framework = 'nextjs';
    } else if (deps['@remix-run/react']) {
      framework = 'remix';
    } else if (deps.gatsby) {
      framework = 'gatsby';
    } else if (deps.react && deps['react-scripts']) {
      framework = 'create-react-app';
    } else if (deps.react) {
      framework = 'react';
    } else if (deps.vue) {
      framework = 'vue';
    } else if (deps.svelte) {
      framework = 'svelte';
    } else if (deps.express) {
      framework = 'express';
    } else if (deps.fastify) {
      framework = 'fastify';
    } else if (deps.nestjs) {
      framework = 'nestjs';
    } else if (packageJson.name) {
      framework = 'nodejs';
    }
    
    // Detect language
    if (deps.typescript || fs.existsSync(path.join(projectPath, 'tsconfig.json'))) {
      language = 'typescript';
    }
    
    // Detect package manager
    if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) {
      packageManager = 'pnpm';
    } else if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) {
      packageManager = 'yarn';
    } else if (fs.existsSync(path.join(projectPath, 'bun.lockb'))) {
      packageManager = 'bun';
    }
    
    return { framework, language, packageManager };
  }

  /**
   * Check if project is Python
   */
  private isPythonProject(projectPath: string): boolean {
    return fs.existsSync(path.join(projectPath, 'requirements.txt')) ||
           fs.existsSync(path.join(projectPath, 'setup.py')) ||
           fs.existsSync(path.join(projectPath, 'pyproject.toml')) ||
           fs.existsSync(path.join(projectPath, 'Pipfile'));
  }

  /**
   * Detect Python framework
   */
  private detectPythonFramework(projectPath: string): string {
    // Check for common Python frameworks
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    
    if (fs.existsSync(requirementsPath)) {
      const requirements = fs.readFileSync(requirementsPath, 'utf-8').toLowerCase();
      
      if (requirements.includes('django')) return 'django';
      if (requirements.includes('flask')) return 'flask';
      if (requirements.includes('fastapi')) return 'fastapi';
    }
    
    // Check pyproject.toml
    const pyprojectPath = path.join(projectPath, 'pyproject.toml');
    if (fs.existsSync(pyprojectPath)) {
      const pyproject = fs.readFileSync(pyprojectPath, 'utf-8').toLowerCase();
      
      if (pyproject.includes('django')) return 'django';
      if (pyproject.includes('flask')) return 'flask';
      if (pyproject.includes('fastapi')) return 'fastapi';
    }
    
    return 'python';
  }

  /**
   * Check if project is Java
   */
  private isJavaProject(projectPath: string): boolean {
    return fs.existsSync(path.join(projectPath, 'pom.xml')) ||
           fs.existsSync(path.join(projectPath, 'build.gradle')) ||
           fs.existsSync(path.join(projectPath, 'build.gradle.kts'));
  }

  /**
   * Detect Java framework
   */
  private detectJavaFramework(projectPath: string): string {
    const pomPath = path.join(projectPath, 'pom.xml');
    
    if (fs.existsSync(pomPath)) {
      const pom = fs.readFileSync(pomPath, 'utf-8').toLowerCase();
      
      if (pom.includes('spring-boot')) return 'spring-boot';
      if (pom.includes('quarkus')) return 'quarkus';
      if (pom.includes('micronaut')) return 'micronaut';
    }
    
    return 'java';
  }

  /**
   * Detect Java build tool
   */
  private detectJavaBuildTool(projectPath: string): string {
    if (fs.existsSync(path.join(projectPath, 'pom.xml'))) {
      return 'maven';
    }
    if (fs.existsSync(path.join(projectPath, 'build.gradle')) ||
        fs.existsSync(path.join(projectPath, 'build.gradle.kts'))) {
      return 'gradle';
    }
    return 'maven';
  }
}

// Singleton export
export const frameworkDetector = new FrameworkDetector();


