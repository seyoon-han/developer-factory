import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { themeCookies, getSystemTheme, onSystemThemeChange, resolveTheme, type Theme } from '@/lib/utils/cookies';

interface SettingsState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark' | 'pink';
  boardName: string;
  sidebarTitle: string;
  isLoading: boolean;

  setTheme: (theme: Theme) => void;
  loadSettings: () => Promise<void>;
  updateCustomization: (boardName: string, sidebarTitle: string) => Promise<void>;

  // Theme-specific methods
  getResolvedTheme: () => 'light' | 'dark' | 'pink';
  initializeTheme: () => void;
}

// Custom storage implementation that uses cookies for theme and localStorage for other settings
const createCustomStorage = (): any => ({
  getItem: (name: string): string | null => {
    try {
      const item = localStorage.getItem(name);
      if (item) {
        const parsed = JSON.parse(item);
        // Get theme from cookies instead of localStorage
        const themeFromCookie = themeCookies.get();
        if (themeFromCookie) {
          parsed.state.theme = themeFromCookie;
        }
        return JSON.stringify(parsed);
      }
      return null;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      // value might be a string or already parsed object
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      // Store theme in cookies instead of localStorage
      if (parsed.state?.theme) {
        themeCookies.set(parsed.state.theme);
        // Remove theme from localStorage data
        delete parsed.state.theme;
      }
      localStorage.setItem(name, JSON.stringify(parsed));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
    themeCookies.delete();
  }
});

let systemThemeListener: (() => void) | null = null;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      boardName: 'Dev Automation Board',
      sidebarTitle: 'Factory',
      isLoading: false,

      loadSettings: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/settings');
          const data = await res.json();
          
          if (data.success) {
            set({
              boardName: data.settings.board_name || 'Dev Automation Board',
              sidebarTitle: data.settings.sidebar_title || 'Factory',
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Error loading settings:', error);
          set({ isLoading: false });
        }
      },

      updateCustomization: async (boardName, sidebarTitle) => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/settings/customization', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boardName, sidebarTitle }),
          });
          const data = await res.json();
          
          if (data.success) {
            set({ boardName, sidebarTitle, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Error updating customization:', error);
          set({ isLoading: false });
        }
      },

      setTheme: (theme) => {
        // Save to cookie
        themeCookies.set(theme);

        // Update resolved theme
        const resolvedTheme = resolveTheme(theme);

        set({ theme, resolvedTheme });

        // Apply theme to DOM
        if (typeof document !== 'undefined') {
          // Remove all theme classes first
          document.documentElement.classList.remove('light', 'dark', 'pink');
          // Add the resolved theme class
          document.documentElement.classList.add(resolvedTheme);
        }

        // Handle system theme listener
        if (systemThemeListener) {
          systemThemeListener();
          systemThemeListener = null;
        }

        if (theme === 'system') {
          systemThemeListener = onSystemThemeChange((systemTheme) => {
            const currentState = get();
            if (currentState.theme === 'system') {
              set({ resolvedTheme: systemTheme });

              if (typeof document !== 'undefined') {
                // Remove all theme classes first
                document.documentElement.classList.remove('light', 'dark', 'pink');
                // Add the system theme class (light or dark, never pink for system)
                document.documentElement.classList.add(systemTheme);
              }
            }
          });
        }
      },

      getResolvedTheme: () => {
        const { theme } = get();
        return resolveTheme(theme);
      },

      initializeTheme: () => {
        const cookieTheme = themeCookies.get() || 'system';
        const resolvedTheme = resolveTheme(cookieTheme);

        set({
          theme: cookieTheme,
          resolvedTheme
        });

        // Apply initial theme to DOM
        if (typeof document !== 'undefined') {
          // Remove all theme classes first
          document.documentElement.classList.remove('light', 'dark', 'pink');
          // Add the resolved theme class
          document.documentElement.classList.add(resolvedTheme);
        }

        // Set up system theme listener if needed
        if (cookieTheme === 'system') {
          systemThemeListener = onSystemThemeChange((systemTheme) => {
            const currentState = get();
            if (currentState.theme === 'system') {
              set({ resolvedTheme: systemTheme });

              if (typeof document !== 'undefined') {
                // Remove all theme classes first
                document.documentElement.classList.remove('light', 'dark', 'pink');
                // Add the system theme class (light or dark, never pink for system)
                document.documentElement.classList.add(systemTheme);
              }
            }
          });
        }
      },
    }),
    {
      name: 'settings-storage',
      storage: createCustomStorage(),
      partialize: (state) => ({
        // Don't persist theme in localStorage (handled by cookies)
        // Don't persist resolvedTheme (computed on load)
        // Don't persist boardName/sidebarTitle (loaded from server)
      }),
    }
  )
);
