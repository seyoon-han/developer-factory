'use client';

import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useSidebarState } from './useSidebarState';

interface MobileMenuButtonProps {
  className?: string;
}

/**
 * Mobile menu button component
 * Only visible on mobile devices, triggers the sidebar overlay
 */
export function MobileMenuButton({ className }: MobileMenuButtonProps) {
  const { setMobileOverlay } = useSidebarState();

  const handleClick = () => {
    setMobileOverlay(true);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        // Only show on mobile (hide on lg and above)
        'lg:hidden',
        // Button styling
        'inline-flex items-center justify-center rounded-md',
        'h-10 w-10 text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:bg-accent focus:text-accent-foreground focus:outline-none',
        'focus:ring-2 focus:ring-primary focus:ring-offset-2',
        className
      )}
      aria-label="Open navigation menu"
      title="Open navigation menu"
    >
      <Menu className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}