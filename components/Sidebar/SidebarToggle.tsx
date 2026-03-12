'use client';

import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useEffect, useState } from 'react';
import { useSidebarState } from './useSidebarState';

interface SidebarToggleProps {
  className?: string;
}

/**
 * Sidebar toggle button component
 * Handles both desktop collapse and mobile overlay toggle
 */
export function SidebarToggle({ className }: SidebarToggleProps) {
  const [isMobile, setIsMobile] = useState(false);
  const {
    isMounted,
    isCollapsed,
    isMobileOverlayOpen,
    toggleCollapse,
    setMobileOverlay,
  } = useSidebarState();

  // Detect if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToggle = () => {
    if (isMobile) {
      // On mobile, toggle the overlay
      setMobileOverlay(!isMobileOverlayOpen);
    } else {
      // On desktop, toggle collapsed state
      toggleCollapse();
    }
  };

  // Show hamburger on mobile when overlay is closed, or menu when open
  // Show collapse/expand indicator on desktop
  const showMenuIcon = isMobile && !isMobileOverlayOpen;
  const showCloseIcon = isMobile && isMobileOverlayOpen;
  const showCollapseState = !isMobile;

  return (
    <button
      onClick={handleToggle}
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-md',
        'h-8 w-8 text-sidebar-foreground/60 transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        'focus:bg-sidebar-accent focus:text-sidebar-accent-foreground focus:outline-none',
        'focus:ring-2 focus:ring-sidebar-primary focus:ring-offset-2',

        className
      )}
      aria-label={
        isMobile
          ? isMobileOverlayOpen
            ? 'Close navigation menu'
            : 'Open navigation menu'
          : isCollapsed
          ? 'Expand sidebar'
          : 'Collapse sidebar'
      }
      title={
        isMobile
          ? isMobileOverlayOpen
            ? 'Close navigation'
            : 'Open navigation'
          : isCollapsed
          ? 'Expand sidebar'
          : 'Collapse sidebar'
      }
    >
      {showMenuIcon && (
        <Menu className="h-4 w-4" aria-hidden="true" />
      )}

      {showCloseIcon && (
        <X className="h-4 w-4" aria-hidden="true" />
      )}

      {showCollapseState && (
        <div className="relative h-4 w-4" aria-hidden="true">
          {/* Hamburger lines that animate to collapse indicator */}
          <div
            className={cn(
              'absolute left-0 h-0.5 w-4 bg-current transition-all duration-200',
              isCollapsed ? 'top-1 rotate-45' : 'top-0.5'
            )}
          />
          <div
            className={cn(
              'absolute left-0 h-0.5 w-4 bg-current transition-all duration-200',
              isCollapsed ? 'top-1 -rotate-45' : 'top-1.5'
            )}
          />
          <div
            className={cn(
              'absolute left-0 h-0.5 bg-current transition-all duration-200',
              isCollapsed ? 'top-1 w-0 opacity-0' : 'top-2.5 w-4 opacity-100'
            )}
          />
        </div>
      )}
    </button>
  );
}