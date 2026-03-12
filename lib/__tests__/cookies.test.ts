/**
 * @jest-environment jsdom
 */

import { themeCookies, getSystemTheme, resolveTheme, serverCookies, onSystemThemeChange } from '../utils/cookies';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Cookie Utilities', () => {
  beforeEach(() => {
    // Clear all cookies before each test
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  });

  describe('themeCookies', () => {
    test('should set and get theme cookie', () => {
      themeCookies.set('dark');
      expect(themeCookies.get()).toBe('dark');

      themeCookies.set('light');
      expect(themeCookies.get()).toBe('light');

      themeCookies.set('system');
      expect(themeCookies.get()).toBe('system');
    });

    test('should return null for invalid theme values', () => {
      // Manually set an invalid theme cookie
      document.cookie = 'theme-preference=invalid; path=/';
      expect(themeCookies.get()).toBe(null);
    });

    test('should return null when no cookie exists', () => {
      expect(themeCookies.get()).toBe(null);
    });

    test('should delete theme cookie', () => {
      themeCookies.set('dark');
      expect(themeCookies.get()).toBe('dark');

      themeCookies.delete();
      expect(themeCookies.get()).toBe(null);
    });

    test('should handle cookie errors gracefully', () => {
      // Mock document.cookie to throw an error
      const originalCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
      Object.defineProperty(document, 'cookie', {
        get: () => {
          throw new Error('Cookie error');
        },
        set: () => {
          throw new Error('Cookie error');
        },
      });

      expect(themeCookies.get()).toBe(null);
      expect(() => themeCookies.set('dark')).not.toThrow();

      // Restore original cookie behavior
      if (originalCookie) {
        Object.defineProperty(Document.prototype, 'cookie', originalCookie);
      }
    });
  });

  describe('getSystemTheme', () => {
    test('should return light when system prefers light', () => {
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      expect(getSystemTheme()).toBe('light');
    });

    test('should return dark when system prefers dark', () => {
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      expect(getSystemTheme()).toBe('dark');
    });

    test('should return light as fallback when matchMedia throws', () => {
      window.matchMedia = jest.fn().mockImplementation(() => {
        throw new Error('matchMedia error');
      });

      expect(getSystemTheme()).toBe('light');
    });
  });

  describe('resolveTheme', () => {
    test('should return light for light theme', () => {
      expect(resolveTheme('light')).toBe('light');
    });

    test('should return dark for dark theme', () => {
      expect(resolveTheme('dark')).toBe('dark');
    });

    test('should resolve system theme based on system preference', () => {
      // Mock system prefers dark
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      expect(resolveTheme('system')).toBe('dark');

      // Mock system prefers light
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      expect(resolveTheme('system')).toBe('light');
    });
  });

  describe('onSystemThemeChange', () => {
    test('should set up system theme change listener', () => {
      const mockMediaQuery = {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      };

      window.matchMedia = jest.fn().mockReturnValue(mockMediaQuery);

      const callback = jest.fn();
      const cleanup = onSystemThemeChange(callback);

      // Should use modern addEventListener if available
      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      // Call cleanup
      cleanup();
      expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    test('should use legacy addListener for older browsers', () => {
      const mockMediaQuery = {
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      };

      window.matchMedia = jest.fn().mockReturnValue(mockMediaQuery);

      const callback = jest.fn();
      const cleanup = onSystemThemeChange(callback);

      // Should use legacy addListener when addEventListener is not available
      expect(mockMediaQuery.addListener).toHaveBeenCalledWith(expect.any(Function));

      // Call cleanup
      cleanup();
      expect(mockMediaQuery.removeListener).toHaveBeenCalledWith(expect.any(Function));
    });

    test('should handle matchMedia errors gracefully', () => {
      window.matchMedia = jest.fn().mockImplementation(() => {
        throw new Error('matchMedia error');
      });

      const callback = jest.fn();
      expect(() => onSystemThemeChange(callback)).not.toThrow();
    });
  });

  describe('serverCookies', () => {
    test('should parse theme from cookie header', () => {
      const cookieHeader = 'theme-preference=dark; other-cookie=value';
      expect(serverCookies.parseTheme(cookieHeader)).toBe('dark');

      const cookieHeader2 = 'other-cookie=value; theme-preference=light';
      expect(serverCookies.parseTheme(cookieHeader2)).toBe('light');

      const cookieHeader3 = 'theme-preference=system';
      expect(serverCookies.parseTheme(cookieHeader3)).toBe('system');
    });

    test('should return null for invalid theme in cookie header', () => {
      const cookieHeader = 'theme-preference=invalid; other-cookie=value';
      expect(serverCookies.parseTheme(cookieHeader)).toBe(null);
    });

    test('should return null for missing theme cookie', () => {
      const cookieHeader = 'other-cookie=value';
      expect(serverCookies.parseTheme(cookieHeader)).toBe(null);

      expect(serverCookies.parseTheme(null)).toBe(null);
      expect(serverCookies.parseTheme('')).toBe(null);
    });

    test('should create correct Set-Cookie header', () => {
      const header = serverCookies.createSetCookieHeader('dark');
      expect(header).toContain('theme-preference=dark');
      expect(header).toContain('path=/');
      expect(header).toContain('samesite=lax');
      expect(header).toContain('expires=');
    });

    test('should handle malformed cookie headers gracefully', () => {
      const malformedHeader = 'invalid-cookie-format';
      expect(serverCookies.parseTheme(malformedHeader)).toBe(null);
    });
  });
});

describe('Theme System Integration', () => {
  test('should handle complete theme cycle', () => {
    // Start with light theme
    themeCookies.set('light');
    expect(themeCookies.get()).toBe('light');
    expect(resolveTheme('light')).toBe('light');

    // Switch to dark theme
    themeCookies.set('dark');
    expect(themeCookies.get()).toBe('dark');
    expect(resolveTheme('dark')).toBe('dark');

    // Switch to system theme
    themeCookies.set('system');
    expect(themeCookies.get()).toBe('system');

    // Mock system preference
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: true, // system prefers dark
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    expect(resolveTheme('system')).toBe('dark');
  });
});