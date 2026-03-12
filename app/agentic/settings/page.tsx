'use client';

/**
 * Agentic Settings Page
 * Configure project groups, global documents, and other settings
 */

import React, { useState, useEffect } from 'react';
import { ProjectGroupSettings, GlobalDocuments } from '@/components/agentic';
import { SlackConfigForm, SlackConfig } from '@/components/agentic/SlackConfigForm';
import { useAgenticStore } from '@/lib/store/agenticStore';
import { cn } from '@/lib/utils/cn';

type TabId = 'project-groups' | 'documents' | 'queue' | 'integrations';

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'project-groups', label: 'Project Groups', icon: '📁' },
  { id: 'documents', label: 'Global Documents', icon: '📄' },
  { id: 'queue', label: 'Queue Settings', icon: '⚙️' },
  { id: 'integrations', label: 'Integrations', icon: '🔗' },
];

export default function AgenticSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('project-groups');

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/agentic"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              ← Back to Board
            </a>
            <h1 className="text-xl font-bold text-[var(--foreground)]">
              Agentic Settings
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-[var(--border)] mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative',
                activeTab === tab.id
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              )}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'project-groups' && <ProjectGroupSettings />}
          {activeTab === 'documents' && <GlobalDocuments />}
          {activeTab === 'queue' && <QueueSettings />}
          {activeTab === 'integrations' && <IntegrationSettings />}
        </div>
      </div>
    </div>
  );
}

// Queue Settings
function QueueSettings() {
  const [settings, setSettings] = useState({
    maxConcurrent: 1,
    autoStart: false,
    pauseOnError: true,
    retryAttempts: 3,
    retryDelayMs: 5000,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to API
      await fetch('/api/agentic/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Queue Settings</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Configure how tasks are processed in the queue
        </p>
      </div>

      <div className="grid gap-6 max-w-md">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
            Max Concurrent Tasks
          </label>
          <input
            type="number"
            min={1}
            max={5}
            value={settings.maxConcurrent}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, maxConcurrent: parseInt(e.target.value, 10) }))
            }
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md"
          />
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Number of tasks that can run simultaneously (1-5)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="autoStart"
            checked={settings.autoStart}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, autoStart: e.target.checked }))
            }
            className="w-4 h-4"
          />
          <label htmlFor="autoStart" className="text-sm text-[var(--foreground)]">
            Auto-start queue when tasks are added
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="pauseOnError"
            checked={settings.pauseOnError}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, pauseOnError: e.target.checked }))
            }
            className="w-4 h-4"
          />
          <label htmlFor="pauseOnError" className="text-sm text-[var(--foreground)]">
            Pause queue on task failure
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
            Retry Attempts
          </label>
          <input
            type="number"
            min={0}
            max={10}
            value={settings.retryAttempts}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, retryAttempts: parseInt(e.target.value, 10) }))
            }
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
            Retry Delay (ms)
          </label>
          <input
            type="number"
            min={1000}
            max={60000}
            step={1000}
            value={settings.retryDelayMs}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, retryDelayMs: parseInt(e.target.value, 10) }))
            }
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-md text-sm transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

// Integration Settings
function IntegrationSettings() {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [confluenceUrl, setConfluenceUrl] = useState('');
  const [confluenceToken, setConfluenceToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [slackConfig, setSlackConfig] = useState<SlackConfig | null>(null);
  const [isSavingSlack, setIsSavingSlack] = useState(false);
  const [isTestingSlack, setIsTestingSlack] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const projectGroups = useAgenticStore((s) => s.projectGroups);
  const fetchProjectGroups = useAgenticStore((s) => s.fetchProjectGroups);

  useEffect(() => {
    fetchProjectGroups();
  }, [fetchProjectGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchSlackConfig(selectedGroupId);
    }
  }, [selectedGroupId]);

  const fetchSlackConfig = async (groupId: number) => {
    try {
      const res = await fetch(`/api/agentic/slack-config/${groupId}`);
      const data = await res.json();
      if (data.success && data.config) {
        setSlackConfig(data.config);
      } else {
        setSlackConfig(null);
      }
    } catch (e) {
      console.error('Failed to fetch Slack config:', e);
      setSlackConfig(null);
    }
  };

  const handleSaveSlack = async (config: SlackConfig) => {
    setIsSavingSlack(true);
    try {
      const res = await fetch('/api/agentic/slack-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSlackConfig(data.config);
        setTestResult({ success: true, message: 'Configuration saved!' });
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to save' });
      }
    } catch (e) {
      setTestResult({ success: false, message: 'Failed to save configuration' });
    } finally {
      setIsSavingSlack(false);
    }
  };

  const handleTestSlack = async (webhookUrl: string) => {
    setIsTestingSlack(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/agentic/slack-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: 'Test notification sent!' });
      } else {
        setTestResult({ success: false, message: data.error || 'Test failed' });
      }
    } catch (e) {
      setTestResult({ success: false, message: 'Failed to send test' });
    } finally {
      setIsTestingSlack(false);
    }
  };

  const handleDeleteSlack = async (configId: number) => {
    try {
      await fetch(`/api/agentic/slack-config/${configId}`, {
        method: 'DELETE',
      });
      setSlackConfig(null);
      setTestResult({ success: true, message: 'Configuration deleted' });
    } catch (e) {
      setTestResult({ success: false, message: 'Failed to delete' });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save Anthropic Key
      if (anthropicKey) {
        await fetch('/api/settings/api-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: anthropicKey }),
        });
      }

      // Save Confluence Settings (placeholder for now or implement API)
      // TODO: Implement Confluence settings API

      // Save logic done
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Integrations</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Configure API keys and external service connections
        </p>
      </div>

      {/* Slack Notifications */}
      <div className="p-4 border border-[var(--border)] rounded-lg">
        <h3 className="font-medium text-[var(--foreground)] mb-4">Slack Notifications</h3>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Configure Slack webhooks to receive notifications for task status updates per project group.
        </p>
        
        {/* Project Group Selector */}
        <div className="mb-4">
          <label className="block text-sm text-[var(--muted-foreground)] mb-1">
            Select Project Group
          </label>
          <select
            value={selectedGroupId || ''}
            onChange={(e) => setSelectedGroupId(e.target.value ? parseInt(e.target.value, 10) : null)}
            className="w-full max-w-md px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm"
          >
            <option value="">Choose a project group...</option>
            {projectGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        {/* Test Result Banner */}
        {testResult && (
          <div
            className={cn(
              'mb-4 p-3 rounded-md text-sm',
              testResult.success
                ? 'bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
            )}
          >
            {testResult.success ? '✓' : '✕'} {testResult.message}
          </div>
        )}

        {selectedGroupId ? (
          <div className="max-w-md">
            <SlackConfigForm
              config={slackConfig}
              projectGroups={projectGroups.map((g) => ({ id: g.id, name: g.name }))}
              selectedGroupId={selectedGroupId}
              onSave={handleSaveSlack}
              onTest={handleTestSlack}
              onDelete={handleDeleteSlack}
              isSaving={isSavingSlack}
              isTesting={isTestingSlack}
            />
          </div>
        ) : (
          <div className="p-4 bg-[var(--muted)]/20 rounded-md text-sm text-[var(--muted-foreground)]">
            Select a project group above to configure Slack notifications
          </div>
        )}
      </div>

      {/* Anthropic API */}
      <div className="p-4 border border-[var(--border)] rounded-lg">
        <h3 className="font-medium text-[var(--foreground)] mb-4">Anthropic API</h3>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm text-[var(--muted-foreground)] mb-1">
              API Key
            </label>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md font-mono text-sm"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Used for Claude Agent SDK. Set via ANTHROPIC_API_KEY env var or here.
            </p>
          </div>
        </div>
      </div>

      {/* Confluence MCP */}
      <div className="p-4 border border-[var(--border)] rounded-lg">
        <h3 className="font-medium text-[var(--foreground)] mb-4">Confluence MCP Server</h3>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm text-[var(--muted-foreground)] mb-1">
              Confluence URL
            </label>
            <input
              type="url"
              value={confluenceUrl}
              onChange={(e) => setConfluenceUrl(e.target.value)}
              placeholder="https://your-domain.atlassian.net"
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--muted-foreground)] mb-1">
              API Token
            </label>
            <input
              type="password"
              value={confluenceToken}
              onChange={(e) => setConfluenceToken(e.target.value)}
              placeholder="Your Confluence API token"
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      {/* Context7 MCP */}
      <div className="p-4 border border-[var(--border)] rounded-lg">
        <h3 className="font-medium text-[var(--foreground)] mb-4">Context7 MCP Server</h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          Context7 is automatically configured and requires no additional setup.
          It provides documentation context for popular libraries and frameworks.
        </p>
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md text-sm text-green-600 dark:text-green-400">
          ✓ Context7 MCP server is ready to use
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-md text-sm transition-colors disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save All Settings'}
      </button>
    </div>
  );
}
