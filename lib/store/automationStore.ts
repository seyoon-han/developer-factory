import { create } from 'zustand';

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger_type: string;
  trigger_config: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  priority: number;
  description?: string;
  last_triggered_at?: string;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

interface AutomationState {
  rules: AutomationRule[];
  isLoading: boolean;
  error: string | null;
  
  loadRules: () => Promise<void>;
  addRule: (rule: Omit<AutomationRule, 'created_at' | 'updated_at' | 'trigger_count' | 'last_triggered_at'>) => Promise<void>;
  updateRule: (id: string, updates: Partial<AutomationRule>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  toggleRule: (id: string) => Promise<void>;
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  rules: [],
  isLoading: false,
  error: null,
  
  loadRules: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/automation/rules');
      const data = await res.json();
      
      if (data.success) {
        set({ rules: data.rules, isLoading: false });
      } else {
        set({ error: data.error, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  addRule: async (rule) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/automation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      const data = await res.json();
      
      if (data.success) {
        set((state) => ({
          rules: [...state.rules, data.rule],
          isLoading: false,
        }));
      } else {
        set({ error: data.error, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  updateRule: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const currentRule = get().rules.find((r) => r.id === id);
      if (!currentRule) {
        set({ error: 'Rule not found', isLoading: false });
        return;
      }

      const res = await fetch(`/api/automation/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentRule, ...updates }),
      });
      const data = await res.json();
      
      if (data.success) {
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? data.rule : r)),
          isLoading: false,
        }));
      } else {
        set({ error: data.error, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  deleteRule: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/automation/rules/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        set((state) => ({
          rules: state.rules.filter((r) => r.id !== id),
          isLoading: false,
        }));
      } else {
        set({ error: data.error, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  toggleRule: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/automation/rules/${id}/toggle`, { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? data.rule : r)),
          isLoading: false,
        }));
      } else {
        set({ error: data.error, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
















