import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isCollapsed: boolean;
  isMobileOverlayOpen: boolean;
  toggleCollapse: () => void;
  setMobileOverlay: (open: boolean) => void;
  closeMobileOverlay: () => void;
  initializeFromBreakpoint: (width: number) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      isCollapsed: false,
      isMobileOverlayOpen: false,

      toggleCollapse: () => set((state) => ({
        isCollapsed: !state.isCollapsed,
      })),

      setMobileOverlay: (open) => set({
        isMobileOverlayOpen: open,
      }),

      closeMobileOverlay: () => set({
        isMobileOverlayOpen: false,
      }),

      initializeFromBreakpoint: (width) => {
        // Set default collapsed state based on screen size
        // Desktop (≥1024px): expanded by default
        // Mobile (<1024px): collapsed by default
        const shouldBeCollapsed = width < 1024;

        set({
          isCollapsed: shouldBeCollapsed,
          isMobileOverlayOpen: false,
        });
      },
    }),
    {
      name: 'sidebar-storage',
      partialize: (state) => ({
        // Only persist collapsed state, not mobile overlay state
        isCollapsed: state.isCollapsed,
      }),
    }
  )
);