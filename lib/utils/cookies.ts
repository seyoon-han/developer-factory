/**
 * Cookie utilities for theme persistence
 * Provides type-safe cookie operations for theme preferences
 */

export type Theme = 'light' | 'dark' | 'pink' | 'system';

interface CookieOptions {
  expires?: number; // days
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

const THEME_COOKIE_NAME = 'theme-preference';
const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  expires: 365, // 1 year
  path: '/',
  sameSite: 'lax'
};

/**
 * Set a cookie with the given name, value, and options
 */
function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') {
    // Server-side, cannot set cookies directly
    return;
  }

  const opts = { ...DEFAULT_COOKIE_OPTIONS, ...options };
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (opts.expires) {
    const date = new Date();
    date.setTime(date.getTime() + (opts.expires * 24 * 60 * 60 * 1000));
    cookieString += `; expires=${date.toUTCString()}`;
  }

  if (opts.path) {
    cookieString += `; path=${opts.path}`;
  }

  if (opts.domain) {
    cookieString += `; domain=${opts.domain}`;
  }

  if (opts.secure) {
    cookieString += '; secure';
  }

  if (opts.sameSite) {
    cookieString += `; samesite=${opts.sameSite}`;
  }

  document.cookie = cookieString;
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    // Server-side, cannot access document.cookie
    return null;
  }

  const nameEQ = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length));
    }
  }
  return null;
}

/**
 * Delete a cookie by name
 */
function deleteCookie(name: string, path: string = '/'): void {
  setCookie(name, '', { expires: -1, path });
}

/**
 * Validate if a string is a valid theme value
 */
function isValidTheme(value: string): value is Theme {
  return ['light', 'dark', 'pink', 'system'].includes(value);
}

/**
 * Theme-specific cookie operations
 */
export const themeCookies = {
  /**
   * Get the current theme from cookies
   * Returns null if no theme is stored or if the stored value is invalid
   */
  get: (): Theme | null => {
    try {
      const value = getCookie(THEME_COOKIE_NAME);
      if (value && isValidTheme(value)) {
        return value;
      }
      return null;
    } catch (error) {
      console.warn('Failed to read theme cookie:', error);
      return null;
    }
  },

  /**
   * Set the theme preference in cookies
   */
  set: (theme: Theme): void => {
    try {
      setCookie(THEME_COOKIE_NAME, theme, DEFAULT_COOKIE_OPTIONS);
    } catch (error) {
      console.warn('Failed to set theme cookie:', error);
    }
  },

  /**
   * Delete the theme preference cookie
   */
  delete: (): void => {
    try {
      deleteCookie(THEME_COOKIE_NAME);
    } catch (error) {
      console.warn('Failed to delete theme cookie:', error);
    }
  }
};

/**
 * Get system theme preference
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light'; // Default for SSR
  }

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch (error) {
    console.warn('Failed to detect system theme preference:', error);
    return 'light';
  }
}

/**
 * Listen for system theme changes
 */
export function onSystemThemeChange(callback: (theme: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op for SSR
  }

  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      callback(e.matches ? 'dark' : 'light');
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(listener);
      return () => mediaQuery.removeListener(listener);
    }
  } catch (error) {
    console.warn('Failed to set up system theme listener:', error);
  }

  return () => {}; // No-op fallback
}

/**
 * Resolve the actual theme based on preference
 * If theme is 'system', returns the actual system preference
 */
export function resolveTheme(theme: Theme): 'light' | 'dark' | 'pink' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme as 'light' | 'dark' | 'pink';
}

/**
 * Server-side cookie utilities (for use in middleware or server components)
 * These work with request headers or response objects
 */
export const serverCookies = {
  /**
   * Parse theme from cookie header string
   */
  parseTheme: (cookieHeader: string | null): Theme | null => {
    if (!cookieHeader) return null;

    try {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[decodeURIComponent(name)] = decodeURIComponent(value);
        return acc;
      }, {} as Record<string, string>);

      const theme = cookies[THEME_COOKIE_NAME];
      return theme && isValidTheme(theme) ? theme : null;
    } catch (error) {
      console.warn('Failed to parse theme from cookie header:', error);
      return null;
    }
  },

  /**
   * Create a Set-Cookie header string for theme
   */
  createSetCookieHeader: (theme: Theme): string => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year

    return [
      `${THEME_COOKIE_NAME}=${theme}`,
      `expires=${expires.toUTCString()}`,
      'path=/',
      'samesite=lax'
    ].join('; ');
  }
};

// Export cookie configuration for external use
export const COOKIE_CONFIG = {
  name: THEME_COOKIE_NAME,
  options: DEFAULT_COOKIE_OPTIONS
};