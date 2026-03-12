/**
 * External Skills Management Layer (ESML)
 * Service for loading and managing external skills from superpowers repository
 */

import fs from 'fs';
import path from 'path';
import { statements } from '@/lib/db/postgres';
import {
  ExternalSkill,
  SkillManifest,
  SkillSyncResult,
  ParsedSkill,
  TDD_CORE_SKILLS
} from '@/types/external-skill';
import {
  parseSkillFile,
  parseSkillsDirectory,
  isCoreSkill
} from './skillParser';

// Configuration
const EXTERNAL_SKILLS_DIR = process.env.EXTERNAL_SKILLS_DIR || '/app/external-skills';
const SUPERPOWERS_DIR = path.join(EXTERNAL_SKILLS_DIR, 'superpowers');
const MANIFEST_FILE = path.join(EXTERNAL_SKILLS_DIR, 'manifest.json');
const LAST_SYNC_FILE = path.join(EXTERNAL_SKILLS_DIR, 'last_sync.txt');

/**
 * External Skills Management Layer Service
 */
export class ESMLService {
  private manifestCache: SkillManifest | null = null;
  private initialized = false;

  /**
   * Initialize the ESML service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure directories exist
    if (!fs.existsSync(EXTERNAL_SKILLS_DIR)) {
      fs.mkdirSync(EXTERNAL_SKILLS_DIR, { recursive: true });
    }

    // Load manifest if it exists
    if (fs.existsSync(MANIFEST_FILE)) {
      await this.loadManifest();
    }

    this.initialized = true;
  }

  /**
   * Load manifest from file
   */
  private async loadManifest(): Promise<void> {
    try {
      const content = fs.readFileSync(MANIFEST_FILE, 'utf8');
      this.manifestCache = JSON.parse(content);
    } catch (error) {
      console.warn('Failed to load skills manifest:', error);
      this.manifestCache = null;
    }
  }

  /**
   * Get a skill by name
   */
  async getSkill(name: string): Promise<ExternalSkill | null> {
    try {
      const result = await statements.getExternalSkillByName.get(name) as ExternalSkill | undefined;
      return result || null;
    } catch (error) {
      console.error(`Error getting skill ${name}:`, error);
      return null;
    }
  }

  /**
   * Get all skills from database
   */
  async getAllSkills(): Promise<ExternalSkill[]> {
    try {
      return await statements.getAllExternalSkills.all() as ExternalSkill[];
    } catch (error) {
      console.error('Error getting all skills:', error);
      return [];
    }
  }

  /**
   * Get only active skills
   */
  async getActiveSkills(): Promise<ExternalSkill[]> {
    try {
      return await statements.getActiveExternalSkills.all() as ExternalSkill[];
    } catch (error) {
      console.error('Error getting active skills:', error);
      return [];
    }
  }

  /**
   * Get core TDD skills
   */
  async getCoreSkills(): Promise<ExternalSkill[]> {
    try {
      return await statements.getCoreExternalSkills.all() as ExternalSkill[];
    } catch (error) {
      console.error('Error getting core skills:', error);
      return [];
    }
  }

  /**
   * Check if superpowers repository exists
   */
  isRepositoryCloned(): boolean {
    return fs.existsSync(path.join(SUPERPOWERS_DIR, 'skills'));
  }

  /**
   * Get the last sync time
   */
  getLastSyncTime(): Date | null {
    try {
      if (fs.existsSync(LAST_SYNC_FILE)) {
        const content = fs.readFileSync(LAST_SYNC_FILE, 'utf8').trim();
        return new Date(content);
      }
    } catch (error) {
      console.warn('Could not read last sync time:', error);
    }
    return null;
  }

  /**
   * Get manifest from cache or file
   */
  async getManifest(): Promise<SkillManifest | null> {
    if (this.manifestCache) {
      return this.manifestCache;
    }

    if (fs.existsSync(MANIFEST_FILE)) {
      await this.loadManifest();
      return this.manifestCache;
    }

    return null;
  }

  /**
   * Sync skills from manifest file into database
   */
  async syncFromManifest(): Promise<SkillSyncResult> {
    const result: SkillSyncResult = {
      success: false,
      totalSkills: 0,
      newSkills: 0,
      updatedSkills: 0,
      errors: [],
      syncedAt: new Date().toISOString()
    };

    try {
      // Load manifest
      if (!fs.existsSync(MANIFEST_FILE)) {
        result.errors.push('Manifest file not found. Run update_external_skills.sh first.');
        return result;
      }

      const manifestContent = fs.readFileSync(MANIFEST_FILE, 'utf8');
      const manifest: SkillManifest = JSON.parse(manifestContent);
      this.manifestCache = manifest;

      // Process each skill
      for (const skillEntry of manifest.skills) {
        try {
          // Read full skill content
          const skillContent = fs.readFileSync(skillEntry.path, 'utf8');

          // Check if skill exists
          const existing = await statements.getExternalSkillByName.get(skillEntry.name) as ExternalSkill | undefined;

          // Upsert skill
          await statements.upsertExternalSkill.run(
            skillEntry.name,
            skillEntry.path,
            skillEntry.description,
            null, // activation_triggers
            skillContent,
            manifest.version,
            isCoreSkill(skillEntry.name) ? 1 : 0,
            skillEntry.metadata.hasChecklist ? 1 : 0,
            skillEntry.metadata.hasDiagrams ? 1 : 0,
            skillEntry.metadata.hasExamples ? 1 : 0
          );

          if (existing) {
            result.updatedSkills++;
          } else {
            result.newSkills++;
          }
          result.totalSkills++;
        } catch (error: any) {
          result.errors.push(`Failed to sync skill ${skillEntry.name}: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;
    } catch (error: any) {
      result.errors.push(`Sync failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Sync skills directly from repository (without manifest)
   */
  async syncFromRepository(): Promise<SkillSyncResult> {
    const result: SkillSyncResult = {
      success: false,
      totalSkills: 0,
      newSkills: 0,
      updatedSkills: 0,
      errors: [],
      syncedAt: new Date().toISOString()
    };

    try {
      const skillsPath = path.join(SUPERPOWERS_DIR, 'skills');

      if (!fs.existsSync(skillsPath)) {
        result.errors.push('Skills directory not found. Run update_external_skills.sh first.');
        return result;
      }

      // Parse all skills
      const parsedSkills = parseSkillsDirectory(skillsPath);

      // Process each skill
      for (const skill of parsedSkills) {
        try {
          const existing = await statements.getExternalSkillByName.get(skill.name) as ExternalSkill | undefined;

          await statements.upsertExternalSkill.run(
            skill.name,
            skill.path,
            skill.description,
            null,
            skill.content,
            '1.0',
            isCoreSkill(skill.name) ? 1 : 0,
            skill.metadata.hasChecklist ? 1 : 0,
            skill.metadata.hasDiagrams ? 1 : 0,
            skill.metadata.hasExamples ? 1 : 0
          );

          if (existing) {
            result.updatedSkills++;
          } else {
            result.newSkills++;
          }
          result.totalSkills++;
        } catch (error: any) {
          result.errors.push(`Failed to sync skill ${skill.name}: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;
    } catch (error: any) {
      result.errors.push(`Sync failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Get skill content for a specific skill
   */
  async getSkillContent(name: string): Promise<string | null> {
    const skill = await this.getSkill(name);
    return skill?.skill_content || null;
  }

  /**
   * Toggle skill active status
   */
  async toggleSkillActive(skillId: number): Promise<boolean> {
    try {
      await statements.toggleExternalSkillActive.run(skillId);
      return true;
    } catch (error) {
      console.error('Error toggling skill active status:', error);
      return false;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    repositoryCloned: boolean;
    manifestExists: boolean;
    lastSyncTime: string | null;
    skillsInDatabase: number;
    coreSkillsInDatabase: number;
  }> {
    const allSkills = await this.getAllSkills();
    const coreSkills = await this.getCoreSkills();
    const lastSync = this.getLastSyncTime();

    return {
      repositoryCloned: this.isRepositoryCloned(),
      manifestExists: fs.existsSync(MANIFEST_FILE),
      lastSyncTime: lastSync?.toISOString() || null,
      skillsInDatabase: allSkills.length,
      coreSkillsInDatabase: coreSkills.length
    };
  }
}

// Singleton instance
export const esmlService = new ESMLService();

export default esmlService;
