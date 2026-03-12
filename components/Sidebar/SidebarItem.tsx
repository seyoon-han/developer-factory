'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { SidebarTooltip } from './SidebarTooltip';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive?: boolean;
  isCollapsed?: boolean;
  disabled?: boolean;
  description?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Individual sidebar navigation item
 * Renders as a link with icon and optional label
 * Shows tooltip when collapsed
 */
export function SidebarItem({
  icon: Icon,
  label,
  href,
  isActive = false,
  isCollapsed = false,
  disabled = false,
  description,
  onClick,
  className,
}: SidebarItemProps) {
  const itemContent = (
    <span
      className={cn(
        // Base styles
        'group relative flex items-center rounded-md transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',

        // Sizing based on collapsed state
        isCollapsed ? 'h-10 w-10 justify-center p-2' : 'h-10 gap-3 px-3 py-2',

        // Color states
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',

        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed',

        // Custom className
        className
      )}
      onClick={!disabled ? onClick : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={isCollapsed ? `${label}. ${description || ''}` : undefined}
      aria-current={isActive ? 'page' : undefined}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Icon */}
      <Icon
        className={cn(
          'h-5 w-5 flex-shrink-0 transition-colors',
          isActive
            ? 'text-primary-foreground'
            : 'text-muted-foreground group-hover:text-accent-foreground'
        )}
        aria-hidden="true"
      />

      {/* Label - hidden when collapsed */}
      {!isCollapsed && (
        <span className="truncate font-medium text-sm">
          {label}
        </span>
      )}

      {/* Active indicator when collapsed */}
      {isCollapsed && isActive && (
        <span
          className="absolute -right-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-primary-foreground"
          aria-hidden="true"
        />
      )}

      {/* Disabled overlay */}
      {disabled && (
        <span
          className="absolute inset-0 cursor-not-allowed"
          title={`${label} - Coming soon`}
        />
      )}
    </span>
  );

  // Wrap in tooltip when collapsed
  const content = isCollapsed ? (
    <SidebarTooltip
      content={
        <div className="text-center">
          <div className="font-medium">{label}</div>
          {description && (
            <div className="text-xs text-muted-foreground mt-1">
              {description}
            </div>
          )}
          {disabled && (
            <div className="text-xs text-amber-400 mt-1">
              Coming soon
            </div>
          )}
        </div>
      }
      disabled={disabled}
    >
      {itemContent}
    </SidebarTooltip>
  ) : (
    itemContent
  );

  // Don't render as link if disabled
  if (disabled || href === '#') {
    return (
      <div className="relative">
        {content}
      </div>
    );
  }

  // Render as Next.js Link
  return (
    <Link
      href={href}
      className="relative block"
      tabIndex={-1} // Link itself is not focusable, inner span handles focus
    >
      {content}
    </Link>
  );
}