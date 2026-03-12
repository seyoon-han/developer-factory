'use client';

import { useSettingsStore } from '@/lib/store/settingsStore';

/**
 * Dynamic header component that displays the custom board name
 * Falls back to default "Dev Automation Board" if no custom name is set
 */
export function DynamicBoardHeader() {
  const boardName = useSettingsStore(state => state.boardName);

  return (
    <h1 className="text-lg font-semibold tracking-tight text-foreground">
      {boardName}
    </h1>
  );
}