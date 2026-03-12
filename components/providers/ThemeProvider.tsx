'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { themeCookies, resolveTheme } from '@/lib/utils/cookies';

/**
 * ThemeProvider component that handles theme initialization and prevents FOUC
 *
 * This component:
 * 1. Initializes the theme system on mount
 * 2. Applies the correct theme class to the document element
 * 3. Handles system theme detection and changes
 * 4. Prevents Flash of Unstyled Content (FOUC)
 */
export function ThemeProvider({
  children
}: {
  children: React.ReactNode
}) {
  const initializeTheme = useSettingsStore((state) => state?.initializeTheme);
  const initialized = useRef(false);

  // Use useLayoutEffect to run synchronously before browser paints
  // This helps prevent FOUC by applying theme before first render
  useLayoutEffect(() => {
    if (initialized.current) return;

    try {
      // Get theme from cookies and apply immediately
      const cookieTheme = themeCookies.get() || 'system';
      const resolvedTheme = resolveTheme(cookieTheme);

      // Apply theme class to document element immediately
      document.documentElement.classList.remove('light', 'dark', 'pink');
      document.documentElement.classList.add(resolvedTheme);

      // Initialize the store (this will set up listeners and sync state)
      if (initializeTheme) {
        initializeTheme();
      }

      initialized.current = true;
    } catch (error) {
      console.warn('Failed to initialize theme:', error);
      // Fallback to light theme
      document.documentElement.classList.remove('light', 'dark', 'pink');
      document.documentElement.classList.add('light');
    }
  }, [initializeTheme]);

  // Additional safety check for server-side rendering
  useEffect(() => {
    // Ensure theme is applied correctly after hydration
    const settings = useSettingsStore.getState();
    const resolvedTheme = settings.getResolvedTheme();

    document.documentElement.classList.remove('light', 'dark', 'pink');
    document.documentElement.classList.add(resolvedTheme);
  }, []);

  return <>{children}</>;
}

/**
 * Script to prevent FOUC by applying theme before React hydrates
 * This should be inlined in the HTML head for maximum effectiveness
 */
export const ThemeScript = () => {
  // This script runs before React hydrates, preventing FOUC
  const script = `
    (function() {
      try {
        // Get theme from cookie
        const cookies = document.cookie.split(';');
        let theme = null;

        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.startsWith('theme-preference=')) {
            theme = decodeURIComponent(cookie.substring('theme-preference='.length));
            break;
          }
        }

        // Default to system if no cookie found
        if (!theme) {
          theme = 'system';
        }

        // Resolve system preference
        let resolvedTheme = theme;
        if (theme === 'system') {
          resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        // Apply theme class
        document.documentElement.classList.remove('light', 'dark', 'pink');
        document.documentElement.classList.add(resolvedTheme);
      } catch (e) {
        // Fallback to light theme
        document.documentElement.classList.remove('light', 'dark', 'pink');
        document.documentElement.classList.add('light');
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: script,
      }}
    />
  );
};

/**
 * Hook for accessing theme state and actions
 * Provides a convenient API for components that need theme information
 */
export function useTheme() {
  const theme = useSettingsStore((state) => state?.theme || 'system');
  const resolvedTheme = useSettingsStore((state) => state?.resolvedTheme || 'light');
  const setTheme = useSettingsStore((state) => state?.setTheme);
  const getResolvedTheme = useSettingsStore((state) => state?.getResolvedTheme);

  return {
    theme,
    resolvedTheme,
    setTheme,
    getResolvedTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isPink: resolvedTheme === 'pink',
    isSystem: theme === 'system',
  };
}

/**
 * Higher-order component that provides theme context to wrapped components
 * Useful for class components or when you need theme as props
 */
export function withTheme<P extends object>(
  Component: React.ComponentType<P & { theme: ReturnType<typeof useTheme> }>
) {
  return function ThemedComponent(props: P) {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  };
}

/**
 * Utility component for conditional rendering based on theme
 */
export function ThemeSwitch({
  light,
  dark,
  pink,
  system,
}: {
  light?: React.ReactNode;
  dark?: React.ReactNode;
  pink?: React.ReactNode;
  system?: React.ReactNode;
}) {
  const { theme, resolvedTheme } = useTheme();

  if (system && theme === 'system') {
    return <>{system}</>;
  }

  if (resolvedTheme === 'dark' && dark) {
    return <>{dark}</>;
  }

  if (resolvedTheme === 'light' && light) {
    return <>{light}</>;
  }

  if (resolvedTheme === 'pink' && pink) {
    return <>{pink}</>;
  }

  return null;
}