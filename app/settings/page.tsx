'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useTheme } from '@/components/providers/ThemeProvider';
import { ProjectManager } from '@/components/projects/ProjectManager';
import { Sun, Moon, Heart, Monitor } from 'lucide-react';

export default function SettingsPage() {
  // Execution method is always 'sdk' - no longer configurable

  // Board customization state
  const { boardName, sidebarTitle, loadSettings, updateCustomization } = useSettingsStore();
  const [customBoardName, setCustomBoardName] = useState(boardName);
  const [customSidebarTitle, setCustomSidebarTitle] = useState(sidebarTitle);
  const [isCustomizationSaving, setIsCustomizationSaving] = useState(false);
  const [customizationMessage, setCustomizationMessage] = useState('');

  // Demo mode state
  const [demoMode, setDemoMode] = useState(false);
  const [isDemoModeSaving, setIsDemoModeSaving] = useState(false);
  const [demoModeMessage, setDemoModeMessage] = useState('');

  // API key state
  const [apiKey, setApiKey] = useState('');
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  const [isApiKeySaving, setIsApiKeySaving] = useState(false);
  const [apiKeyMessage, setApiKeyMessage] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // OpenAI API key state
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiApiKeyConfigured, setOpenaiApiKeyConfigured] = useState(false);
  const [openaiApiKeyMasked, setOpenaiApiKeyMasked] = useState('');
  const [isOpenaiApiKeySaving, setIsOpenaiApiKeySaving] = useState(false);
  const [openaiApiKeyMessage, setOpenaiApiKeyMessage] = useState('');
  const [showOpenaiApiKey, setShowOpenaiApiKey] = useState(false);

  // GitHub token state
  const [githubToken, setGithubToken] = useState('');
  const [githubTokenConfigured, setGithubTokenConfigured] = useState(false);
  const [githubTokenMasked, setGithubTokenMasked] = useState('');
  const [isGithubTokenSaving, setIsGithubTokenSaving] = useState(false);
  const [githubTokenMessage, setGithubTokenMessage] = useState('');
  const [showGithubToken, setShowGithubToken] = useState(false);

  // Context7 API key state
  const [context7ApiKey, setContext7ApiKey] = useState('');
  const [context7ApiKeyConfigured, setContext7ApiKeyConfigured] = useState(false);
  const [context7ApiKeyMasked, setContext7ApiKeyMasked] = useState('');
  const [isContext7ApiKeySaving, setIsContext7ApiKeySaving] = useState(false);
  const [context7ApiKeyMessage, setContext7ApiKeyMessage] = useState('');
  const [showContext7ApiKey, setShowContext7ApiKey] = useState(false);

  // Load current setting from the API
  useEffect(() => {
    // Load demo mode setting
    fetch('/api/settings/demo-mode')
      .then(res => res.json())
      .then(data => setDemoMode(data.demoMode))
      .catch(err => console.error('Failed to load demo mode:', err));

    // Load API key status
    fetch('/api/settings/api-key')
      .then(res => res.json())
      .then(data => {
        setApiKeyConfigured(data.configured);
        setApiKeyMasked(data.masked || '');
      })
      .catch(err => console.error('Failed to load API key status:', err));

    // Load OpenAI API key status
    fetch('/api/settings/openai-api-key')
      .then(res => res.json())
      .then(data => {
        setOpenaiApiKeyConfigured(data.configured);
        setOpenaiApiKeyMasked(data.masked || '');
      })
      .catch(err => console.error('Failed to load OpenAI API key status:', err));

    // Load GitHub token status
    fetch('/api/settings/github-token')
      .then(res => res.json())
      .then(data => {
        setGithubTokenConfigured(data.configured);
        setGithubTokenMasked(data.masked || '');
      })
      .catch(err => console.error('Failed to load GitHub token status:', err));

    // Load Context7 API key status
    fetch('/api/settings/context7-api-key')
      .then(res => res.json())
      .then(data => {
        setContext7ApiKeyConfigured(data.configured);
        setContext7ApiKeyMasked(data.masked || '');
      })
      .catch(err => console.error('Failed to load Context7 API key status:', err));

    // Load customization settings from database
    loadSettings();
  }, [loadSettings]);

  // Sync customization form with store state
  useEffect(() => {
    setCustomBoardName(boardName);
    setCustomSidebarTitle(sidebarTitle);
  }, [boardName, sidebarTitle]);

  const handleCustomizationSave = async () => {
    setIsCustomizationSaving(true);
    setCustomizationMessage('');

    try {
      await updateCustomization(customBoardName.trim(), customSidebarTitle.trim());
      setCustomizationMessage('Customization settings saved successfully!');
      setTimeout(() => setCustomizationMessage(''), 3000);
    } catch (error) {
      console.error('Error saving customization settings:', error);
      setCustomizationMessage('Error saving customization settings');
    } finally {
      setIsCustomizationSaving(false);
    }
  };

  // Helper functions for validation
  const isCustomizationValid = () => {
    return customBoardName.trim().length > 0 &&
           customBoardName.length <= 100 &&
           customSidebarTitle.trim().length > 0 &&
           customSidebarTitle.length <= 50;
  };

  const hasCustomizationChanged = () => {
    return customBoardName.trim() !== boardName || customSidebarTitle.trim() !== sidebarTitle;
  };

  const handleDemoModeToggle = async () => {
    const newDemoMode = !demoMode;
    setIsDemoModeSaving(true);
    setDemoModeMessage('');

    try {
      const response = await fetch('/api/settings/demo-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newDemoMode }),
      });

      if (response.ok) {
        setDemoMode(newDemoMode);
        setDemoModeMessage(`Demo mode ${newDemoMode ? 'enabled' : 'disabled'} successfully!`);
        setTimeout(() => setDemoModeMessage(''), 3000);
      } else {
        setDemoModeMessage('Failed to update demo mode');
      }
    } catch (error) {
      console.error('Error updating demo mode:', error);
      setDemoModeMessage('Error updating demo mode');
    } finally {
      setIsDemoModeSaving(false);
    }
  };

  const handleApiKeySave = async () => {
    if (!apiKey.trim()) {
      setApiKeyMessage('API key cannot be empty');
      return;
    }

    setIsApiKeySaving(true);
    setApiKeyMessage('');

    try {
      const response = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setApiKeyConfigured(true);
        setApiKeyMasked(data.masked);
        setApiKey('');
        setShowApiKey(false);
        setApiKeyMessage('API key saved successfully!');
        setTimeout(() => setApiKeyMessage(''), 3000);
      } else {
        setApiKeyMessage(data.error || 'Failed to save API key');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      setApiKeyMessage('Error saving API key');
    } finally {
      setIsApiKeySaving(false);
    }
  };

  const handleOpenaiApiKeySave = async () => {
    if (!openaiApiKey.trim()) {
      setOpenaiApiKeyMessage('OpenAI API key cannot be empty');
      return;
    }

    setIsOpenaiApiKeySaving(true);
    setOpenaiApiKeyMessage('');

    try {
      const response = await fetch('/api/settings/openai-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: openaiApiKey.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setOpenaiApiKeyConfigured(true);
        setOpenaiApiKeyMasked(data.masked);
        setOpenaiApiKey('');
        setShowOpenaiApiKey(false);
        setOpenaiApiKeyMessage('OpenAI API key saved successfully!');
        setTimeout(() => setOpenaiApiKeyMessage(''), 3000);
      } else {
        setOpenaiApiKeyMessage(data.error || 'Failed to save OpenAI API key');
      }
    } catch (error) {
      console.error('Error saving OpenAI API key:', error);
      setOpenaiApiKeyMessage('Error saving OpenAI API key');
    } finally {
      setIsOpenaiApiKeySaving(false);
    }
  };

  const handleGithubTokenSave = async () => {
    if (!githubToken.trim()) {
      setGithubTokenMessage('GitHub token cannot be empty');
      return;
    }

    setIsGithubTokenSaving(true);
    setGithubTokenMessage('');

    try {
      const response = await fetch('/api/settings/github-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setGithubTokenConfigured(true);
        setGithubTokenMasked(data.masked);
        setGithubToken('');
        setShowGithubToken(false);
        setGithubTokenMessage('GitHub token saved successfully!');
        setTimeout(() => setGithubTokenMessage(''), 3000);
      } else {
        setGithubTokenMessage(data.error || 'Failed to save GitHub token');
      }
    } catch (error) {
      console.error('Error saving GitHub token:', error);
      setGithubTokenMessage('Error saving GitHub token');
    } finally {
      setIsGithubTokenSaving(false);
    }
  };

  const handleContext7ApiKeySave = async () => {
    if (!context7ApiKey.trim()) {
      setContext7ApiKeyMessage('Context7 API key cannot be empty');
      return;
    }

    setIsContext7ApiKeySaving(true);
    setContext7ApiKeyMessage('');

    try {
      const response = await fetch('/api/settings/context7-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: context7ApiKey.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setContext7ApiKeyConfigured(true);
        setContext7ApiKeyMasked(data.masked);
        setContext7ApiKey('');
        setShowContext7ApiKey(false);
        setContext7ApiKeyMessage('Context7 API key saved successfully!');
        setTimeout(() => setContext7ApiKeyMessage(''), 3000);
      } else {
        setContext7ApiKeyMessage(data.error || 'Failed to save Context7 API key');
      }
    } catch (error) {
      console.error('Error saving Context7 API key:', error);
      setContext7ApiKeyMessage('Error saving Context7 API key');
    } finally {
      setIsContext7ApiKeySaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Settings</h2>

      {/* API Key Configuration */}
      <div className="bg-card pink:bg-pink-50 p-6 rounded-lg border border-border pink:border-pink-200">
        <h3 className="text-lg font-semibold mb-4">Anthropic API Key</h3>
        <p className="text-sm text-muted-foreground pink:text-pink-700 mb-4">
          Configure your Anthropic API key to enable AI features. The key is stored securely in the database.
        </p>

        {apiKeyConfigured && !showApiKey ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                ✅ API Key Configured
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 font-mono">
                {apiKeyMasked}
              </p>
            </div>
            <button
              onClick={() => setShowApiKey(true)}
              className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent"
            >
              Update API Key
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get your API key from: <a href="https://console.anthropic.com/" target="_blank" rel="noopener" className="text-primary hover:underline">console.anthropic.com</a>
              </p>
            </div>

            <div className="flex gap-3">
              {apiKeyConfigured && (
                <button
                  onClick={() => {
                    setShowApiKey(false);
                    setApiKey('');
                    setApiKeyMessage('');
                  }}
                  className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent"
                  disabled={isApiKeySaving}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleApiKeySave}
                disabled={!apiKey.trim() || isApiKeySaving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApiKeySaving ? 'Saving...' : 'Save API Key'}
              </button>
            </div>

            {apiKeyMessage && (
              <div className={`p-3 rounded ${
                apiKeyMessage.includes('success')
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {apiKeyMessage}
              </div>
            )}
          </div>
        )}

        {!apiKeyConfigured && !process.env.ANTHROPIC_API_KEY && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>⚠️ Required:</strong> Configure your API key to use AI features.
              Without it, task enhancement and implementation won't work.
            </p>
          </div>
        )}
      </div>

      {/* OpenAI API Key Configuration */}
      <div className="bg-card pink:bg-pink-50 p-6 rounded-lg border border-border pink:border-pink-200">
        <h3 className="text-lg font-semibold mb-4">OpenAI API Key (for Codex)</h3>
        <p className="text-sm text-muted-foreground pink:text-pink-700 mb-4">
          Configure your OpenAI API key to enable Codex features. The key is stored securely in the database.
        </p>

        {openaiApiKeyConfigured && !showOpenaiApiKey ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                ✅ OpenAI API Key Configured
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 font-mono">
                {openaiApiKeyMasked}
              </p>
            </div>
            <button
              onClick={() => setShowOpenaiApiKey(true)}
              className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent"
            >
              Update API Key
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get your API key from: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-primary hover:underline">platform.openai.com/api-keys</a>
              </p>
            </div>

            <div className="flex gap-3">
              {openaiApiKeyConfigured && (
                <button
                  onClick={() => {
                    setShowOpenaiApiKey(false);
                    setOpenaiApiKey('');
                    setOpenaiApiKeyMessage('');
                  }}
                  className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent"
                  disabled={isOpenaiApiKeySaving}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleOpenaiApiKeySave}
                disabled={!openaiApiKey.trim() || isOpenaiApiKeySaving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOpenaiApiKeySaving ? 'Saving...' : 'Save API Key'}
              </button>
            </div>

            {openaiApiKeyMessage && (
              <div className={`p-3 rounded ${
                openaiApiKeyMessage.includes('success')
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {openaiApiKeyMessage}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>💡 Note:</strong> OpenAI API key is used for Codex features and other OpenAI-specific functionality.
          </p>
        </div>
      </div>

      {/* AI Execution Method */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4">AI Execution Method</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This application uses Claude Agent SDK with persistent sessions for the best context retention,
          direct file access, and conversation continuity across tasks.
        </p>

        <div className="space-y-3">
          {/* SDK Option - ONLY OPTION */}
          <div className="flex items-start p-4 border-2 rounded-lg border-green-500 bg-green-50 dark:bg-green-900/20">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  Agent SDK
                </span>
                <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">
                  ACTIVE
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Uses Claude Agent SDK with persistent sessions. Best context retention,
                direct file access, and conversation continuity across tasks.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            ℹ️ Agent SDK is the recommended and only supported execution method for this application.
          </p>
        </div>
      </div>

      {/* Board Customization */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4">Board Customization</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Customize your board name and sidebar title to match your project or organization.
        </p>

        <div className="space-y-4">
          {/* Board Name Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Board Name
            </label>
            <input
              type="text"
              value={customBoardName}
              onChange={(e) => setCustomBoardName(e.target.value)}
              placeholder="Dev Automation Board"
              maxLength={100}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isCustomizationSaving}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-muted-foreground">
                This appears in the header and sidebar footer
              </p>
              <span className={`text-xs ${
                customBoardName.length > 100
                  ? 'text-red-500'
                  : customBoardName.length > 80
                    ? 'text-yellow-500'
                    : 'text-muted-foreground'
              }`}>
                {customBoardName.length}/100
              </span>
            </div>
          </div>

          {/* Sidebar Title Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Sidebar Title
            </label>
            <input
              type="text"
              value={customSidebarTitle}
              onChange={(e) => setCustomSidebarTitle(e.target.value)}
              placeholder="Factory"
              maxLength={50}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isCustomizationSaving}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-muted-foreground">
                This appears in the sidebar header when expanded
              </p>
              <span className={`text-xs ${
                customSidebarTitle.length > 50
                  ? 'text-red-500'
                  : customSidebarTitle.length > 40
                    ? 'text-yellow-500'
                    : 'text-muted-foreground'
              }`}>
                {customSidebarTitle.length}/50
              </span>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleCustomizationSave}
              disabled={!isCustomizationValid() || !hasCustomizationChanged() || isCustomizationSaving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCustomizationSaving ? 'Saving...' : 'Save Customization'}
            </button>
          </div>

          {/* Success/Error Message */}
          {customizationMessage && (
            <div className={`mt-4 p-3 rounded ${
              customizationMessage.includes('success')
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {customizationMessage}
            </div>
          )}
        </div>
      </div>

      {/* Context7 MCP API Key */}
      <div className="bg-card pink:bg-pink-50 p-6 rounded-lg border border-border pink:border-pink-200">
        <h3 className="text-lg font-semibold mb-4">Context7 MCP API Key</h3>
        <p className="text-sm text-muted-foreground pink:text-pink-700 mb-4">
          Configure your Context7 MCP API key to enable advanced documentation and library context during prompt enhancement and implementation. The key is stored securely in the database.
        </p>

        {context7ApiKeyConfigured && !showContext7ApiKey ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                ✅ Context7 API Key Configured
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 font-mono">
                {context7ApiKeyMasked}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowContext7ApiKey(true)}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent"
              >
                Update API Key
              </button>
              <button
                onClick={async () => {
                  if (confirm("Remove Context7 API key? Context7 MCP features will be disabled.")) {
                    await fetch('/api/settings/context7-api-key', { method: 'DELETE' });
                    setContext7ApiKeyConfigured(false);
                    setContext7ApiKeyMasked('');
                  }
                }}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-destructive/10 text-destructive"
              >
                Remove Key
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Context7 API Key
              </label>
              <input
                type="password"
                value={context7ApiKey}
                onChange={(e) => setContext7ApiKey(e.target.value)}
                placeholder="ctx7sk-..."
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get your API key from: <a href="https://context7.com" target="_blank" rel="noopener" className="text-primary hover:underline">context7.com</a>
              </p>
            </div>

            <div className="flex gap-3">
              {context7ApiKeyConfigured && (
                <button
                  onClick={() => {
                    setShowContext7ApiKey(false);
                    setContext7ApiKey('');
                    setContext7ApiKeyMessage('');
                  }}
                  className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent"
                  disabled={isContext7ApiKeySaving}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleContext7ApiKeySave}
                disabled={!context7ApiKey.trim() || isContext7ApiKeySaving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isContext7ApiKeySaving ? 'Saving...' : 'Save API Key'}
              </button>
            </div>

            {context7ApiKeyMessage && (
              <div className={`p-3 rounded ${
                context7ApiKeyMessage.includes('success')
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {context7ApiKeyMessage}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>💡 About Context7:</strong> Context7 MCP provides up-to-date documentation and library context for popular frameworks and libraries. When enabled, Claude can access relevant documentation during task implementation.
          </p>
        </div>
      </div>

      {/* GitHub Token */}
      <div className="bg-card pink:bg-pink-50 p-6 rounded-lg border border-border pink:border-pink-200">
        <h3 className="text-lg font-semibold mb-4">GitHub Personal Access Token</h3>
        <p className="text-sm text-muted-foreground pink:text-pink-700 mb-4">
          Add a GitHub token to clone private repositories. Required for private repos.
        </p>

        {githubTokenConfigured && !showGithubToken ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                ✅ GitHub Token Configured
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 font-mono">
                {githubTokenMasked}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGithubToken(true)}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent"
              >
                Update Token
              </button>
              <button
                onClick={async () => {
                  if (confirm("Remove GitHub token? You won't be able to clone private repos.")) {
                    await fetch('/api/settings/github-token', { method: 'DELETE' });
                    setGithubTokenConfigured(false);
                    setGithubTokenMasked('');
                  }
                }}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-destructive/10 text-destructive"
              >
                Remove Token
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                GitHub Token
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_... or github_pat_..."
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Generate at: <a href="https://github.com/settings/tokens" target="_blank" rel="noopener" className="text-primary hover:underline">github.com/settings/tokens</a>
                <br />
                Required scopes: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">repo</code>
              </p>
            </div>

            <div className="flex gap-3">
              {githubTokenConfigured && (
                <button
                  onClick={() => {
                    setShowGithubToken(false);
                    setGithubToken('');
                    setGithubTokenMessage('');
                  }}
                  className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent"
                  disabled={isGithubTokenSaving}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleGithubTokenSave}
                disabled={!githubToken.trim() || isGithubTokenSaving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGithubTokenSaving ? 'Saving...' : 'Save GitHub Token'}
              </button>
            </div>

            {githubTokenMessage && (
              <div className={`p-3 rounded ${
                githubTokenMessage.includes('success')
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {githubTokenMessage}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>💡 Tip:</strong> For private repos, create a token with <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">repo</code> scope.
            Public repos don't need authentication.
          </p>
        </div>
      </div>

      {/* Project Settings */}
      <div className="bg-card pink:bg-pink-50 p-6 rounded-lg border border-border pink:border-pink-200">
        <h3 className="text-lg font-semibold mb-4">Project Settings</h3>
        <p className="text-sm text-muted-foreground pink:text-pink-700 mb-6">
          Manage external Git projects. The active project is where Claude SDK will execute tasks.
          Deactivate all to enter demo mode (work on dev-automation-board itself).
        </p>
        <ProjectManager />
      </div>

      {/* Theme Selection */}
      <ThemeSelectionSection />

      {/* Demo Mode */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4">Demo Mode</h3>
        <p className="text-sm text-muted-foreground mb-4">
          When enabled, prevents Claude SDK from killing or restarting the application during implementation.
          The app will self-reload instead. Useful for live demos and presentations.
        </p>

        <label className="flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 border-input">
          <div className="flex-1">
            <div className="font-medium text-foreground">
              Enable Demo Mode
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {demoMode 
                ? '🎭 Demo mode is active - Process management disabled'
                : '⚙️ Normal mode - Full process management enabled'
              }
            </p>
          </div>
          <button
            type="button"
            onClick={handleDemoModeToggle}
            disabled={isDemoModeSaving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              demoMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                demoMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>

        {demoModeMessage && (
          <div className={`mt-4 p-3 rounded ${
            demoModeMessage.includes('success')
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {demoModeMessage}
          </div>
        )}

        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>⚠️ Note:</strong> Demo mode only affects implementation behavior.
            Claude SDK can still build and test the application, but won't kill/restart processes.
          </p>
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4">Integrations</h3>
        <p className="text-muted-foreground">
          GitHub, GitLab, and CI/CD integrations coming soon...
        </p>
      </div>
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4">AI Automation</h3>
        <p className="text-muted-foreground">
          Configure AI automation rules here...
        </p>
      </div>

      {/* System Info */}
      <SystemInfoSection />
    </div>
  );
}

function SystemInfoSection() {
  const [logFolderPath, setLogFolderPath] = useState<string>('Loading...');
  const [workspacePath, setWorkspacePath] = useState<string>('Loading...');

  useEffect(() => {
    // Load log folder path
    fetch('/api/logs')
      .then(res => res.json())
      .then(data => {
        setLogFolderPath(data.hostLogFolderPath || data.logFolderPath || 'N/A');
      })
      .catch(() => setLogFolderPath('Error loading path'));

    // Load workspace path
    fetch('/api/workspace/host-path')
      .then(res => res.json())
      .then(data => {
        setWorkspacePath(data.hostPath || 'N/A');
      })
      .catch(() => setWorkspacePath('Error loading path'));
  }, []);

  return (
    <div className="bg-card pink:bg-pink-50 p-6 rounded-lg border border-border pink:border-pink-200">
      <h3 className="text-lg font-semibold mb-4">System Information</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Log Folder Path (Host)
          </label>
          <div className="p-3 bg-muted rounded-md font-mono text-xs break-all">
            {logFolderPath}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Server logs are stored here with daily rotation. This folder is mounted from the host, so logs persist even if the container is deleted.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Workspace Path (Host)
          </label>
          <div className="p-3 bg-muted rounded-md font-mono text-xs break-all">
            {workspacePath}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            External projects are cloned and managed in this folder. Use this path to open projects in your IDE.
          </p>
        </div>
      </div>
    </div>
  );
}

function ThemeSelectionSection() {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    {
      value: 'light',
      label: 'Light',
      description: 'Bright theme with light backgrounds',
      icon: Sun,
      preview: 'bg-white border-gray-300 text-gray-900',
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Dark theme with reduced eye strain',
      icon: Moon,
      preview: 'bg-gray-800 border-gray-600 text-gray-100',
    },
    {
      value: 'pink',
      label: 'Pink',
      description: 'Pink theme with creative, calming colors',
      icon: Heart,
      preview: 'bg-pink-50 border-pink-300 text-pink-900',
    },
    {
      value: 'system',
      label: 'System',
      description: 'Follow your system preference',
      icon: Monitor,
      preview: 'bg-gradient-to-r from-gray-100 to-gray-800 border-gray-400 text-gray-700',
    },
  ] as const;

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'pink' | 'system') => {
    setTheme(newTheme);
  };

  return (
    <div className="bg-card pink:bg-pink-50 p-6 rounded-lg border border-border pink:border-pink-200">
      <h3 className="text-lg font-semibold mb-4">Theme</h3>
      <p className="text-sm text-muted-foreground pink:text-pink-700 mb-6">
        Choose your preferred theme appearance. The system option automatically switches between light and dark based on your device settings.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {themeOptions.map((option) => {
          const IconComponent = option.icon;
          const isSelected = theme === option.value;

          return (
            <label
              key={option.value}
              className={`
                relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                hover:bg-gray-50 dark:hover:bg-gray-700 pink:hover:bg-pink-100
                ${isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-input pink:border-pink-300'
                }
              `}
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={isSelected}
                onChange={() => handleThemeChange(option.value)}
                className="sr-only"
              />

              {/* Preview box */}
              <div className={`
                w-12 h-12 mr-4 rounded-md border-2 flex items-center justify-center
                ${option.preview}
              `}>
                <IconComponent className="w-5 h-5" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground pink:text-pink-900">
                    {option.label}
                  </span>
                  {isSelected && (
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground pink:text-pink-700">
                  {option.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 pink:bg-pink-50 border border-blue-200 dark:border-blue-800 pink:border-pink-200 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200 pink:text-pink-800">
          <strong>💡 Tip:</strong> Your theme preference is automatically saved and will persist across browser sessions.
        </p>
      </div>
    </div>
  );
}
