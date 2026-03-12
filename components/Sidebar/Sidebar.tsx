'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarToggle } from './SidebarToggle';
import { SidebarItem } from './SidebarItem';
import { useSidebarState } from './useSidebarState';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { cn } from '@/lib/utils/cn';
import {
  LayoutDashboard,
  Settings,
  BarChart3,
  History,
  FileText,
  BookOpen,
  Sparkles,
  Code,
  Server,
  X,
  FolderOpen,
  Copy,
  Check,
  FileCode,
  Layers,
  TestTube2,
  Bot,
  type LucideIcon
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

// Navigation menu items configuration
interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  description: string;
  disabled?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/',
    description: 'Kanban board and task management',
  },
  {
    icon: FileText,
    label: 'Project Documents',
    href: '/project-documents',
    description: 'Manage project documents and files',
  },
  {
    icon: Server,
    label: 'Data Source MCPs',
    href: '/mcp-servers',
    description: 'Manage Model Context Protocol servers for AI data access',
  },
  {
    icon: BookOpen,
    label: 'Team Rulesets',
    href: '/team-rulesets',
    description: 'Manage team workflow best practices and guidelines',
  },
  {
    icon: Sparkles,
    label: 'Task Identifier',
    href: '/task-identifier',
    description: 'Extract tasks from meeting transcripts and documents',
  },
  {
    icon: Code,
    label: 'Code Editor',
    href: '/code-editor',
    description: 'Edit code with Monaco editor',
  },
  {
    icon: Layers,
    label: 'Workflows',
    href: '/workflows',
    description: 'Create and manage custom automated workflows with BMAD',
  },
  {
    icon: TestTube2,
    label: 'TDD Board',
    href: '/tdd-board',
    description: 'Test-Driven Development board with strict RED-GREEN-REFACTOR workflow',
  },
  {
    icon: Bot,
    label: 'Agentic Workflow',
    href: '/agentic',
    description: 'AI-powered agentic workflow with brainstorming, planning, and execution',
  },
  {
    icon: Settings,
    label: 'Settings',
    href: '/settings',
    description: 'Application and integration settings',
  },
  {
    icon: FileCode,
    label: 'Server Logs',
    href: '/logs',
    description: 'View server logs with real-time tail',
  },
  {
    icon: BarChart3,
    label: 'Analytics',
    href: '/analytics',
    description: 'Task and project analytics',
  },
  {
    icon: History,
    label: 'Task History',
    href: '/history',
    description: 'Historical tasks and implementation reports',
    disabled: false,
  },
] as const;

/**
 * Main sidebar navigation component
 * Provides collapsible navigation with responsive behavior
 */
export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  // Fix: Use separate selectors to avoid creating new objects on each render
  const sidebarTitle = useSettingsStore(state => state.sidebarTitle);
  const boardName = useSettingsStore(state => state.boardName);
  const {
    isMounted,
    isCollapsed,
    isMobileOverlayOpen,
    closeMobileOverlay,
  } = useSidebarState();

  // State for workspace path and copy feedback
  const [activeProject, setActiveProject] = useState<any>(null);
  const [workspacePath, setWorkspacePath] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Load active project and absolute workspace path on host
  useEffect(() => {
    fetch('/api/workspace/host-path')
      .then(res => res.json())
      .then(data => {
        setWorkspacePath(data.hostPath || './workspace');
        if (data.projectName) {
          setActiveProject({ name: data.projectName });
        }
      })
      .catch(() => {
        // Fallback to simple path
        setWorkspacePath('./workspace');
      });
  }, [pathname]); // Reload when navigating

  const handleCopyPath = () => {
    navigator.clipboard.writeText(workspacePath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle mobile overlay backdrop click
  const handleBackdropClick = () => {
    closeMobileOverlay();
  };

  // Prevent hydration mismatch by showing skeleton until mounted
  if (!isMounted) {
    return (
      <div className={cn(
        'fixed left-0 top-0 z-40 h-full w-64 bg-sidebar backdrop-blur-sm',
        'border-r border-sidebar-border',
        'lg:translate-x-0',
        className
      )}>
        <div className="animate-pulse p-4">
          <div className="h-8 w-8 bg-sidebar-accent rounded-md mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-5 w-5 bg-sidebar-accent rounded" />
                <div className="h-4 w-24 bg-sidebar-accent rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobileOverlayOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Base styles
          'fixed left-0 top-0 z-40 h-full bg-sidebar',
          'border-r border-sidebar-border transition-all duration-300 ease-in-out',

          // Width based on collapsed state
          isCollapsed ? 'w-16' : 'w-64',

          // Mobile behavior
          'lg:translate-x-0',
          isMobileOverlayOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',

          className
        )}
        aria-label="Main navigation"
        role="navigation"
      >
        <div className="flex h-full flex-col">
          {/* Header with toggle */}
          <div className={cn(
            'flex items-center border-b border-sidebar-border p-4',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}>
            {!isCollapsed && (
              <h2 className="text-lg font-semibold text-sidebar-foreground tracking-tight">
                {sidebarTitle}
              </h2>
            )}

            {/* Toggle button for desktop, close button for mobile */}
            <div className="flex items-center gap-2">
              <SidebarToggle />

              {/* Mobile close button */}
              {isMobileOverlayOpen && (
                <button
                  onClick={closeMobileOverlay}
                  className={cn(
                    'lg:hidden inline-flex items-center justify-center',
                    'h-8 w-8 rounded-md text-sidebar-foreground/60',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    'focus:bg-sidebar-accent focus:text-sidebar-accent-foreground focus:outline-none',
                    'transition-colors'
                  )}
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation items */}
          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1" role="list">
              {MENU_ITEMS.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <li key={item.href} role="listitem">
                    <SidebarItem
                      icon={item.icon}
                      label={item.label}
                      href={item.href}
                      isActive={isActive}
                      isCollapsed={isCollapsed}
                      disabled={item.disabled ?? false}
                      description={item.description}
                      onClick={() => {
                        // Close mobile overlay when navigating
                        if (isMobileOverlayOpen) {
                          closeMobileOverlay();
                        }
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer - workspace location */}
          {!isCollapsed && (
            <div className="border-t border-sidebar-border p-4 space-y-3">
              {/* Workspace location - click to copy */}
              <div className="space-y-2">
                <button
                  onClick={handleCopyPath}
                  className="w-full text-left p-2.5 bg-sidebar-accent/50 hover:bg-sidebar-accent rounded-md transition-colors group border border-sidebar-border/50"
                  title="Click to copy path"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <FolderOpen className="h-3.5 w-3.5 text-sidebar-foreground/70" />
                        <span className="text-xs font-medium text-sidebar-foreground truncate">
                          {activeProject?.name || 'Workspace'}
                        </span>
                      </div>
                      <div className="text-[10px] text-sidebar-foreground/50 font-mono truncate pl-5.5">
                        {workspacePath}
                      </div>
                    </div>
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-sidebar-foreground/40 group-hover:text-sidebar-foreground flex-shrink-0" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
