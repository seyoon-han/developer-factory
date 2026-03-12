import { create } from 'zustand';

export interface IntegrationConfig {
  integration_type: string;
  config: Record<string, any>;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

interface IntegrationState {
  integrations: IntegrationConfig[];
  isLoading: boolean;
  error: string | null;
  
  loadIntegrations: () => Promise<void>;
  getConfig: (type: string) => IntegrationConfig | null;
  saveConfig: (type: string, config: Record<string, any>, isActive?: boolean) => Promise<void>;
  deleteConfig: (type: string) => Promise<void>;
  testConnection: (type: string) => Promise<{ success: boolean; message: string }>;
}

export const useIntegrationStore = create<IntegrationState>((set, get) => ({
  integrations: [],
  isLoading: false,
  error: null,
  
  loadIntegrations: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      
      if (data.success) {
        set({ integrations: data.integrations, isLoading: false });
      } else {
        set({ error: data.error, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  getConfig: (type) => {
    const { integrations } = get();
    return integrations.find((i) => i.integration_type === type) || null;
  },
  
  saveConfig: async (type, config, isActive = true) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/integrations/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, isActive }),
      });
      const data = await res.json();
      
      if (data.success) {
        set((state) => {
          const exists = state.integrations.find((i) => i.integration_type === type);
          if (exists) {
            return {
              integrations: state.integrations.map((i) =>
                i.integration_type === type ? data.integration : i
              ),
              isLoading: false,
            };
          } else {
            return {
              integrations: [...state.integrations, data.integration],
              isLoading: false,
            };
          }
        });
      } else {
        set({ error: data.error, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  deleteConfig: async (type) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/integrations/${type}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        set((state) => ({
          integrations: state.integrations.filter((i) => i.integration_type !== type),
          isLoading: false,
        }));
      } else {
        set({ error: data.error, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  testConnection: async (type) => {
    try {
      const res = await fetch(`/api/integrations/${type}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      return { success: data.success, message: data.message };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },
}));
















