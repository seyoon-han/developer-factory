'use client';

import { useState } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Heart, Monitor, Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  /** Visual variant of the toggle */
  variant?: 'button' | 'dropdown' | 'compact';
  /** Size of the toggle */
  size?: 'sm' | 'md' | 'lg';
  /** Show labels alongside icons */
  showLabels?: boolean;
  /** Custom className for styling */
  className?: string;
}

const themeConfig = {
  light: {
    label: 'Light',
    icon: Sun,
    description: 'Light theme',
  },
  dark: {
    label: 'Dark',
    icon: Moon,
    description: 'Dark theme',
  },
  pink: {
    label: 'Pink',
    icon: Heart,
    description: 'Pink theme',
  },
  system: {
    label: 'System',
    icon: Monitor,
    description: 'Follow system preference',
  },
} as const;

const sizeClasses = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
};

const buttonSizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

/**
 * Cycle through theme options: light → dark → pink → system → light
 */
function getNextTheme(currentTheme: 'light' | 'dark' | 'pink' | 'system'): 'light' | 'dark' | 'pink' | 'system' {
  switch (currentTheme) {
    case 'light':
      return 'dark';
    case 'dark':
      return 'pink';
    case 'pink':
      return 'system';
    case 'system':
      return 'light';
    default:
      return 'light';
  }
}

/**
 * Theme toggle button component - cycles through light/dark/pink/system themes
 */
export function ThemeToggle({
  variant = 'button',
  size = 'md',
  showLabels = false,
  className = '',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentConfig = themeConfig[theme];
  const IconComponent = currentConfig.icon;

  const handleToggle = async () => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    const nextTheme = getNextTheme(theme);
    setTheme(nextTheme);

    // Add a short transition delay for visual feedback
    setTimeout(() => {
      setIsTransitioning(false);
    }, 150);
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleToggle}
        disabled={isTransitioning}
        className={`
          inline-flex items-center justify-center rounded-md border border-input
          bg-transparent hover:bg-accent hover:text-accent-foreground
          transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          disabled:pointer-events-none disabled:opacity-50
          ${sizeClasses[size]} ${className}
        `}
        title={`Current theme: ${currentConfig.label}${theme === 'system' ? ` (${resolvedTheme})` : ''}. Click to cycle themes.`}
        aria-label={`Toggle theme. Current: ${currentConfig.label}${theme === 'system' ? ` (${resolvedTheme})` : ''}`}
      >
        <IconComponent className={`${isTransitioning ? 'animate-spin' : ''} transition-transform duration-150`} />
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-block text-left ${className}`}>
        <ThemeDropdown
          theme={theme}
          resolvedTheme={resolvedTheme}
          onThemeChange={setTheme}
          size={size}
          showLabels={showLabels}
        />
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isTransitioning}
      className={`
        inline-flex items-center gap-2 rounded-md border border-input
        bg-transparent hover:bg-accent hover:text-accent-foreground
        transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
        ${buttonSizeClasses[size]} ${className}
      `}
      title={`Current theme: ${currentConfig.label}${theme === 'system' ? ` (${resolvedTheme})` : ''}. Click to cycle themes.`}
      aria-label={`Toggle theme. Current: ${currentConfig.label}${theme === 'system' ? ` (${resolvedTheme})` : ''}`}
    >
      <IconComponent
        className={`h-4 w-4 ${isTransitioning ? 'animate-spin' : ''} transition-transform duration-150`}
      />
      {showLabels && (
        <span className="font-medium">
          {currentConfig.label}
          {theme === 'system' && (
            <span className="ml-1 text-xs opacity-70">
              ({resolvedTheme})
            </span>
          )}
        </span>
      )}
    </button>
  );
}

/**
 * Dropdown variant of the theme toggle
 */
function ThemeDropdown({
  theme,
  resolvedTheme,
  onThemeChange,
  size,
  showLabels,
}: {
  theme: 'light' | 'dark' | 'pink' | 'system';
  resolvedTheme: 'light' | 'dark' | 'pink';
  onThemeChange: (theme: 'light' | 'dark' | 'pink' | 'system') => void;
  size: 'sm' | 'md' | 'lg';
  showLabels: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const currentConfig = themeConfig[theme];
  const IconComponent = currentConfig.icon;

  const handleThemeSelect = (selectedTheme: 'light' | 'dark' | 'pink' | 'system') => {
    onThemeChange(selectedTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-2 rounded-md border border-input
          bg-transparent hover:bg-accent hover:text-accent-foreground
          transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          ${buttonSizeClasses[size]}
        `}
        title={`Current theme: ${currentConfig.label}${theme === 'system' ? ` (${resolvedTheme})` : ''}`}
        aria-label="Select theme"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <IconComponent className="h-4 w-4" />
        {showLabels && <span className="font-medium">{currentConfig.label}</span>}
        <svg
          className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown menu */}
          <div className="absolute right-0 z-20 mt-2 w-48 rounded-md border border-input bg-popover shadow-lg">
            <div className="py-1" role="menu" aria-orientation="vertical">
              {(Object.entries(themeConfig) as [keyof typeof themeConfig, typeof themeConfig[keyof typeof themeConfig]][]).map(
                ([themeName, config]) => {
                  const ThemeIcon = config.icon;
                  const isSelected = theme === themeName;

                  return (
                    <button
                      key={themeName}
                      onClick={() => handleThemeSelect(themeName)}
                      className={`
                        group flex w-full items-center gap-3 px-3 py-2 text-left text-sm
                        hover:bg-accent hover:text-accent-foreground
                        focus:bg-accent focus:text-accent-foreground focus:outline-none
                        ${isSelected ? 'bg-accent/50 text-accent-foreground font-medium' : ''}
                      `}
                      role="menuitem"
                      title={config.description}
                    >
                      <ThemeIcon className="h-4 w-4" />
                      <span className="flex-1">{config.label}</span>
                      {isSelected && (
                        <svg
                          className="h-4 w-4 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {themeName === 'system' && theme === 'system' && (
                        <span className="text-xs opacity-70 ml-2">
                          ({resolvedTheme})
                        </span>
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Theme indicator component - shows current theme without interaction
 */
export function ThemeIndicator({
  size = 'md',
  showLabel = false,
  className = ''
}: {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}) {
  const { theme, resolvedTheme } = useTheme();
  const config = themeConfig[theme];
  const IconComponent = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      title={`Current theme: ${config.label}${theme === 'system' ? ` (${resolvedTheme})` : ''}`}
    >
      <IconComponent className={`${sizeClasses[size].split(' ')[0]} ${sizeClasses[size].split(' ')[1]}`} />
      {showLabel && (
        <span className={`font-medium ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
          {config.label}
          {theme === 'system' && (
            <span className="ml-1 text-xs opacity-70">
              ({resolvedTheme})
            </span>
          )}
        </span>
      )}
    </div>
  );
}