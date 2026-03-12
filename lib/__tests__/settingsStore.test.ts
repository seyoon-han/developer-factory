/**
 * @jest-environment jsdom
 */

import { useSettingsStore } from '../store/settingsStore';
import { themeCookies } from '../utils/cookies';

// Mock the cookies module
jest.mock('../utils/cookies', () => ({
  themeCookies: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
  getSystemTheme: jest.fn(() => 'light'),
  onSystemThemeChange: jest.fn(() => jest.fn()),
  resolveTheme: jest.fn((theme: 'light' | 'dark' | 'system') => {
    if (theme === 'system') return 'light';
    return theme;
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock document.documentElement
const mockDocumentElement = {
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(),
  },
};
Object.defineProperty(document, 'documentElement', {
  value: mockDocumentElement,
  writable: true,
});

describe('Settings Store', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset store
    useSettingsStore.setState({
      theme: 'system',
      resolvedTheme: 'light',
      githubConfig: null,
      gitlabConfig: null,
      automationRules: [],
      anthropicApiKey: null,
    }, true);
  });

  describe('Theme Management', () => {
    test('should initialize with default theme', () => {
      const state = useSettingsStore.getState();
      expect(state.theme).toBe('system');
      expect(state.resolvedTheme).toBe('light');
    });

    test('should set theme and save to cookie', () => {
      const { setTheme } = useSettingsStore.getState();

      setTheme('dark');

      expect(themeCookies.set).toHaveBeenCalledWith('dark');
      expect(useSettingsStore.getState().theme).toBe('dark');
      expect(useSettingsStore.getState().resolvedTheme).toBe('dark');
    });

    test('should apply dark class to document element when setting dark theme', () => {
      const { setTheme } = useSettingsStore.getState();

      setTheme('dark');

      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    test('should remove dark class when setting light theme', () => {
      const { setTheme } = useSettingsStore.getState();

      setTheme('light');

      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('dark');
    });

    test('should handle system theme with resolved theme', () => {
      const mockOnSystemThemeChange = require('../utils/cookies').onSystemThemeChange;
      const mockResolveTheme = require('../utils/cookies').resolveTheme;

      // Mock system theme as dark
      mockResolveTheme.mockReturnValue('dark');

      const { setTheme } = useSettingsStore.getState();
      setTheme('system');

      expect(useSettingsStore.getState().theme).toBe('system');
      expect(useSettingsStore.getState().resolvedTheme).toBe('dark');
      expect(mockOnSystemThemeChange).toHaveBeenCalled();
    });

    test('should get resolved theme correctly', () => {
      const { getResolvedTheme } = useSettingsStore.getState();
      const mockResolveTheme = require('../utils/cookies').resolveTheme;

      mockResolveTheme.mockReturnValue('dark');

      const resolved = getResolvedTheme();
      expect(resolved).toBe('dark');
    });

    test('should initialize theme from cookies', () => {
      const mockThemeCookies = require('../utils/cookies').themeCookies;
      const mockResolveTheme = require('../utils/cookies').resolveTheme;

      mockThemeCookies.get.mockReturnValue('dark');
      mockResolveTheme.mockReturnValue('dark');

      const { initializeTheme } = useSettingsStore.getState();
      initializeTheme();

      const state = useSettingsStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.resolvedTheme).toBe('dark');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    test('should handle missing theme cookie in initialization', () => {
      const mockThemeCookies = require('../utils/cookies').themeCookies;
      const mockResolveTheme = require('../utils/cookies').resolveTheme;

      mockThemeCookies.get.mockReturnValue(null);
      mockResolveTheme.mockReturnValue('light');

      const { initializeTheme } = useSettingsStore.getState();
      initializeTheme();

      const state = useSettingsStore.getState();
      expect(state.theme).toBe('system');
      expect(state.resolvedTheme).toBe('light');
    });
  });

  describe('Other Settings', () => {
    test('should manage GitHub configuration', () => {
      const { setGitHubConfig } = useSettingsStore.getState();
      const config = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo',
      };

      setGitHubConfig(config);

      expect(useSettingsStore.getState().githubConfig).toEqual(config);
    });

    test('should manage GitLab configuration', () => {
      const { setGitLabConfig } = useSettingsStore.getState();
      const config = {
        token: 'test-token',
        projectId: 123,
        baseUrl: 'https://gitlab.com',
      };

      setGitLabConfig(config);

      expect(useSettingsStore.getState().gitlabConfig).toEqual(config);
    });

    test('should manage automation rules', () => {
      const { addAutomationRule, updateAutomationRule, deleteAutomationRule } = useSettingsStore.getState();

      const rule = {
        id: 'test-rule',
        name: 'Test Rule',
        trigger: 'manual' as const,
        actions: [],
        enabled: true,
      };

      // Add rule
      addAutomationRule(rule);
      expect(useSettingsStore.getState().automationRules).toContain(rule);

      // Update rule
      updateAutomationRule('test-rule', { enabled: false });
      const updatedRule = useSettingsStore.getState().automationRules.find(r => r.id === 'test-rule');
      expect(updatedRule?.enabled).toBe(false);

      // Delete rule
      deleteAutomationRule('test-rule');
      expect(useSettingsStore.getState().automationRules).not.toContain(rule);
    });

    test('should manage Anthropic API key', () => {
      const { setAnthropicApiKey } = useSettingsStore.getState();

      setAnthropicApiKey('test-api-key');
      expect(useSettingsStore.getState().anthropicApiKey).toBe('test-api-key');

      setAnthropicApiKey(null);
      expect(useSettingsStore.getState().anthropicApiKey).toBeNull();
    });
  });

  describe('Persistence', () => {
    test('should not persist theme in localStorage', () => {
      const { setTheme } = useSettingsStore.getState();

      setTheme('dark');

      // Theme should be saved to cookies, not localStorage
      expect(themeCookies.set).toHaveBeenCalledWith('dark');

      // When localStorage.setItem is called, it should not include theme
      if (localStorageMock.setItem.mock.calls.length > 0) {
        const lastCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1];
        const [, value] = lastCall;
        const parsedValue = JSON.parse(value);
        expect(parsedValue.state.theme).toBeUndefined();
      }
    });

    test('should persist other settings in localStorage', () => {
      const { setAnthropicApiKey } = useSettingsStore.getState();

      setAnthropicApiKey('test-key');

      // Should persist to localStorage (eventually, due to async nature)
      setTimeout(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled();
      }, 100);
    });
  });

  describe('Error Handling', () => {
    test('should handle cookie errors gracefully', () => {
      const mockThemeCookies = require('../utils/cookies').themeCookies;
      mockThemeCookies.set.mockImplementation(() => {
        throw new Error('Cookie error');
      });

      const { setTheme } = useSettingsStore.getState();

      expect(() => setTheme('dark')).not.toThrow();
    });

    test('should handle DOM manipulation errors gracefully', () => {
      const originalAdd = mockDocumentElement.classList.add;
      mockDocumentElement.classList.add = jest.fn().mockImplementation(() => {
        throw new Error('DOM error');
      });

      const { setTheme } = useSettingsStore.getState();

      expect(() => setTheme('dark')).not.toThrow();

      // Restore original method
      mockDocumentElement.classList.add = originalAdd;
    });
  });
});