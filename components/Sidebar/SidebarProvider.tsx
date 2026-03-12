'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  isMobileOverlayOpen: boolean;
  toggleCollapse: () => void;
  setMobileOverlay: (open: boolean) => void;
  closeMobileOverlay: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

interface SidebarProviderProps {
  children: ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOverlayOpen, setIsMobileOverlayOpen] = useState(false);

  // Initialize from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebar-collapsed');
      if (stored !== null) {
        setIsCollapsed(JSON.parse(stored));
      } else {
        // Default based on screen size
        const shouldBeCollapsed = window.innerWidth < 1024;
        setIsCollapsed(shouldBeCollapsed);
      }
    } catch {
      // Fallback if localStorage fails
      const shouldBeCollapsed = window.innerWidth < 1024;
      setIsCollapsed(shouldBeCollapsed);
    }
  }, []);

  // Persist to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
    } catch {
      // Ignore if localStorage is not available
    }
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  const setMobileOverlay = (open: boolean) => {
    setIsMobileOverlayOpen(open);
  };

  const closeMobileOverlay = () => {
    setIsMobileOverlayOpen(false);
  };

  const value = {
    isCollapsed,
    isMobileOverlayOpen,
    toggleCollapse,
    setMobileOverlay,
    closeMobileOverlay,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}