/**
 * Integration Type Definitions
 * Defines types for external integrations (GitHub, GitLab, CI/CD pipelines, webhooks)
 */

import type { TaskStatus } from './task';

/**
 * GitHub configuration for repository integration
 */
export interface GitHubConfig {
  enabled: boolean;
  owner: string;
  repo: string;
  accessToken?: string;
  webhookSecret?: string;
}

/**
 * GitLab configuration for repository integration
 */
export interface GitLabConfig {
  enabled: boolean;
  projectId: string;
  accessToken?: string;
  webhookSecret?: string;
}

/**
 * Represents a CI/CD pipeline execution
 */
export interface CIPipeline {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  url?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Represents a webhook event from external services
 */
export interface WebhookEvent {
  id: string;
  type: 'push' | 'pull_request' | 'check_suite' | 'pipeline' | 'issue';
  source: 'github' | 'gitlab' | 'jenkins';
  payload: Record<string, any>;
  taskId?: string;
  processedAt?: Date;
}

/**
 * Represents an automation rule that can trigger actions based on events
 */
export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: 'ci_success' | 'ci_failure' | 'pr_merged' | 'issue_closed';
  action: 'move_task' | 'add_comment' | 'update_status';
  targetStatus?: TaskStatus;
  message?: string;
}

/**
 * Configuration for multiple integrations
 */
export interface IntegrationConfig {
  github?: GitHubConfig;
  gitlab?: GitLabConfig;
  jenkins?: {
    enabled: boolean;
    baseUrl: string;
    accessToken?: string;
  };
  slack?: {
    enabled: boolean;
    webhookUrl?: string;
    botToken?: string;
  };
}

/**
 * Webhook event type constants
 */
export const WEBHOOK_EVENT_TYPES = {
  PUSH: 'push',
  PULL_REQUEST: 'pull_request',
  CHECK_SUITE: 'check_suite',
  PIPELINE: 'pipeline',
  ISSUE: 'issue',
} as const;

export type WebhookEventType = typeof WEBHOOK_EVENT_TYPES[keyof typeof WEBHOOK_EVENT_TYPES];

/**
 * Webhook source constants
 */
export const WEBHOOK_SOURCES = {
  GITHUB: 'github',
  GITLAB: 'gitlab',
  JENKINS: 'jenkins',
} as const;

export type WebhookSource = typeof WEBHOOK_SOURCES[keyof typeof WEBHOOK_SOURCES];

/**
 * Automation trigger constants
 */
export const AUTOMATION_TRIGGERS = {
  CI_SUCCESS: 'ci_success',
  CI_FAILURE: 'ci_failure',
  PR_MERGED: 'pr_merged',
  ISSUE_CLOSED: 'issue_closed',
} as const;

export type AutomationTrigger = typeof AUTOMATION_TRIGGERS[keyof typeof AUTOMATION_TRIGGERS];

/**
 * Automation action constants
 */
export const AUTOMATION_ACTIONS = {
  MOVE_TASK: 'move_task',
  ADD_COMMENT: 'add_comment',
  UPDATE_STATUS: 'update_status',
} as const;

export type AutomationAction = typeof AUTOMATION_ACTIONS[keyof typeof AUTOMATION_ACTIONS];

/**
 * CI Pipeline status constants
 */
export const CI_PIPELINE_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

export type CIPipelineStatus = typeof CI_PIPELINE_STATUS[keyof typeof CI_PIPELINE_STATUS];

/**
 * Type guard to check if a string is a valid webhook event type
 */
export const isValidWebhookEventType = (value: string): value is WebhookEventType => {
  return Object.values(WEBHOOK_EVENT_TYPES).includes(value as WebhookEventType);
};

/**
 * Type guard to check if a string is a valid webhook source
 */
export const isValidWebhookSource = (value: string): value is WebhookSource => {
  return Object.values(WEBHOOK_SOURCES).includes(value as WebhookSource);
};

/**
 * Type guard to check if a string is a valid automation trigger
 */
export const isValidAutomationTrigger = (value: string): value is AutomationTrigger => {
  return Object.values(AUTOMATION_TRIGGERS).includes(value as AutomationTrigger);
};

/**
 * Type guard to check if a string is a valid automation action
 */
export const isValidAutomationAction = (value: string): value is AutomationAction => {
  return Object.values(AUTOMATION_ACTIONS).includes(value as AutomationAction);
};

/**
 * Type guard to check if a string is a valid CI pipeline status
 */
export const isValidCIPipelineStatus = (value: string): value is CIPipelineStatus => {
  return Object.values(CI_PIPELINE_STATUS).includes(value as CIPipelineStatus);
};
