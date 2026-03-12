'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface SidebarTooltipProps {
  children: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  side?: 'right' | 'left';
  className?: string;
}

/**
 * Tooltip component for collapsed sidebar items
 * Shows on hover with a small delay
 */
export function SidebarTooltip({
  children,
  content,
  disabled = false,
  side = 'right',
  className,
}: SidebarTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (disabled) return;

    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Show tooltip after a short delay
    const id = setTimeout(() => {
      setIsVisible(true);
    }, 500);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  return (
    <div
      className="relative"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}

      {isVisible && !disabled && (
        <>
          {/* Tooltip */}
          <div
            className={cn(
              // Base styles
              'absolute z-50 px-3 py-2 text-sm font-medium',
              'bg-popover text-popover-foreground',
              'border border-border rounded-md shadow-md',
              'whitespace-nowrap',

              // Positioning
              side === 'right'
                ? 'left-full top-1/2 -translate-y-1/2 ml-2'
                : 'right-full top-1/2 -translate-y-1/2 mr-2',

              // Animation
              'animate-in fade-in-0 zoom-in-95',
              'duration-200',

              className
            )}
            role="tooltip"
          >
            {content}

            {/* Arrow */}
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2',
                'w-2 h-2 bg-popover border border-border',
                side === 'right'
                  ? '-left-1 border-r-0 border-b-0 rotate-45'
                  : '-right-1 border-l-0 border-t-0 rotate-45'
              )}
            />
          </div>
        </>
      )}
    </div>
  );
}