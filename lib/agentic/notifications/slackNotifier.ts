/**
 * Slack Notifier
 * Sends notifications to Slack channels for task events
 */

import { statements } from '@/lib/db/postgres';

export interface SlackConfig {
  id: number;
  projectGroupId: number;
  webhookUrl: string;
  notifyPhaseChanges: boolean;
  notifyUserAction: boolean;
  notifyCompletion: boolean;
  notifyErrors: boolean;
  includeTokenUsage: boolean;
  isActive: boolean;
}

export interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: any[];
  fields?: { type: string; text: string }[];
  accessory?: any;
}

interface SlackAttachment {
  color?: string;
  title?: string;
  text?: string;
  fields?: { title: string; value: string; short?: boolean }[];
  footer?: string;
  ts?: number;
}

export class SlackNotifier {
  /**
   * Get Slack config for a project group
   */
  async getConfig(projectGroupId: number): Promise<SlackConfig | null> {
    const row = await statements.getSlackConfigByGroup.get(projectGroupId) as any;
    if (!row) return null;

    return {
      id: row.id,
      projectGroupId: row.project_group_id,
      webhookUrl: row.webhook_url,
      notifyPhaseChanges: !!row.notify_phase_changes,
      notifyUserAction: !!row.notify_user_action,
      notifyCompletion: !!row.notify_completion,
      notifyErrors: !!row.notify_errors,
      includeTokenUsage: !!row.include_token_usage,
      isActive: !!row.is_active,
    };
  }

  /**
   * Save or update Slack config
   */
  async saveConfig(config: Omit<SlackConfig, 'id'>): Promise<SlackConfig> {
    // Check if config exists for this group
    const existing = await statements.getSlackConfigByGroup.get(config.projectGroupId) as any;

    if (existing) {
      await statements.updateSlackConfig.run(
        config.webhookUrl,
        config.notifyPhaseChanges ? 1 : 0,
        config.notifyUserAction ? 1 : 0,
        config.notifyCompletion ? 1 : 0,
        config.notifyErrors ? 1 : 0,
        config.includeTokenUsage ? 1 : 0,
        config.isActive ? 1 : 0,
        existing.id
      );
      return { id: existing.id, ...config };
    }

    const result = await statements.createSlackConfig.run(
      config.projectGroupId,
      config.webhookUrl,
      config.notifyPhaseChanges ? 1 : 0,
      config.notifyUserAction ? 1 : 0,
      config.notifyCompletion ? 1 : 0,
      config.notifyErrors ? 1 : 0,
      config.includeTokenUsage ? 1 : 0
    );

    return {
      id: Number(result.lastInsertRowid),
      ...config,
    };
  }

  /**
   * Delete Slack config
   */
  async deleteConfig(configId: number): Promise<void> {
    await statements.deleteSlackConfig.run(configId);
  }

  /**
   * Send a message to Slack
   */
  async sendMessage(
    webhookUrl: string,
    message: SlackMessage
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: `Slack API error: ${response.status} - ${text}` };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Notify task started
   */
  async notifyTaskStarted(
    projectGroupId: number,
    taskId: number,
    taskTitle: string
  ): Promise<void> {
    const config = await this.getConfig(projectGroupId);
    if (!config || !config.isActive || !config.notifyPhaseChanges) return;

    const message: SlackMessage = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚀 Task Started', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Task:*\n#${taskId} ${taskTitle}` },
            { type: 'mrkdwn', text: `*Status:*\nIn Progress` },
          ],
        },
      ],
    };

    await this.sendMessage(config.webhookUrl, message);
  }

  /**
   * Notify task completed
   */
  async notifyTaskCompleted(
    projectGroupId: number,
    taskId: number,
    taskTitle: string,
    stats?: { stepsCompleted: number; totalSteps: number; executionTime: number }
  ): Promise<void> {
    const config = await this.getConfig(projectGroupId);
    if (!config || !config.isActive || !config.notifyCompletion) return;

    const fields = [
      { type: 'mrkdwn', text: `*Task:*\n#${taskId} ${taskTitle}` },
      { type: 'mrkdwn', text: `*Status:*\n✅ Complete` },
    ];

    if (stats) {
      fields.push({
        type: 'mrkdwn',
        text: `*Steps:*\n${stats.stepsCompleted}/${stats.totalSteps}`,
      });
      fields.push({
        type: 'mrkdwn',
        text: `*Duration:*\n${this.formatDuration(stats.executionTime)}`,
      });
    }

    const message: SlackMessage = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '✅ Task Completed', emoji: true },
        },
        {
          type: 'section',
          fields,
        },
      ],
    };

    await this.sendMessage(config.webhookUrl, message);
  }

  /**
   * Notify task error
   */
  async notifyTaskError(
    projectGroupId: number,
    taskId: number,
    taskTitle: string,
    error: string,
    phase: string
  ): Promise<void> {
    const config = await this.getConfig(projectGroupId);
    if (!config || !config.isActive || !config.notifyErrors) return;

    const message: SlackMessage = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '❌ Task Error', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Task:*\n#${taskId} ${taskTitle}` },
            { type: 'mrkdwn', text: `*Phase:*\n${phase}` },
          ],
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Error:*\n\`\`\`${error.slice(0, 500)}\`\`\`` },
        },
      ],
    };

    await this.sendMessage(config.webhookUrl, message);
  }

  /**
   * Notify PR created
   */
  async notifyPRCreated(
    projectGroupId: number,
    taskId: number,
    taskTitle: string,
    prUrls: { repoName: string; url: string }[]
  ): Promise<void> {
    const config = await this.getConfig(projectGroupId);
    if (!config || !config.isActive || !config.notifyPhaseChanges) return;

    const prLinks = prUrls
      .map(pr => `• <${pr.url}|${pr.repoName}>`)
      .join('\n');

    const message: SlackMessage = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🔀 Pull Request Created', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Task:*\n#${taskId} ${taskTitle}` },
            { type: 'mrkdwn', text: `*PRs:*\n${prUrls.length}` },
          ],
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Pull Requests:*\n${prLinks}` },
        },
      ],
    };

    await this.sendMessage(config.webhookUrl, message);
  }

  /**
   * Notify PRs merged
   */
  async notifyPRsMerged(
    projectGroupId: number,
    taskId: number,
    taskTitle: string,
    mergedCount: number
  ): Promise<void> {
    const config = await this.getConfig(projectGroupId);
    if (!config || !config.isActive || !config.notifyCompletion) return;

    const message: SlackMessage = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🎉 Pull Requests Merged', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Task:*\n#${taskId} ${taskTitle}` },
            { type: 'mrkdwn', text: `*Merged:*\n${mergedCount} PR(s)` },
          ],
        },
      ],
    };

    await this.sendMessage(config.webhookUrl, message);
  }

  /**
   * Send custom notification
   */
  async sendCustomNotification(
    projectGroupId: number,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    const config = await this.getConfig(projectGroupId);
    if (!config || !config.isActive) return;

    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    }[type];

    const color = {
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
    }[type];

    const slackMessage: SlackMessage = {
      attachments: [
        {
          color,
          title: `${emoji} ${title}`,
          text: message,
          footer: 'Agentic Dev Workflow',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    await this.sendMessage(config.webhookUrl, slackMessage);
  }

  /**
   * Format duration in human readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Test Slack webhook connection
   */
  async testWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
    const message: SlackMessage = {
      text: '🔔 Test notification from Agentic Dev Workflow - Connection successful!',
    };

    return this.sendMessage(webhookUrl, message);
  }
}

// Singleton instance
export const slackNotifier = new SlackNotifier();
export default slackNotifier;
