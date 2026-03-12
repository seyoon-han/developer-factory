'use client';

import { useState, useEffect } from 'react';
import { useSidebar } from './SidebarProvider';

/**
 * Custom hook to safely access sidebar state with SSR compatibility
 * Prevents hydration mismatches by only accessing state after mount
 */
export function useSidebarState() {
  const [isMounted, setIsMounted] = useState(false);
  const sidebar = useSidebar();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return {
    isMounted,
    ...sidebar,
  };
}