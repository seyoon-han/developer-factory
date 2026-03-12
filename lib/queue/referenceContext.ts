/**
 * Reference Context Builder
 * Fetches implementation reports from referenced tasks
 */

import { statements } from '@/lib/db/postgres';

export interface ReferencedTask {
  id: number;
  title: string;
  implementationReport?: string;
}

export class ReferenceContextBuilder {
  /**
   * Get implementation reports from referenced tasks
   */
  async getReferencedReports(task: any): Promise<string> {
    if (!task.reference_task_ids) {
      return '';
    }

    try {
      const referenceIds: number[] = JSON.parse(task.reference_task_ids);
      
      if (!referenceIds || referenceIds.length === 0) {
        return '';
      }

      console.log(`📚 Loading ${referenceIds.length} referenced task(s): ${referenceIds.join(', ')}`);

      const referencedReports: string[] = [];

      for (const refId of referenceIds) {
        const refTask = await statements.getTask.get(refId) as any;
        if (!refTask) {
          console.warn(`⚠️  Referenced task #${refId} not found`);
          continue;
        }

        const refImpl = await statements.getImplementation.get(refId) as any;
        if (refImpl && refImpl.implementation_report) {
          referencedReports.push(`
## Referenced Task #${refId}: ${refTask.title}

${refImpl.implementation_report}

---
`);
          console.log(`✅ Loaded implementation report from task #${refId}`);
        } else {
          console.warn(`⚠️  Task #${refId} has no implementation report`);
          referencedReports.push(`
## Referenced Task #${refId}: ${refTask.title}

**Description:** ${refTask.description || 'No description'}

_Note: This task has no implementation report yet._

---
`);
        }
      }

      if (referencedReports.length === 0) {
        return '';
      }

      return `
# 📚 Referenced Tasks Context

The following tasks are referenced for context:

${referencedReports.join('\n')}
`;
    } catch (error) {
      console.error('Error loading referenced reports:', error);
      return '';
    }
  }

  /**
   * Get summary of referenced tasks (for display)
   */
  async getReferencedTasksSummary(task: any): Promise<ReferencedTask[]> {
    if (!task.reference_task_ids) {
      return [];
    }

    try {
      const referenceIds: number[] = JSON.parse(task.reference_task_ids);

      const results = await Promise.all(referenceIds.map(async refId => {
        const refTask = await statements.getTask.get(refId) as any;
        const refImpl = await statements.getImplementation.get(refId) as any;

        return {
          id: refId,
          title: refTask?.title || 'Unknown Task',
          implementationReport: refImpl?.implementation_report,
        };
      }));

      return results.filter(t => t.title !== 'Unknown Task');
    } catch (error) {
      return [];
    }
  }
}

// Singleton instance
export const referenceContextBuilder = new ReferenceContextBuilder();

