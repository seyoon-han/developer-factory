/**
 * External Skill Types
 * Types for the External Skills Management Layer (ESML)
 */

// External skill metadata parsed from SKILL.md frontmatter
export interface ExternalSkillMetadata {
  hasChecklist: boolean;
  hasDiagrams: boolean;
  hasExamples: boolean;
}

// External skill from database
export interface ExternalSkill {
  id: number;
  skill_name: string;
  skill_path: string;
  description: string | null;
  activation_triggers: string | null; // JSON array of trigger phrases
  skill_content: string;
  version: string | null;
  is_core: boolean;
  has_checklist: boolean;
  has_diagrams: boolean;
  has_examples: boolean;
  last_synced_at: string;
  is_active: boolean;
  source_repo: string;
}

// Parsed skill file result
export interface ParsedSkill {
  name: string;
  description: string;
  content: string;
  path: string;
  metadata: ExternalSkillMetadata;
  sections?: {
    overview?: string;
    whenToUse?: string;
    workflow?: string;
    checklist?: string[];
    examples?: string[];
  };
}

// Skill manifest (stored as JSON file)
export interface SkillManifest {
  version: string;
  lastSynced: string;
  sourceRepo: string;
  totalSkills: number;
  coreSkills: number;
  skills: ManifestSkillEntry[];
}

// Individual skill entry in manifest
export interface ManifestSkillEntry {
  name: string;
  path: string;
  description: string;
  isCore: boolean;
  metadata: ExternalSkillMetadata;
}

// Skill sync result
export interface SkillSyncResult {
  success: boolean;
  totalSkills: number;
  newSkills: number;
  updatedSkills: number;
  errors: string[];
  syncedAt: string;
}

// Core TDD skills (from superpowers repository)
export const TDD_CORE_SKILLS = [
  'test-driven-development',
  'brainstorming',
  'writing-plans',
  'verification-before-completion',
  'systematic-debugging',
  'receiving-code-review'
] as const;

export type TddCoreSkillName = typeof TDD_CORE_SKILLS[number];

// Skill execution context
export interface SkillExecutionContext {
  taskId: number;
  tddTaskId: number;
  skillName: string;
  skillContent: string;
  input: Record<string, unknown>;
  previousOutput?: string;
}

// Skill execution result
export interface SkillExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: {
    executionTime: number;
    model: string;
    tokensUsed?: number;
  };
}
