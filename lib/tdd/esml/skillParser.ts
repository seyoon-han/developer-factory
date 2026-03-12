/**
 * Skill Parser
 * Parses SKILL.md files from the superpowers repository
 */

import fs from 'fs';
import path from 'path';
import {
  ParsedSkill,
  ExternalSkillMetadata,
  TDD_CORE_SKILLS,
  TddCoreSkillName
} from '@/types/external-skill';

/**
 * Parse YAML frontmatter from skill content
 */
export function parseYamlFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter: Record<string, string> = {};
  const lines = match[1].split('\n');
  let currentKey: string | null = null;
  let currentValue = '';

  for (const line of lines) {
    const keyMatch = line.match(/^(\w+):\s*(.*)$/);
    if (keyMatch) {
      if (currentKey) {
        frontmatter[currentKey] = currentValue.trim();
      }
      currentKey = keyMatch[1];
      currentValue = keyMatch[2];
    } else if (currentKey && line.startsWith('  ')) {
      // Continuation of previous value (multiline)
      currentValue += ' ' + line.trim();
    }
  }

  if (currentKey) {
    frontmatter[currentKey] = currentValue.trim();
  }

  return frontmatter;
}

/**
 * Extract metadata from skill content
 */
export function extractSkillMetadata(content: string): ExternalSkillMetadata {
  return {
    hasChecklist:
      content.includes('## Checklist') ||
      content.includes('## Verification') ||
      content.includes('- [ ]') ||
      content.includes('☐'),
    hasDiagrams:
      content.includes('```dot') ||
      content.includes('```mermaid') ||
      content.includes('digraph') ||
      content.includes('graph '),
    hasExamples:
      content.includes('<example>') ||
      content.includes('## Example') ||
      content.includes('### Example') ||
      content.includes('<Good>') ||
      content.includes('<Bad>')
  };
}

/**
 * Extract major sections from skill content
 */
export function extractSkillSections(content: string): ParsedSkill['sections'] {
  const sections: ParsedSkill['sections'] = {};

  // Extract overview (content between frontmatter and first heading)
  const overviewMatch = content.match(/---\n[\s\S]*?\n---\n\n([\s\S]*?)(?=\n#)/);
  if (overviewMatch) {
    sections.overview = overviewMatch[1].trim();
  }

  // Extract "When to Use" section
  const whenToUseMatch = content.match(
    /##?\s*(?:When to Use|When NOT to Use)[\s\S]*?(?=\n##?\s|$)/i
  );
  if (whenToUseMatch) {
    sections.whenToUse = whenToUseMatch[0].trim();
  }

  // Extract workflow/process section
  const workflowMatch = content.match(
    /##?\s*(?:Workflow|Process|The .*? Cycle|Red-Green-Refactor)[\s\S]*?(?=\n##?\s[^#]|$)/i
  );
  if (workflowMatch) {
    sections.workflow = workflowMatch[0].trim();
  }

  // Extract checklist items
  const checklistItems: string[] = [];
  const checklistMatch = content.match(
    /##?\s*(?:Checklist|Verification|Requirements)[\s\S]*?(?=\n##?\s|$)/i
  );
  if (checklistMatch) {
    const itemMatches = checklistMatch[0].matchAll(/[-*]\s*\[[ x]\]\s*(.+)/g);
    for (const match of itemMatches) {
      checklistItems.push(match[1].trim());
    }
  }
  if (checklistItems.length > 0) {
    sections.checklist = checklistItems;
  }

  // Extract examples
  const examples: string[] = [];
  const exampleMatches = content.matchAll(/<example>([\s\S]*?)<\/example>/g);
  for (const match of exampleMatches) {
    examples.push(match[1].trim());
  }
  if (examples.length > 0) {
    sections.examples = examples;
  }

  return sections;
}

/**
 * Check if a skill name is a core TDD skill
 */
export function isCoreSkill(skillName: string): boolean {
  return TDD_CORE_SKILLS.includes(skillName as TddCoreSkillName);
}

/**
 * Parse a single skill file
 */
export function parseSkillFile(filePath: string): ParsedSkill {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Skill file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const frontmatter = parseYamlFrontmatter(content);
  const skillDir = path.basename(path.dirname(filePath));

  const name = frontmatter.name || skillDir;
  const description = frontmatter.description || '';
  const metadata = extractSkillMetadata(content);
  const sections = extractSkillSections(content);

  return {
    name,
    description,
    content,
    path: filePath,
    metadata,
    sections
  };
}

/**
 * Parse all skills from a directory
 */
export function parseSkillsDirectory(skillsPath: string): ParsedSkill[] {
  if (!fs.existsSync(skillsPath)) {
    throw new Error(`Skills directory not found: ${skillsPath}`);
  }

  const skills: ParsedSkill[] = [];
  const dirs = fs.readdirSync(skillsPath);

  for (const dir of dirs) {
    const skillFilePath = path.join(skillsPath, dir, 'SKILL.md');
    if (fs.existsSync(skillFilePath)) {
      try {
        const skill = parseSkillFile(skillFilePath);
        skills.push(skill);
      } catch (error) {
        console.warn(`Failed to parse skill ${dir}:`, error);
      }
    }
  }

  // Sort by name
  skills.sort((a, b) => a.name.localeCompare(b.name));

  return skills;
}

/**
 * Extract RED phase instructions from TDD skill
 */
export function extractRedPhaseInstructions(tddSkillContent: string): string {
  const redMatch = tddSkillContent.match(
    /##?\s*(?:RED|Red Phase|Write Failing Test)[\s\S]*?(?=##?\s*(?:GREEN|Green Phase|Verify RED)|$)/i
  );
  if (redMatch) {
    return redMatch[0].trim();
  }

  // Fallback: extract from The Iron Law and workflow
  const fallbackMatch = tddSkillContent.match(
    /##?\s*(?:The Iron Law|Iron Law)[\s\S]*?(?=##?\s*(?:GREEN|Verify)|$)/i
  );
  return fallbackMatch ? fallbackMatch[0].trim() : '';
}

/**
 * Extract GREEN phase instructions from TDD skill
 */
export function extractGreenPhaseInstructions(tddSkillContent: string): string {
  const greenMatch = tddSkillContent.match(
    /##?\s*(?:GREEN|Green Phase|Write Implementation)[\s\S]*?(?=##?\s*(?:REFACTOR|Refactor Phase|Verify GREEN)|$)/i
  );
  if (greenMatch) {
    return greenMatch[0].trim();
  }
  return '';
}

/**
 * Extract REFACTOR phase instructions from TDD skill
 */
export function extractRefactorPhaseInstructions(tddSkillContent: string): string {
  const refactorMatch = tddSkillContent.match(
    /##?\s*(?:REFACTOR|Refactor Phase)[\s\S]*?(?=##?\s*(?:Repeat|Reference|Verification|$))/i
  );
  if (refactorMatch) {
    return refactorMatch[0].trim();
  }
  return '';
}

export default {
  parseYamlFrontmatter,
  extractSkillMetadata,
  extractSkillSections,
  parseSkillFile,
  parseSkillsDirectory,
  isCoreSkill,
  extractRedPhaseInstructions,
  extractGreenPhaseInstructions,
  extractRefactorPhaseInstructions
};
