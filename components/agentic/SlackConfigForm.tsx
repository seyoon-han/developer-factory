'use client';

/**
 * SlackConfigForm Component
 * Configuration form for Slack webhook notifications per project group
 * Follows TDD - implemented to pass the test suite
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SlackConfig {
  id?: number;
  projectGroupId: number;
  webhookUrl: string;
  notifyPhaseChanges: boolean;
  notifyUserAction: boolean;
  notifyCompletion: boolean;
  notifyErrors: boolean;
  includeTokenUsage: boolean;
  isActive: boolean;
}

interface ProjectGroup {
  id: number;
  name: string;
}

interface SlackConfigFormProps {
  config: SlackConfig | null;
  projectGroups: ProjectGroup[];
  selectedGroupId?: number;
  onSave: (config: SlackConfig) => void;
  onTest: (webhookUrl: string) => void;
  onDelete: (configId: number) => void;
  isSaving?: boolean;
  isTesting?: boolean;
  className?: string;
}

const SLACK_WEBHOOK_PATTERN = /^https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+$/;

export function SlackConfigForm({
  config,
  projectGroups,
  selectedGroupId,
  onSave,
  onTest,
  onDelete,
  isSaving = false,
  isTesting = false,
  className,
}: SlackConfigFormProps) {
  const [formData, setFormData] = useState<SlackConfig>({
    projectGroupId: selectedGroupId || config?.projectGroupId || projectGroups[0]?.id || 0,
    webhookUrl: config?.webhookUrl || '',
    notifyPhaseChanges: config?.notifyPhaseChanges ?? true,
    notifyUserAction: config?.notifyUserAction ?? true,
    notifyCompletion: config?.notifyCompletion ?? true,
    notifyErrors: config?.notifyErrors ?? true,
    includeTokenUsage: config?.includeTokenUsage ?? false,
    isActive: config?.isActive ?? true,
  });

  const [error, setError] = useState<string | null>(null);

  // Update form when config changes
  useEffect(() => {
    if (config) {
      setFormData({
        projectGroupId: config.projectGroupId,
        webhookUrl: config.webhookUrl,
        notifyPhaseChanges: config.notifyPhaseChanges,
        notifyUserAction: config.notifyUserAction,
        notifyCompletion: config.notifyCompletion,
        notifyErrors: config.notifyErrors,
        includeTokenUsage: config.includeTokenUsage,
        isActive: config.isActive,
      });
    }
  }, [config]);

  const handleChange = (field: keyof SlackConfig, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSave = () => {
    // Validate webhook URL
    if (formData.webhookUrl && !SLACK_WEBHOOK_PATTERN.test(formData.webhookUrl)) {
      setError('Invalid webhook URL. Must be a valid Slack webhook URL.');
      return;
    }

    onSave({
      ...formData,
      id: config?.id,
    });
  };

  const handleTest = () => {
    onTest(formData.webhookUrl);
  };

  const handleDelete = () => {
    if (config?.id && window.confirm('Delete this Slack configuration?')) {
      onDelete(config.id);
    }
  };

  return (
    <div
      data-testid="slack-config-form"
      className={cn('space-y-6 font-mono', className)}
    >
      {/* Project Group Selector */}
      <div className="space-y-2">
        <label
          htmlFor="project-group"
          className="block text-xs font-bold text-[hsl(var(--foreground))] uppercase"
        >
          Project Group
        </label>
        <select
          id="project-group"
          aria-label="Project Group"
          value={formData.projectGroupId}
          onChange={(e) => handleChange('projectGroupId', parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-[2px] text-xs focus:outline-none focus:border-[hsl(var(--primary))]"
        >
          {projectGroups.map(group => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      {/* Webhook URL */}
      <div className="space-y-2">
        <label
          htmlFor="webhook-url"
          className="block text-xs font-bold text-[hsl(var(--foreground))] uppercase"
        >
          Webhook URL
        </label>
        <div className="flex gap-2">
          <input
            id="webhook-url"
            aria-label="Webhook URL"
            type="text"
            value={formData.webhookUrl}
            onChange={(e) => handleChange('webhookUrl', e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-[2px] text-xs focus:outline-none focus:border-[hsl(var(--primary))]"
          />
          <button
            data-testid="test-webhook-button"
            onClick={handleTest}
            disabled={!formData.webhookUrl || isTesting}
            className="px-3 py-2 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] rounded-[2px] text-[10px] uppercase hover:bg-[hsl(var(--primary))]/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? 'Testing...' : 'Test'}
          </button>
        </div>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
          Get your webhook URL from Slack App Settings → Incoming Webhooks
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-2 bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/30 rounded-[2px]">
          <span className="text-[10px] text-[hsl(var(--destructive))]">{error}</span>
        </div>
      )}

      {/* Notification Toggles */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-[hsl(var(--foreground))] uppercase">
          Notification Triggers
        </div>

        <Toggle
          id="notify-phase-changes"
          label="Phase Changes"
          description="Notify when task moves to a new phase"
          checked={formData.notifyPhaseChanges}
          onChange={(checked) => handleChange('notifyPhaseChanges', checked)}
        />

        <Toggle
          id="notify-user-action"
          label="User Action Required"
          description="Notify when user input is needed (clarifications, approvals)"
          checked={formData.notifyUserAction}
          onChange={(checked) => handleChange('notifyUserAction', checked)}
        />

        <Toggle
          id="notify-completion"
          label="Completion"
          description="Notify when task completes or PRs are merged"
          checked={formData.notifyCompletion}
          onChange={(checked) => handleChange('notifyCompletion', checked)}
        />

        <Toggle
          id="notify-errors"
          label="Errors"
          description="Notify when task encounters errors"
          checked={formData.notifyErrors}
          onChange={(checked) => handleChange('notifyErrors', checked)}
        />

        <Toggle
          id="include-token-usage"
          label="Token Usage"
          description="Include token consumption in notifications"
          checked={formData.includeTokenUsage}
          onChange={(checked) => handleChange('includeTokenUsage', checked)}
        />
      </div>

      {/* Active Toggle */}
      <div className="pt-3 border-t border-[hsl(var(--border))]">
        <Toggle
          id="is-active"
          label="Active"
          description="Enable or disable notifications for this configuration"
          checked={formData.isActive}
          onChange={(checked) => handleChange('isActive', checked)}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-[hsl(var(--border))]">
        {config?.id ? (
          <button
            data-testid="delete-config-button"
            onClick={handleDelete}
            className="px-3 py-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 rounded-[2px] text-[10px] uppercase"
          >
            Delete Configuration
          </button>
        ) : (
          <div />
        )}

        <button
          data-testid="save-config-button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-[hsl(var(--primary))] text-black font-bold rounded-[2px] text-xs uppercase hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

// Toggle Component
interface ToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ id, label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <label
          htmlFor={id}
          className="text-xs text-[hsl(var(--foreground))] cursor-pointer"
        >
          {label}
        </label>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors',
          checked ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}

export default SlackConfigForm;

