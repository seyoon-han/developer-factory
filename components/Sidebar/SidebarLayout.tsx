'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { useSidebarState } from './useSidebarState';

interface SidebarLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Layout wrapper that adjusts main content spacing based on sidebar state
 * Handles both collapsed/expanded states and responsive behavior
 */
export function SidebarLayout({ children, className }: SidebarLayoutProps) {
  const { isMounted, isCollapsed } = useSidebarState();

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className={cn('flex flex-1 flex-col lg:ml-64 transition-all duration-300', className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-1 flex-col transition-all duration-300',
        // Responsive margins based on sidebar state
        'lg:ml-16', // Default to collapsed width on desktop
        !isCollapsed && 'lg:ml-64', // Expand to full width when not collapsed
        className
      )}
    >
      {children}
    </div>
  );
}