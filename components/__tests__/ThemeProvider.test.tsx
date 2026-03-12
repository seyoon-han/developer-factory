/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme, ThemeSwitch, withTheme } from '../providers/ThemeProvider';
import { useSettingsStore } from '@/lib/store/settingsStore';

// Mock the settings store
const mockStore = {
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: jest.fn(),
  initializeTheme: jest.fn(),
  getResolvedTheme: jest.fn(() => 'light'),
  githubConfig: null,
  gitlabConfig: null,
  automationRules: [],
  anthropicApiKey: null,
  setGitHubConfig: jest.fn(),
  setGitLabConfig: jest.fn(),
  addAutomationRule: jest.fn(),
  updateAutomationRule: jest.fn(),
  deleteAutomationRule: jest.fn(),
  setAnthropicApiKey: jest.fn(),
};

jest.mock('@/lib/store/settingsStore', () => ({
  useSettingsStore: {
    ...jest.fn(),
    getState: () => mockStore,
  }
}));

// Mock the cookies module
jest.mock('@/lib/utils/cookies', () => ({
  themeCookies: {
    get: jest.fn(() => 'system'),
    set: jest.fn(),
    delete: jest.fn(),
  },
  resolveTheme: jest.fn((theme: string) => {
    if (theme === 'system') return 'light';
    return theme;
  }),
}));

const mockUseSettingsStore = useSettingsStore as any;

describe('ThemeProvider', () => {
  const mockInitializeTheme = jest.fn();
  const mockSetTheme = jest.fn();
  const mockGetResolvedTheme = jest.fn(() => 'light');

  beforeEach(() => {
    jest.clearAllMocks();

    // Update the mock store
    mockStore.initializeTheme = mockInitializeTheme;
    mockStore.setTheme = mockSetTheme;
    mockStore.getResolvedTheme = mockGetResolvedTheme;

    // Mock the settings store implementation for selectors
    mockUseSettingsStore.mockImplementation((selector?: any) => {
      if (!selector) return mockStore;
      return selector(mockStore);
    });

    // Mock document.documentElement
    Object.defineProperty(document, 'documentElement', {
      value: {
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          contains: jest.fn(),
        },
      },
      writable: true,
    });
  });

  test('should render children', () => {
    const { getByText } = render(
      <ThemeProvider>
        <div>Test Content</div>
      </ThemeProvider>
    );

    expect(getByText('Test Content')).toBeInTheDocument();
  });

  test('should initialize theme on mount', () => {
    render(
      <ThemeProvider>
        <div>Test Content</div>
      </ThemeProvider>
    );

    expect(mockInitializeTheme).toHaveBeenCalled();
  });

  test('should handle initialization errors gracefully', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockInitializeTheme.mockImplementationOnce(() => {
      throw new Error('Initialization error');
    });

    expect(() =>
      render(
        <ThemeProvider>
          <div>Test Content</div>
        </ThemeProvider>
      )
    ).not.toThrow();

    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to initialize theme:', expect.any(Error));
    consoleWarnSpy.mockRestore();
  });
});

describe('useTheme', () => {
  const mockSetTheme = jest.fn();
  const mockGetResolvedTheme = jest.fn(() => 'light');

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        theme: 'light' as const,
        resolvedTheme: 'light' as const,
        setTheme: mockSetTheme,
        getResolvedTheme: mockGetResolvedTheme,
        initializeTheme: jest.fn(),
        githubConfig: null,
        gitlabConfig: null,
        automationRules: [],
        anthropicApiKey: null,
        setGitHubConfig: jest.fn(),
        setGitLabConfig: jest.fn(),
        addAutomationRule: jest.fn(),
        updateAutomationRule: jest.fn(),
        deleteAutomationRule: jest.fn(),
        setAnthropicApiKey: jest.fn(),
      };

      return selector ? selector(state) : state;
    });
  });

  test('should provide theme state and methods', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current).toEqual({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: mockSetTheme,
      getResolvedTheme: mockGetResolvedTheme,
      isDark: false,
      isLight: true,
      isSystem: false,
    });
  });

  test('should correctly identify dark theme', () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        theme: 'dark' as const,
        resolvedTheme: 'dark' as const,
        setTheme: mockSetTheme,
        getResolvedTheme: mockGetResolvedTheme,
        initializeTheme: jest.fn(),
        githubConfig: null,
        gitlabConfig: null,
        automationRules: [],
        anthropicApiKey: null,
        setGitHubConfig: jest.fn(),
        setGitLabConfig: jest.fn(),
        addAutomationRule: jest.fn(),
        updateAutomationRule: jest.fn(),
        deleteAutomationRule: jest.fn(),
        setAnthropicApiKey: jest.fn(),
      };

      return selector ? selector(state) : state;
    });

    const { result } = renderHook(() => useTheme());

    expect(result.current.isDark).toBe(true);
    expect(result.current.isLight).toBe(false);
  });

  test('should correctly identify system theme', () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        theme: 'system' as const,
        resolvedTheme: 'light' as const,
        setTheme: mockSetTheme,
        getResolvedTheme: mockGetResolvedTheme,
        initializeTheme: jest.fn(),
        githubConfig: null,
        gitlabConfig: null,
        automationRules: [],
        anthropicApiKey: null,
        setGitHubConfig: jest.fn(),
        setGitLabConfig: jest.fn(),
        addAutomationRule: jest.fn(),
        updateAutomationRule: jest.fn(),
        deleteAutomationRule: jest.fn(),
        setAnthropicApiKey: jest.fn(),
      };

      return selector ? selector(state) : state;
    });

    const { result } = renderHook(() => useTheme());

    expect(result.current.isSystem).toBe(true);
    expect(result.current.resolvedTheme).toBe('light');
  });
});

describe('ThemeSwitch', () => {
  beforeEach(() => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        theme: 'light' as const,
        resolvedTheme: 'light' as const,
        setTheme: jest.fn(),
        getResolvedTheme: jest.fn(),
        initializeTheme: jest.fn(),
        githubConfig: null,
        gitlabConfig: null,
        automationRules: [],
        anthropicApiKey: null,
        setGitHubConfig: jest.fn(),
        setGitLabConfig: jest.fn(),
        addAutomationRule: jest.fn(),
        updateAutomationRule: jest.fn(),
        deleteAutomationRule: jest.fn(),
        setAnthropicApiKey: jest.fn(),
      };

      return selector ? selector(state) : state;
    });
  });

  test('should render light content for light theme', () => {
    const { getByText } = render(
      <ThemeSwitch
        light={<div>Light Content</div>}
        dark={<div>Dark Content</div>}
        system={<div>System Content</div>}
      />
    );

    expect(getByText('Light Content')).toBeInTheDocument();
  });

  test('should render dark content for dark theme', () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        theme: 'dark' as const,
        resolvedTheme: 'dark' as const,
        setTheme: jest.fn(),
        getResolvedTheme: jest.fn(),
        initializeTheme: jest.fn(),
        githubConfig: null,
        gitlabConfig: null,
        automationRules: [],
        anthropicApiKey: null,
        setGitHubConfig: jest.fn(),
        setGitLabConfig: jest.fn(),
        addAutomationRule: jest.fn(),
        updateAutomationRule: jest.fn(),
        deleteAutomationRule: jest.fn(),
        setAnthropicApiKey: jest.fn(),
      };

      return selector ? selector(state) : state;
    });

    const { getByText } = render(
      <ThemeSwitch
        light={<div>Light Content</div>}
        dark={<div>Dark Content</div>}
        system={<div>System Content</div>}
      />
    );

    expect(getByText('Dark Content')).toBeInTheDocument();
  });

  test('should render system content for system theme', () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        theme: 'system' as const,
        resolvedTheme: 'light' as const,
        setTheme: jest.fn(),
        getResolvedTheme: jest.fn(),
        initializeTheme: jest.fn(),
        githubConfig: null,
        gitlabConfig: null,
        automationRules: [],
        anthropicApiKey: null,
        setGitHubConfig: jest.fn(),
        setGitLabConfig: jest.fn(),
        addAutomationRule: jest.fn(),
        updateAutomationRule: jest.fn(),
        deleteAutomationRule: jest.fn(),
        setAnthropicApiKey: jest.fn(),
      };

      return selector ? selector(state) : state;
    });

    const { getByText } = render(
      <ThemeSwitch
        light={<div>Light Content</div>}
        dark={<div>Dark Content</div>}
        system={<div>System Content</div>}
      />
    );

    expect(getByText('System Content')).toBeInTheDocument();
  });

  test('should render nothing when no matching content provided', () => {
    const { container } = render(
      <ThemeSwitch />
    );

    expect(container.firstChild).toBeNull();
  });
});

describe('withTheme', () => {
  beforeEach(() => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        theme: 'light' as const,
        resolvedTheme: 'light' as const,
        setTheme: jest.fn(),
        getResolvedTheme: jest.fn(),
        initializeTheme: jest.fn(),
        githubConfig: null,
        gitlabConfig: null,
        automationRules: [],
        anthropicApiKey: null,
        setGitHubConfig: jest.fn(),
        setGitLabConfig: jest.fn(),
        addAutomationRule: jest.fn(),
        updateAutomationRule: jest.fn(),
        deleteAutomationRule: jest.fn(),
        setAnthropicApiKey: jest.fn(),
      };

      return selector ? selector(state) : state;
    });
  });

  test('should inject theme props into wrapped component', () => {
    const TestComponent = ({ theme, testProp }: { theme: any; testProp: string }) => (
      <div>
        <span>Theme: {theme.resolvedTheme}</span>
        <span>Test: {testProp}</span>
      </div>
    );

    const ThemedComponent = withTheme(TestComponent);

    const { getByText } = render(
      <ThemedComponent testProp="test-value" />
    );

    expect(getByText('Theme: light')).toBeInTheDocument();
    expect(getByText('Test: test-value')).toBeInTheDocument();
  });
});